import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { computeSwissEphemerisChart } from './server/swissEphemeris';
import { generateGuaranteedCompleteSynthesis } from './server/comprehensiveSynthesisFallback';
import { analyzeBiographicalSeptenios } from './lib/gemini.js';
import { upsertBiografia, getUserById } from './lib/db.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

// Lazy GoogleGenAI client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
    });
  }
  return geminiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    provider: 'lemonsqueezy',
    hasLemonSqueezy: Boolean(
      process.env.LEMONSQUEEZY_API_KEY ||
      process.env.LEMONSQUEEZY_CHECKOUT_URL_SINGLE ||
      process.env.LEMONSQUEEZY_STORE_ID
    ),
  });
});

// Lemon Squeezy Billing & Pricing Configuration endpoint
app.get('/api/billing/config', (req, res) => {
  res.json({
    provider: 'lemonsqueezy',
    currency: 'USD',
    plans: [
      {
        id: 'pack_single',
        credits: 1,
        price: 3.99,
        checkoutUrl: process.env.LEMONSQUEEZY_CHECKOUT_URL_SINGLE || null,
      },
      {
        id: 'pack_family',
        credits: 5,
        price: 14.99,
        checkoutUrl: process.env.LEMONSQUEEZY_CHECKOUT_URL_PACK5 || null,
      },
      {
        id: 'pack_professional',
        credits: 15,
        price: 29.99,
        checkoutUrl: process.env.LEMONSQUEEZY_CHECKOUT_URL_PACK15 || null,
      },
    ],
    storeId: process.env.LEMONSQUEEZY_STORE_ID || null,
    hasLiveLemonSqueezy: Boolean(
      process.env.LEMONSQUEEZY_CHECKOUT_URL_SINGLE ||
      process.env.LEMONSQUEEZY_API_KEY ||
      process.env.LEMONSQUEEZY_STORE_ID
    ),
  });
});

// Lemon Squeezy Webhook receiver (for order_created, subscription_created, etc.)
app.post('/api/lemonsqueezy/webhook', (req, res) => {
  try {
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const signature = req.headers['x-signature'] as string;

    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const digest = hmac.update(JSON.stringify(req.body)).digest('hex');
      if (digest !== signature) {
        console.warn('Invalid Lemon Squeezy webhook signature');
        return res.status(401).json({ error: 'Firma de webhook inválida' });
      }
    }

    const eventName = req.body?.meta?.event_name;
    const customData = req.body?.meta?.custom_data;
    const orderData = req.body?.data?.attributes;

    console.log(`[Lemon Squeezy Webhook] Event received: ${eventName}`, {
      orderId: req.body?.data?.id,
      total: orderData?.total_formatted,
      customData,
    });

    return res.json({ received: true, event: eventName });
  } catch (err: any) {
    console.error('Error in Lemon Squeezy webhook:', err);
    return res.status(500).json({ error: 'Error procesando webhook' });
  }
});

// Online Geocoding endpoint using OpenStreetMap (Nominatim) & Open-Meteo for Timezone
app.get('/api/geocode', async (req, res) => {
  const query = req.query.q as string;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Debes proporcionar un nombre de ciudad o ubicación válido.',
    });
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&limit=1`;

    const geoRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'CartaNatalAntroposofica/1.0 (https://ai.studio)',
        'Accept-Language': 'es,en',
      },
    });

    if (!geoRes.ok) {
      throw new Error(`Error en servicio de geocodificación: ${geoRes.statusText}`);
    }

    const geoData = (await geoRes.json()) as any[];
    if (!geoData || geoData.length === 0) {
      return res.json({
        success: false,
        found: false,
        error: `No se encontraron resultados en Internet para "${query}".`,
      });
    }

    const firstResult = geoData[0];
    const lat = parseFloat(firstResult.lat);
    const lng = parseFloat(firstResult.lon);
    const displayName = firstResult.display_name;

    // Get exact timezone offset via Open-Meteo
    let timezoneOffset = Math.round(lng / 15); // astronomical initial fallback
    let timezoneName = 'Aproximado por meridiano';

    try {
      const tzRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&timezone=auto`
      );
      if (tzRes.ok) {
        const tzData = (await tzRes.json()) as any;
        if (typeof tzData.utc_offset_seconds === 'number') {
          timezoneOffset = tzData.utc_offset_seconds / 3600;
          timezoneName = tzData.timezone || timezoneName;
        }
      }
    } catch (tzErr) {
      console.warn('Error fetching timezone from Open-Meteo, using longitude approximation:', tzErr);
    }

    return res.json({
      success: true,
      found: true,
      source: 'internet',
      name: displayName,
      lat,
      lng,
      timezoneOffset,
      timezoneName,
      ianaTimeZone: timezoneName,
      country: firstResult.address?.country,
      city: firstResult.address?.city || firstResult.address?.town || firstResult.address?.village,
    });
  } catch (error: any) {
    console.error('Error in /api/geocode:', error);
    return res.status(500).json({
      success: false,
      found: false,
      error: `Error al buscar la ubicación en Internet: ${error.message}`,
    });
  }
});

