import app from '../server/app';

export const config = {
  maxDuration: 60,
};

export default function handler(req: any, res: any) {
  if (req.body && typeof req.body === 'object') {
    (req as any)._body = true;
  }
  return app(req, res);
}
