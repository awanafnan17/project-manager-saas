import { prisma } from '../../config/db';
import { AppError } from '../../middleware/errorHandler';
import { hashPassword, comparePassword, hashToken } from '../../utils/hash';
import { signAccessToken, signRefreshToken } from '../../utils/jwt';
import { RegisterInput, LoginInput } from './auth.schemas';
import { logger } from '../../utils/logger';
import crypto from 'crypto';

export class AuthService {
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async register(data: RegisterInput) {
    const slug = this.generateSlug(data.organizationName);

    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      throw new AppError(409, 'Organization name already taken');
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    const passwordHash = await hashPassword(data.password);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.organizationName,
          slug,
          plan: 'free',
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.email.toLowerCase(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'ADMIN',
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          tenantId: true,
        },
      });

      return { tenant, user };
    });

    logger.info(`New tenant registered: ${result.tenant.name}`);

    // Auto login after register
    return this.login(data.email, data.password);
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true
      },
      include: {
        tenant: true
      },
    });

    if (!user || !user.tenant) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid credentials');
    }

    const accessToken = signAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });

    const refreshToken = signRefreshToken(user.id);
    const hashedRefreshToken = hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: user.tenant,
      accessToken,
      refreshToken,
    };
  }

  // ... (rest of your methods - refreshTokens, logout, etc. can stay the same)
}

export const authService = new AuthService();