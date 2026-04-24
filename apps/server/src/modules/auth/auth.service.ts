import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import { hashPassword, comparePassword, hashToken } from '../../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

// ─── Input Types ──────────────────────────────────────────────────

export interface RegisterInput {
  organizationName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// ─── Prisma select to exclude sensitive fields ────────────────────

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
   * Registers a new tenant (organization) and its first admin user.
   * Uses a Prisma transaction to ensure atomicity.
   */
  async register(data: RegisterInput) {
    const { organizationName, email, password, firstName, lastName } = data;
    const slug = this.generateSlug(organizationName);

    // Check if tenant slug is taken
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      throw new AppError('Organization name already taken', 409);
    }

    // Check if email is already registered (any tenant)
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const hashedPassword = await hashPassword(password);

    // Atomic: create tenant + admin user
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tenant = await tx.tenant.create({
        data: { name: organizationName, slug, plan: 'free' },
        select: safeTenantSelect,
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash: hashedPassword,
          firstName,
          lastName,
          role: 'admin',
          isActive: true,
        },
        select: safeUserSelect,
      });

      return { tenant, user };
    });

    logger.info(`Registration successful — org="${organizationName}" email=${email}`);
    return result;
  }

  /**
   * Authenticates a user by email and password.
   * Returns JWT access/refresh token pair.
   */
  async login(email: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { email },
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

    logger.info(`Login successful — email=${email} tenant=${user.tenant.name}`);

    // Strip passwordHash before returning
    const { passwordHash: _, tenant, ...safeUser } = user;
    return { user: safeUser, tenant, accessToken, refreshToken };
  }

  /**
   * Rotates refresh tokens. The old token is deleted and a new pair is issued.
   * Implements refresh token rotation to limit token replay attacks.
   */
  async refreshTokens(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { tenant: { select: safeTenantSelect } } } },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      // Clean up expired token if it exists
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
   * Revokes a refresh token. Idempotent — succeeds even if token doesn't exist.
   */
  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    await prisma.refreshToken.deleteMany({ where: { tokenHash } });

    logger.info('Logout — refresh token revoked');
    return { message: 'Logged out successfully' };
  }

  /**
   * Initiates a password reset flow. Generates a secure token,
   * stores its hash, and sets a 1-hour expiry.
   *
   * Always returns a success message regardless of whether the
   * email exists — prevents email enumeration attacks.
   */
  async requestPasswordReset(email: string) {
    const user = await prisma.user.findFirst({ where: { email } });

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

      // In production, send via email instead of logging
      logger.info(`Password reset requested — email=${email} token=${rawToken}`);
    }

    return { message: 'If that email exists, reset instructions have been sent' };
  }

  /**
   * Completes a password reset. Validates the token, updates the password,
   * clears reset fields, and revokes all refresh tokens to force re-login.
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
      // Revoke all sessions — force re-login everywhere
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);

    logger.info(`Password reset completed — user=${user.id}`);
    return { message: 'Password reset successful' };
  }

  // ─── Private Helpers ────────────────────────────────────────────

  /**
   * Converts an organization name into a URL-safe slug.
   * "Acme Corp!" → "acme-corp"
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

/** Singleton auth service instance */
export const authService = new AuthService();
