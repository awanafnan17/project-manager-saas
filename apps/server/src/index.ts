import 'dotenv/config';
import http from 'http';
import app from './app';
import { initSocketServer } from './config/socket';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize Socket.IO
initSocketServer(server);

// For local development — Vercel handles its own listening
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

// Export for Vercel serverless
export default app;
