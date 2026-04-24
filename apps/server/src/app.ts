import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/projects/project.routes';
import taskRoutes from './modules/tasks/task.routes';
import { authenticateToken } from './middleware/auth.middleware';
import { requireRole } from './middleware/rbac.middleware';

const app = express();

// ─── Trust proxy (required for Vercel / reverse proxy) ────────────
app.set('trust proxy', 1);

// ─── Global Middleware ────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  'https://project-manager-saas-client.vercel.app',
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
//app.use('/api', limiter);

// ─── Health Check ─────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1', taskRoutes);

// ─── Test / Debug Routes ──────────────────────────────────────────
// Protected route — any authenticated user
app.get('/api/v1/test-protected', authenticateToken, (req, res) => {
  res.json({ success: true, message: 'Auth works!', user: req.user });
});

// Admin-only route — requires admin role
app.get('/api/v1/test-admin', authenticateToken, requireRole('admin'), (req, res) => {
  res.json({ success: true, message: 'Admin access granted!', user: req.user });
});

// ─── 404 Catch-All ────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error Handler (must be last) ─────────────────────────────────
app.use(errorHandler);

export default app;
