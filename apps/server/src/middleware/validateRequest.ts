import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Factory middleware that validates request data against a Zod schema.
 *
 * - For GET/DELETE requests → validates `req.query`
 * - For POST/PUT/PATCH requests → validates `req.body`
 *
 * On success, attaches the parsed (typed, stripped) data to `req.validatedData`
 * so controllers can use it without re-parsing.
 *
 * On failure, passes the ZodError to `next()` which is handled
 * by the centralized `errorHandler`.
 *
 * @example
 * ```ts
 * router.post('/register', validateRequest(registerSchema), register);
 * router.get('/projects', validateRequest(querySchema), listProjects);
 * ```
 */
export function validateRequest(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const source = ['GET', 'DELETE'].includes(req.method) ? req.query : req.body;
      const parsed = schema.parse(source);
      (req as any).validatedData = parsed;
      next();
    } catch (error) {
      next(error);
    }
  };
}
