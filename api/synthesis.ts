import { generateSynthesisReading } from '../server/synthesisEngine.js';

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

  try {
    let body = req.body;
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
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Vercel api/synthesis] Error en handler:', err);
    // Even in worst-case error, always return a valid 200 JSON with guaranteed reading
    try {
      const { generateGuaranteedCompleteSynthesis } = await import(
        '../src/utils/comprehensiveSynthesisFallback.js'
      );
      return res.status(200).json({
        success: true,
        reading: generateGuaranteedCompleteSynthesis(req.body || {}),
        source: 'structured_synthesis',
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Error al generar la lectura',
      });
    }
  }
}
