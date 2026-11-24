import app from '../server/app.js';

export const config = {
  maxDuration: 60,
};

export default function handler(req: any, res: any) {
  try {
    if (req.body && typeof req.body === 'object') {
      (req as any)._body = true;
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel api/[...all]] Unhandled error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Error interno en el servidor.',
    });
  }
}
