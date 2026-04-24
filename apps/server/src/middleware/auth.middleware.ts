import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

/**
 * Express middleware that validates a JWT access token from the
 * `Authorization: Bearer <token>` header.
 *
 * On success, populates `req.user` with the decoded payload
 * (`userId`, `tenantId`, `role`) for downstream handlers.
 *
 * Must appear before any route that requires authentication.
 */
export function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError('No token provided', 401);
    }

    // Expect format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError('No token provided', 401);
    }

    const token = parts[1];
    const decoded = verifyAccessToken(token);

    // Attach user payload to request for downstream middleware / handlers
    req.user = {
      id: decoded.userId,
      email: '',            // Not stored in token — fetch from DB if needed
      role: decoded.role as 'admin' | 'manager' | 'member',
      tenantId: decoded.tenantId,
    };

    next();
  } catch (err) {
    // Log every failed auth attempt for security monitoring
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const path = req.originalUrl;

    if (err instanceof AppError) {
      logger.warn(`Auth failed [${ip}] ${path} — ${err.message}`);
      next(err);
      return;
    }

    logger.warn(`Auth failed [${ip}] ${path} — unexpected error`);
    next(new AppError('Authentication failed', 401));
  }
}
