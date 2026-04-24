import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';

// ─── Types ────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  userId: string;
  tenantId: string;
  role: string;
}

export interface DecodedAccessToken extends AccessTokenPayload {
  iat: number;
  exp: number;
}

export interface DecodedRefreshToken {
  userId: string;
  iat: number;
  exp: number;
}

// ─── Secrets (fail-fast if missing) ───────────────────────────────

function getSecret(key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
  const secret = process.env[key];
  if (!secret) {
    throw new Error(`${key} is not defined in environment variables`);
  }
  return secret;
}

// ─── Sign ─────────────────────────────────────────────────────────

/**
 * Signs a short-lived access token (15 min).
 * Encodes userId, tenantId, and role into the payload.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getSecret('JWT_ACCESS_SECRET'), {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Signs a long-lived refresh token (7 days).
 * Contains only the userId — role/tenant are fetched fresh on rotation.
 */
export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, getSecret('JWT_REFRESH_SECRET'), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}

// ─── Verify ───────────────────────────────────────────────────────

/**
 * Verifies and decodes an access token.
 * @throws {AppError} 401 on expired/invalid token.
 */
export function verifyAccessToken(token: string): DecodedAccessToken {
  try {
    return jwt.verify(token, getSecret('JWT_ACCESS_SECRET')) as DecodedAccessToken;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new AppError('Access token has expired', 401);
    }
    if (err instanceof JsonWebTokenError) {
      throw new AppError('Invalid access token', 401);
    }
    throw new AppError('Token verification failed', 401);
  }
}

/**
 * Verifies and decodes a refresh token.
 * @throws {AppError} 401 on expired/invalid token.
 */
export function verifyRefreshToken(token: string): DecodedRefreshToken {
  try {
    return jwt.verify(token, getSecret('JWT_REFRESH_SECRET')) as DecodedRefreshToken;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new AppError('Refresh token has expired — please log in again', 401);
    }
    if (err instanceof JsonWebTokenError) {
      throw new AppError('Invalid refresh token', 401);
    }
    throw new AppError('Refresh token verification failed', 401);
  }
}
