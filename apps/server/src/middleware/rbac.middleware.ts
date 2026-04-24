import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

/**
 * Factory that returns an Express middleware restricting access
 * to users whose `req.user.role` is in the `allowedRoles` list.
 *
 * **Must be placed after `authenticateToken`** in the middleware chain
 * so that `req.user` is guaranteed to be populated.
 *
 * @example
 * ```ts
 * router.get(
 *   '/admin/users',
 *   authenticateToken,
 *   requireRole('admin'),
 *   listUsersController
 * );
 *
 * router.post(
 *   '/projects',
 *   authenticateToken,
 *   requireRole('admin', 'manager'),
 *   createProjectController
 * );
 * ```
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Guard: authenticateToken must have run first
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    const { id: userId, role } = req.user;

    if (!allowedRoles.includes(role)) {
      logger.warn(
        `Authorization denied — user=${userId} role="${role}" ` +
        `required=[${allowedRoles.join(', ')}] path=${req.originalUrl}`
      );
      next(new AppError('Insufficient permissions', 403));
      return;
    }

    next();
  };
}
