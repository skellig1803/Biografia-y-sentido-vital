import { generateSynthesisReading } from '../server/synthesisEngine.js';
import { reportDeveloperError } from '../lib/errorLogger.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body: any = req.body;
  try {
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (!body || typeof body !== 'object') {
      body = {};
    }

    const result = await generateSynthesisReading(body);
    if (!result.success) {
      return res.status(503).json(result);
    }
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Vercel api/synthesis] Error en handler:', err);
    await reportDeveloperError({
      category: 'SERVERLESS_HANDLER_EXCEPTION',
      error: err,
      customMessage: `Excepción inesperada en función serverless api/synthesis: ${err?.message || err}`,
      context: { bodyConsultante: body?.name },
    }).catch(() => {});

    return res.status(503).json({
      success: false,
      error:
        'El servicio de Inteligencia Artificial no pudo completar la lectura en este momento (tiempo de espera o error de ejecución). Tu crédito NO ha sido consumido y tu saldo permanece intacto. Por favor, reintenta en unos instantes.',
      creditConsumed: false,
    });
  }
}
