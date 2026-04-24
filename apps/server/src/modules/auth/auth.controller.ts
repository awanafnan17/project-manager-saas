import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { AppError } from '../../middleware/errorHandler';

// ─── Constants ────────────────────────────────────────────────────

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ─── Cookie Helper (DRY) ──────────────────────────────────────────

/**
 * Sets the refresh token as a secure, HTTP-only cookie.
 * - httpOnly: prevents XSS from reading the token
 * - secure: only sent over HTTPS in production
 * - sameSite: prevents CSRF in strict mode
 */
function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/',
  });
}

/**
 * Extracts the refresh token from cookies (web) or request body (mobile/API).
 * Returns null if neither source contains a token.
 */
function extractRefreshToken(req: Request): string | null {
  return req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken || null;
}

// ─── Handlers ─────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 *
 * Creates a new tenant (organization) and its first admin user,
 * then immediately logs the user in by issuing a JWT pair.
 * The refresh token is stored as an HTTP-only cookie.
 */
async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedData = (req as any).validatedData;

    // 1. Create tenant + user
    const { tenant, user } = await authService.register(validatedData);

    // 2. Immediately log in to issue tokens
    const loginResult = await authService.login(validatedData.email, validatedData.password);

    // 3. Set refresh token cookie (for cookie-based clients)
    setRefreshTokenCookie(res, loginResult.refreshToken);

    // 4. Respond (include refreshToken in body for cross-origin clients)
    res.status(201).json({
      success: true,
      data: {
        user: loginResult.user,
        tenant,
        accessToken: loginResult.accessToken,
        refreshToken: loginResult.refreshToken,
      },
      message: 'Registration successful',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/login
 *
 * Authenticates a user with email and password.
 * Issues a JWT access token and sets the refresh token as an HTTP-only cookie.
 */
async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = (req as any).validatedData;

    const result = await authService.login(email, password);

    // Set refresh token cookie (for cookie-based clients)
    setRefreshTokenCookie(res, result.refreshToken);

    // Include refreshToken in body for cross-origin clients (Vercel)
    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        tenant: result.tenant,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/refresh
 *
 * Rotates the refresh token. Accepts the token from either:
 *   1. HTTP-only cookie (preferred — web browsers)
 *   2. Request body (fallback — mobile / API clients)
 *
 * Deletes the old token and issues a new access + refresh pair.
 */
async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    const result = await authService.refreshTokens(refreshToken);

    // Set new refresh token cookie
    setRefreshTokenCookie(res, result.refreshToken);

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
      message: 'Token refreshed',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/logout
 *
 * Revokes the refresh token and clears the cookie.
 * If no token is found, still returns success (idempotent — user is already logged out).
 */
async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = extractRefreshToken(req);

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear the cookie regardless
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/password-reset/request
 *
 * Initiates a password reset flow. Generates a secure token and
 * stores its hash. Always returns the same response regardless of
 * whether the email exists — prevents email enumeration.
 */
async function requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = (req as any).validatedData;

    await authService.requestPasswordReset(email);

    res.status(200).json({
      success: true,
      message: 'If that email exists, we sent password reset instructions',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/auth/password-reset/confirm
 *
 * Completes the password reset. Validates the token, updates the password,
 * clears reset fields, and revokes all existing sessions.
 */
async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword } = (req as any).validatedData;

    await authService.resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. Please login with your new password.',
    });
  } catch (error) {
    next(error);
  }
}

// ─── Exports ──────────────────────────────────────────────────────

export {
  register,
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
};
