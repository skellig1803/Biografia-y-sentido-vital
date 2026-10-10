import app, { startServer } from './server/app';

// Only start standalone HTTP server when not running in serverless environments like Vercel
if (!process.env.VERCEL) {
  startServer();
}

export default app;