// Swiss Ephemeris Calculation Endpoint
app.post('/api/astrology/calculate', (req, res) => {
  try {
    const birthData = req.body;
    if (!birthData || !birthData.birthDate || !birthData.birthTime) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos de nacimiento requeridos (fecha y hora).',
      });
    }

    const result = computeSwissEphemerisChart(birthData);
    return res.json({
      success: true,
      data: result,
      source: 'Swiss Ephemeris (Alta Precisión)',
    });
  } catch (error: any) {
    console.error('Error in /api/astrology/calculate:', error);
    return res.status(500).json({
      success: false,
      error: `Error al calcular con Efemérides Suizas: ${error.message}`,
    });
  }
});

// Utility helper to apply strict timeout on async operations so requests never hang
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Helper to validate that a generated reading is genuinely complete and not truncated
function isReadingComplete(text: string, finishReason?: string): { complete: boolean; reason?: string } {
  if (!text || typeof text !== 'string') {
    return { complete: false, reason: 'Texto vacío' };
  }
  const clean = text.trim();
  if (clean.length < 800) {
    return { complete: false, reason: `Longitud insuficiente (${clean.length} caracteres)` };
  }
  if (finishReason === 'MAX_TOKENS') {
    return { complete: false, reason: 'El modelo alcanzó el límite máximo de tokens (MAX_TOKENS)' };
  }

  const hasSec1 = clean.includes('1.') || clean.includes('Esencia Biográfica');
  const hasSec2 = clean.includes('2.') || clean.includes('Brújula') || clean.includes('Brujula');
  const hasSec3 = clean.includes('3.') || clean.includes('Clima Vital');
  const hasSec4 = clean.includes('4.') || clean.includes('Alquimia') || clean.includes('Tránsitos') || clean.includes('Transitos');

  if (!hasSec1 || !hasSec2 || !hasSec3 || !hasSec4) {
    return { complete: false, reason: 'Falta alguna de las 4 secciones estructurales' };
  }

  return { complete: true };
}

// Endpoint para evaluar un septenio biográfico con Gemini Structured Outputs y persistir en BD
app.post('/api/biografia/evaluar', async (req, res) => {
  try {
    const { user_id, septenio_num, recuerdos, patrones_clave } = req.body;

    // Validación de parámetros obligatorios
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'El campo user_id es obligatorio y debe ser un UUID válido.',
      });
    }

    const septenioNumber = Number(septenio_num);
    if (!Number.isInteger(septenioNumber) || septenioNumber < 1 || septenioNumber > 7) {
      return res.status(400).json({
        success: false,
        error: 'El campo septenio_num debe ser un número entero entre 1 y 7.',
      });
    }

    if (!recuerdos || typeof recuerdos !== 'string' || !recuerdos.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El campo recuerdos es obligatorio y debe contener una descripción válida.',
      });
    }

    // 1. Obtener contexto del usuario si existe en la base de datos
    let userContext: any = null;
    try {
      userContext = await getUserById(user_id);
    } catch (err: any) {
      console.warn(`[evaluar] No se pudo recuperar usuario ${user_id} de BD:`, err?.message);
    }

    // 2. Consultar a Gemini (/lib/gemini.js) con Structured Outputs
    const entradaSeptenio = {
      septenio_num: septenioNumber,
      recuerdos: recuerdos.trim(),
      patrones_previos: patrones_clave || null,
    };

    const interpretacion = await analyzeBiographicalSeptenios(entradaSeptenio, {
      contextoAdicional: userContext
        ? {
            nombre: userContext.nombre,
            fecha_nacimiento: userContext.fecha_nacimiento,
            lugar_nacimiento: userContext.lugar_nacimiento,
          }
        : null,
    });

    // 3. Persistir en la base de datos (/lib/db.js)
    const patronesAGuardar =
      patrones_clave && patrones_clave.trim()
        ? `${patrones_clave.trim()}\n\n[Hilos Conductores IA]: ${interpretacion.hilos_conductores.join('; ')}`
        : interpretacion.hilos_conductores.join('\n');

    let biografiaGuardada: any = null;
    let dbPersisted = true;
    let dbWarning: string | null = null;

    try {
      biografiaGuardada = await upsertBiografia({
        user_id,
        septenio_num: septenioNumber,
        recuerdos: recuerdos.trim(),
        patrones_clave: patronesAGuardar,
      });
    } catch (dbErr: any) {
      console.error('[evaluar] Error al guardar en base de datos:', dbErr?.message || dbErr);
      dbPersisted = false;
      dbWarning = `Evaluación generada con éxito, pero la persistencia en BD falló: ${dbErr?.message || 'Error de BD'}`;
    }

    return res.status(200).json({
      success: true,
      persisted: dbPersisted,
      warning: dbWarning,
      data: {
        biografia_id: biografiaGuardada?.id || null,
        user_id,
        septenio_num: septenioNumber,
        recuerdos: recuerdos.trim(),
        patrones_clave: biografiaGuardada?.patrones_clave || patronesAGuardar,
        hilos_conductores: interpretacion.hilos_conductores,
        septenio_analizado: interpretacion.septenio_analizado,
        sintesis_salutogenica: interpretacion.sintesis_salutogenica,
        modelo_utilizado: interpretacion.modelo_utilizado,
        timestamp: biografiaGuardada?.timestamp || new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error en /api/biografia/evaluar:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error al evaluar el septenio biográfico',
    });
  }
});

