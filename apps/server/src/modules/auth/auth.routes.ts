import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateRequest } from '../../middleware/validateRequest';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schemas';
import {
  register,
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
} from './auth.controller';

const router = Router();

// ─── Auth-Specific Rate Limiter ───────────────────────────────────
// Stricter than the global limiter: 10 requests per 15 minutes
// Prevents brute-force attacks on login, registration, and password reset

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
});

// Apply auth rate limiter to all routes in this router
router.use(authLimiter);

// ─── Routes ───────────────────────────────────────────────────────

router.post('/register',        validateRequest(registerSchema),        register);
router.post('/login',           validateRequest(loginSchema),           login);
router.post('/refresh',                                                 refresh);
router.post('/logout',                                                  logout);
router.post('/forgot-password', validateRequest(forgotPasswordSchema),  requestPasswordReset);
router.post('/reset-password',  validateRequest(resetPasswordSchema),   resetPassword);

export default router;
