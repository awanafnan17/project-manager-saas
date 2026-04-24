import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { hashPassword, comparePassword, hashToken } from '../../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

// ─── Safe select shapes (exclude sensitive fields) ────────────────

const safeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
} as const;

const safeTenantSelect = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  createdAt: true,
} as const;

// ─── Auth Service ─────────────────────────────────────────────────

class AuthService {
  /**
   * Registers a new tenant + admin user.
   * Returns { tenant, user } — controller handles login separately.
   */
  async register(data: {
    organizationName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const slug = this.generateSlug(data.organizationName);

    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      throw new AppError('Organization name already taken', 409);
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await hashPassword(data.password);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: data.organizationName, slug, plan: 'free' },
        select: safeTenantSelect,
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.email.toLowerCase(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'admin',
          isActive: true,
        },
        select: safeUserSelect,
      });

      return { tenant, user };
    });

    logger.info(`Registration successful — org="${data.organizationName}" email=${data.email}`);
    return result;
  }

  /**
   * Authenticates a user by email/password.
   * Returns JWT pair + user/tenant data.
   */
  async login(email: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: { tenant: { select: safeTenantSelect } },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is disabled', 401);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate tokens
    const accessToken = signAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });
    const refreshToken = signRefreshToken(user.id);

    // Store hashed refresh token
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`Login successful — email=${email} tenant=${user.tenant?.name}`);

    const { passwordHash: _, tenant, ...safeUser } = user;
    return { user: safeUser, tenant, accessToken, refreshToken };
  }

  /**
   * Rotates refresh tokens. Old token deleted, new pair issued.
   */
  async refreshTokens(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { tenant: { select: safeTenantSelect } } } },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      }
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const { user } = storedToken;

    // Delete old token (rotation)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Issue new pair
    const newAccessToken = signAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });
    const newRefreshToken = signRefreshToken(user.id);

    // Store new hashed refresh token
    const newTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: newTokenHash, expiresAt },
    });

    logger.info(`Token refresh — user=${user.id}`);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Revokes a refresh token. Idempotent.
   */
  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });
    logger.info('Logout — refresh token revoked');
    return { message: 'Logged out successfully' };
  }

  /**
   * Initiates password reset. Always returns same message (prevents enumeration).
   */
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = hashToken(rawToken);
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: hashedToken,
          passwordResetExpires: expires,
        },
      });

      logger.info(`Password reset requested — email=${email} token=${rawToken}`);
    }

    return { message: 'If that email exists, reset instructions have been sent' };
  }

  /**
   * Completes password reset. Validates token, updates password, revokes all sessions.
   */
  async resetPassword(token: string, newPassword: string) {
    const hashedToken = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const newHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    logger.info(`Password reset completed — user=${user.id}`);
    return { message: 'Password reset successful' };
  }

  // ─── Private Helpers ────────────────────────────────────────────

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

/** Singleton auth service instance */
export const authService = new AuthService();