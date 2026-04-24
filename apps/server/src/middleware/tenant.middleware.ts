import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

/**
 * Validates that the authenticated request carries a valid tenant context.
 *
 * Place **after** `authenticateToken` in the middleware chain.
 * Currently a lightweight sanity check; in production this will set
 * a PostgreSQL session variable so that Row-Level Security (RLS)
 * policies automatically scope every query to the current tenant.
 *
 * Future implementation:
 * ```sql
 * SET LOCAL app.current_tenant = req.user.tenantId;
 * ```
 */
export function attachTenant(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(new AppError('Authentication required', 401));
    return;
  }

  const { tenantId, id: userId } = req.user;

  if (!tenantId) {
    logger.warn(`Tenant context missing — user=${userId} path=${req.originalUrl}`);
    next(new AppError('Tenant context is required', 400));
    return;
  }

  // Future: Set PostgreSQL session variable for RLS
  // await prisma.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}'`);

  logger.info(`Tenant context set — tenant=${tenantId} user=${userId}`);

  next();
}