// Gemini Synthesis Endpoint for Anthroposophic Biography & Astrological Transit Reading
app.post('/api/synthesis', async (req, res) => {
  try {
    const {
      name,
      exactAgeFormatted,
      sunSign,
      moonSign,
      ascendantSign,
      septenioCode,
      nodalAxisCode,
      profectionCode,
      natalAspectCodes,
      transitCodes,
      // Backward-compatibility keys
      currentSeptenio,
      lunarNodes,
      yearOfLife,
      aspects,
      activeTransits,
      isRegeneration,
      regenerationCount,
    } = req.body;

    // Concise representation of astrological markers
    const septenioStr =
      septenioCode ||
      (currentSeptenio
        ? `${currentSeptenio.number}° Septenio (${currentSeptenio.ageRange}) - ${currentSeptenio.archetypalTitle} [${currentSeptenio.planetarySphere}]`
        : 'Septenio actual');

    const nodesStr =
      nodalAxisCode ||
      (lunarNodes
        ? `NN en ${lunarNodes.northNode?.sign} (C${lunarNodes.northNode?.house}) / NS en ${lunarNodes.southNode?.sign} (C${lunarNodes.southNode?.house})`
        : 'Eje Nodal activo');

    const profectionStr =
      profectionCode ||
      (yearOfLife
        ? `Año ${yearOfLife.currentYearOfLife} (Casa ${yearOfLife.profectionHouse} en ${yearOfLife.profectionSign}, Regente: ${yearOfLife.lordOfYear})`
        : 'Casa de profección activa');

    // Only compact codes for aspects and transits
    const aspectsStr =
      Array.isArray(natalAspectCodes) && natalAspectCodes.length > 0
        ? natalAspectCodes.slice(0, 6).join('; ')
        : Array.isArray(aspects) && aspects.length > 0
        ? aspects.slice(0, 6).map((a: any) => `${a.planet1?.name || ''} ${a.symbol || ''} ${a.planet2?.name || ''} (${(a.orb ?? 0).toFixed?.(1) || 0}°)`).join('; ')
        : 'Aspectos natales calculados';

    const transitsStr =
      Array.isArray(transitCodes) && transitCodes.length > 0
        ? transitCodes.slice(0, 5).join('; ')
        : Array.isArray(activeTransits) && activeTransits.length > 0
        ? activeTransits.slice(0, 5).map((t: any) => `Tr-${t.transitPlanet?.name || t.name} -> Nat-${t.natalPlanet?.name || ''} (${(t.orb ?? 0).toFixed?.(1) || 0}°)`).join('; ')
        : 'Tránsitos activos del cielo';

    const fallbackData = {
      name,
      exactAgeFormatted,
      sunSign,
      moonSign,
      ascendantSign,
      septenioCode: septenioStr,
      nodalAxisCode: nodesStr,
      profectionCode: profectionStr,
      natalAspectCodes: Array.isArray(natalAspectCodes) ? natalAspectCodes : undefined,
      transitCodes: Array.isArray(transitCodes) ? transitCodes : undefined,
    };

    const ai = getGeminiClient();
    if (!ai) {
      console.info('No GEMINI_API_KEY detected, using guaranteed complete synthesis.');
      return res.status(200).json({
        success: true,
        reading: generateGuaranteedCompleteSynthesis(fallbackData),
        source: 'structured_synthesis',
      });
    }

    const regenNote = isRegeneration
      ? `\nREGENERACIÓN (Perspectiva #${regenerationCount || 2}): Aporta un prisma interpretativo renovado, fresco y complementario. Indaga en matices anímicos inéditos, polaridades de sombra a integrar, vocación profunda y prácticas vitales concretas según Steiner y Lievegoed.`
      : '';

    // Condensed system instruction with strict integrity rule
    const systemInstruction = `Eres un sabio biógrafo antroposófico (siguiendo las enseñanzas de Rudolf Steiner y Bernard Lievegoed) y astrólogo humanista. Redacta análisis biográficos profundos, vivenciales, cálidos y transformadores.
REGLA CRÍTICA DE INTEGRIDAD: Debes redactar y concluir de forma completa y exhaustiva cada una de las 4 secciones solicitadas sin dejar ideas truncadas ni oraciones a medias. Cada sección debe tener un desarrollo fluido y una conclusión clara en Markdown bien estructurado (títulos ##, párrafos articulados, negritas para conceptos esenciales).`;

    // Condensed user prompt
    const prompt = `Consultante: ${name || 'Consultante'} (${exactAgeFormatted || 'Edad actual'}).
Luminarias/ASC: Sol en ${sunSign || 'N/A'}, Luna en ${moonSign || 'N/A'}, Ascendente en ${ascendantSign || 'N/A'}.
Septenio: ${septenioStr}.
Nodos Lunares: ${nodesStr}.
Profección anual: ${profectionStr}.
Aspectos natales clave: ${aspectsStr}.
Tránsitos celestes activos: ${transitsStr}.${regenNote}

Escribe una guía biográfica completa y de alta calidad abarcando obligatoriamente estas 4 secciones numeradas de principio a fin, cerrando la sección 4 con una síntesis práctica para la vida cotidiana:
## 1. La Esencia Biográfica y el Reto del Septenio Presente
## 2. La Brújula del Alma: El Eje de los Nodos Lunares
## 3. El Clima Vital del Año de Vida Actual
## 4. Alquimia de los Tránsitos: Mensaje de los Cielos para el Presente`;

    // Cascada de modelos priorizando Gemini 3.8 con degradación elegante a versiones previas
    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest',
    ];
    let readingText = '';
    let lastFailureReason = '';

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting AI synthesis with model: ${modelName}`);
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: isRegeneration ? 0.85 : 0.72,
              maxOutputTokens: 8192,
            },
          }),
          22000,
          `Timeout de 22s excedido en ${modelName}`
        );

        const text = response.text || '';
        const finishReason = response.candidates?.[0]?.finishReason;
        const validation = isReadingComplete(text, finishReason);

        if (validation.complete) {
          readingText = text.trim();
          console.log(`Successfully generated synthesis with ${modelName} (${readingText.length} chars)`);
          break;
        } else {
          console.warn(`Model ${modelName} output incomplete (${validation.reason}). Retrying with next model.`);
          lastFailureReason = validation.reason || 'Salida incompleta';
        }
      } catch (err: any) {
        console.warn(`Attempt with ${modelName} encountered error:`, err?.message || err);
        lastFailureReason = err?.message || 'Error de API';
      }
    }

    // If AI calls failed or returned incomplete output, deliver guaranteed full synthesis
    if (!readingText) {
      console.warn(`All AI model generations failed or were incomplete (${lastFailureReason}). Providing guaranteed synthesis fallback.`);
      readingText = generateGuaranteedCompleteSynthesis(fallbackData);
    }

    return res.json({
      success: true,
      reading: readingText,
    });
  } catch (error: any) {
    console.error('Error in /api/synthesis:', error);
    try {
      const fallbackReading = generateGuaranteedCompleteSynthesis(req.body || {});
      return res.status(200).json({
        success: true,
        reading: fallbackReading,
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: error.message || 'Error al generar la síntesis biográfica',
      });
    }
  }
});

// Setup Vite middleware in dev or static files in production
export async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Faro Biográfico server running on port ${PORT}`);
  });
}

// Only start standalone HTTP server when not running in serverless environments like Vercel
if (!process.env.VERCEL) {
  startServer();
}

export default app;
