import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { computeSwissEphemerisChart } from './swissEphemeris.js';
import { generateGuaranteedCompleteSynthesis } from './comprehensiveSynthesisFallback.js';
import {
  generateSynthesisReading,
  getResolvedApiKey,
  getResolvedDeepSeekApiKey,
} from './synthesisEngine.js';
import { reportDeveloperError, getDeveloperErrorRegistry } from '../lib/errorLogger.js';
import { analyzeBiographicalSeptenios } from '../lib/gemini.js';
import { analyzeBiographicalSeptenios as analyzeBiographicalSepteniosDeepSeek } from '../lib/deepseek.js';
import { upsertBiografia, getUserById } from '../lib/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Prevent express.json from hanging when run inside serverless environments (e.g. Vercel)
// where req.body has already been pre-parsed and the stream ended.
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    (req as any)._body = true;
  }
  next();
});

app.use(express.json({ limit: '5mb' }));

// Middleware to normalize rewritten paths from Vercel Serverless Function proxy
app.use((req, res, next) => {
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-forwarded-uri']) as string;
  if (matchedPath && matchedPath.startsWith('/api')) {
    req.url = matchedPath;
  } else if (req.query && req.query.__path) {
    const qPath = Array.isArray(req.query.__path) ? req.query.__path.join('/') : req.query.__path;
    req.url = `/api/${qPath}`;
  } else if (req.url.startsWith('/api?__path=')) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const q = parsed.searchParams.get('__path');
      if (q) req.url = `/api/${q}`;
    } catch {}
  }
  next();
});

// Lazy GoogleGenAI client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getResolvedApiKey();
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
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(getResolvedApiKey()),
    hasDeepSeekKey: Boolean(getResolvedDeepSeekApiKey()),
    provider: 'polar',
    hasPolar: Boolean(
      process.env.POLAR_ACCESS_TOKEN ||
      process.env.POLAR_ORGANIZATION_SLUG ||
      process.env.POLAR_CHECKOUT_URL_SINGLE ||
      process.env.POLAR_CHECKOUT_URL_PACK5
    ),
    organizationSlug: process.env.POLAR_ORGANIZATION_SLUG || null,
  });
});

// Polar.sh Billing, Products & Consulting Services Configuration endpoint
app.get(['/api/billing/config', '/billing/config'], (req, res) => {
  res.json({
    provider: 'polar',
    currency: 'USD',
    organizationSlug: process.env.POLAR_ORGANIZATION_SLUG || null,
    // 1. Paquetes de Créditos para "Faro Biográfico" (Reportes con IA)
    plans: [
      {
        id: 'pack_single',
        name: '1 Reporte de Trayectoria Vital',
        tagline: 'Ideal para autoconocimiento y análisis personal',
        type: 'one_time',
        typeLabel: 'Pago único (One-time purchase)',
        credits: 1,
        price: 3.99,
        netEstimateUsd: 3.29,
        checkoutUrl: process.env.POLAR_CHECKOUT_URL_SINGLE || process.env.LEMONSQUEEZY_CHECKOUT_URL_SINGLE || null,
        features: [
          '1 Reporte de Análisis Biográfico completo con IA',
          'Desglose de ejes de crecimiento y potencial evolutivo',
          'Clima del septenio y dinámica de tránsitos temporales',
          'Exportación e impresión en PDF de alta calidad',
        ],
      },
      {
        id: 'pack_family',
        name: 'Pack 5 Reportes de Análisis',
        tagline: 'Más Popular • Para ti y tus vínculos cercanos',
        type: 'one_time',
        typeLabel: 'Pago único (One-time purchase)',
        credits: 5,
        price: 14.99,
        unitPriceUsd: 2.99,
        netEstimateUsd: 13.74,
        popular: true,
        savingsPercent: 25,
        checkoutUrl: process.env.POLAR_CHECKOUT_URL_PACK5 || process.env.LEMONSQUEEZY_PACK5_URL || null,
        features: [
          '5 Créditos sin fecha de caducidad',
          'Equivale a solo $2.99 USD por reporte (Ahorro 25%)',
          'Comparativa de ciclos vitales y tránsitos',
          'Soporte de cálculo y procesamiento prioritario',
        ],
      },
      {
        id: 'pack_professional',
        name: 'Pack Profesional (15 Reportes)',
        tagline: 'Para facilitadores, biógrafos y consultores',
        type: 'one_time',
        typeLabel: 'Pago único (One-time purchase)',
        credits: 15,
        price: 29.99,
        unitPriceUsd: 1.99,
        netEstimateUsd: 27.99,
        savingsPercent: 50,
        checkoutUrl: process.env.POLAR_CHECKOUT_URL_PACK15 || process.env.LEMONSQUEEZY_CHECKOUT_URL_PACK15 || null,
        features: [
          '15 Créditos sin caducidad temporal',
          'Equivale a solo $1.99 USD por reporte (Ahorro 50%)',
          'Licencia de uso para consultoría de desarrollo',
          'Informes y comparativas para mentorías profesionales',
        ],
      },
    ],
    // 2. Servicios Continuos y Consultoría
    services: [
      {
        id: 'service_faro_diario',
        name: 'Faro Diario - Suscripción Matutina (OK Google / Audio PWA)',
        tagline: 'Audio de sincronización vital matutino de 45 segundos',
        type: 'subscription',
        typeLabel: 'Suscripción Mensual',
        price: 7.99,
        billingInterval: 'mes',
        netEstimateUsd: 6.79,
        deliverable: 'Audio matutino personalizado de 45 seg (Nodo Lunar + Septenio + Nodo Anual + Tránsitos del día)',
        checkoutUrl: process.env.POLAR_CHECKOUT_URL_FARO_DIARIO || null,
        features: [
          'Audio matutino personalizado de 45 seg generado cada día',
          'Síntesis activa: Nodo Lunar + Septenio + Nodo Anual + Tránsitos diarios',
          'Integración para PWA móvil y rutinas de altavoz inteligente / voz',
          'Suscripción mensual flexible gestionada por Polar.sh',
        ],
      },
      {
        id: 'service_rectificacion',
        name: 'Rectificación Biográfica de Carta Natal (Artesanal)',
        tagline: 'Auditoría astronómica y verificación biográfica manual',
        type: 'one_time',
        typeLabel: 'Pago único (One-time purchase)',
        price: 80.00,
        netEstimateUsd: 75.50,
        deliverable: 'Entrega en 3 días laborables mediante revisión manual con atacires y formulario estructurado',
        checkoutUrl: process.env.POLAR_CHECKOUT_URL_RECTIFICACION || null,
        features: [
          'Revisión manual minuciosa y artesanal con técnica de atacires',
          'Formulario estructurado de eventos vitales e hitos pasados',
          'Ajuste y determinación exacta al minuto/segundo de nacimiento',
          'Entrega en 3 días laborables con informe y efemérides corregidas',
        ],
      },
      {
        id: 'service_consultas',
        name: 'Consultas Privadas Individuales',
        tagline: 'Sesión personalizada 1 a 1 de orientación y desarrollo',
        type: 'custom',
        typeLabel: 'Tarifa acordada / Enlace directo Polar.sh',
        price: null,
        deliverable: 'Agenda externa (WhatsApp / Cal.com) con cobro acordado enviado a través de enlace directo de Polar.sh',
        checkoutUrl: process.env.POLAR_CHECKOUT_URL_CONSULTAS || null,
        calendarUrl: process.env.CONSULTING_CALENDAR_URL || null,
        features: [
          'Sesión individual personalizada 1 a 1 (60 - 90 min)',
          'Profundización en septenios, crisis evolutivas y dirección vocacional',
          'Coordinación directa de calendario vía WhatsApp / Cal.com',
          'Cobro seguro y flexible con enlace personalizado emitido en Polar.sh',
        ],
      },
    ],
    hasLivePolar: Boolean(
      process.env.POLAR_CHECKOUT_URL_SINGLE ||
      process.env.POLAR_CHECKOUT_URL_PACK5 ||
      process.env.POLAR_ACCESS_TOKEN ||
      process.env.POLAR_ORGANIZATION_SLUG
    ),
  });
});

// Polar.sh Webhook receiver (for order.created, subscription.created, etc.)
app.post(['/api/polar/webhook', '/polar/webhook', '/api/billing/webhook'], (req, res) => {
  try {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET || process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const signature = (req.headers['webhook-signature'] || req.headers['x-signature'] || req.headers['x-polar-signature']) as string;
    const webhookId = req.headers['webhook-id'] as string;
    const webhookTimestamp = req.headers['webhook-timestamp'] as string;

    if (webhookSecret && signature) {
      // Polar uses Standard Webhook signing (HMAC SHA256)
      const rawPayload = JSON.stringify(req.body);
      const toSign = webhookId && webhookTimestamp ? `${webhookId}.${webhookTimestamp}.${rawPayload}` : rawPayload;
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const computedHex = hmac.update(toSign).digest('hex');
      const computedBase64 = crypto.createHmac('sha256', webhookSecret).update(toSign).digest('base64');

      // Check if signature matches hex or base64 (or standard v1,... prefix)
      const matches =
        signature === computedHex ||
        signature === computedBase64 ||
        signature.includes(computedBase64) ||
        signature.includes(computedHex);

      if (!matches) {
        console.warn('[Polar Webhook] Firma de webhook no coincide, verificando sin prefijo...');
      }
    }

    const eventType = req.body?.type || req.body?.event || req.body?.meta?.event_name || 'polar.event';
    const eventData = req.body?.data || req.body;

    console.log(`[Polar Webhook] Evento recibido: ${eventType}`, {
      id: eventData?.id,
      amount: eventData?.amount || eventData?.total_formatted,
      customerEmail: eventData?.customer?.email || eventData?.customer_email,
      productId: eventData?.product_id,
      productName: eventData?.product?.name,
    });

    return res.json({ received: true, event: eventType, provider: 'polar' });
  } catch (err: any) {
    console.error('Error in Polar webhook:', err);
    return res.status(500).json({ error: 'Error procesando webhook Polar' });
  }
});

// Online Geocoding endpoint using OpenStreetMap (Nominatim) & Open-Meteo for Timezone
app.get(['/api/geocode', '/geocode'], async (req, res) => {
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
app.post(['/api/astrology/calculate', '/astrology/calculate'], (req, res) => {
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
      source: 'Swiss Ephemeris / Engine de Precisión',
    });
  } catch (error: any) {
    console.error('Error in /api/astrology/calculate:', error);
    return res.status(500).json({
      success: false,
      error: `Error al calcular carta natal: ${error.message}`,
    });
  }
});

// Utility helper to apply strict timeout on async operations
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
  const hasSec3 = clean.includes('3.') || clean.includes('Clima Vital') || clean.includes('Año de Vida');
  const hasSec4 =
    clean.includes('4.') ||
    clean.includes('Cualidad') ||
    clean.includes('Beneficios') ||
    clean.includes('Clima Diario') ||
    clean.includes('Alquimia') ||
    clean.includes('Tránsitos') ||
    clean.includes('Transitos') ||
    clean.includes('Cápsula de Audio');

  if (!hasSec1 || !hasSec2 || !hasSec3 || !hasSec4) {
    return { complete: false, reason: 'Falta alguna de las 4 secciones estructurales' };
  }

  return { complete: true };
}

// Endpoint para evaluar un septenio biográfico con Gemini Structured Outputs y persistir en BD
app.post(['/api/biografia/evaluar', '/biografia/evaluar'], async (req, res) => {
  try {
    const { user_id, septenio_num, recuerdos, patrones_clave } = req.body;

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

    let userContext: any = null;
    try {
      userContext = await getUserById(user_id);
    } catch (err: any) {
      console.warn(`[evaluar] No se pudo recuperar usuario ${user_id} de BD:`, err?.message);
    }

    const entradaSeptenio = {
      septenio_num: septenioNumber,
      recuerdos: recuerdos.trim(),
      patrones_previos: patrones_clave || null,
    };

    const evaluatorOptions = {
      contextoAdicional: userContext
        ? {
            nombre: userContext.nombre,
            fecha_nacimiento: userContext.fecha_nacimiento,
            lugar_nacimiento: userContext.lugar_nacimiento,
          }
        : null,
    };

    let interpretacion: any;
    if (getResolvedApiKey()) {
      interpretacion = await analyzeBiographicalSeptenios(entradaSeptenio, evaluatorOptions);
    } else if (getResolvedDeepSeekApiKey()) {
      interpretacion = await analyzeBiographicalSepteniosDeepSeek(entradaSeptenio, evaluatorOptions);
    } else {
      interpretacion = await analyzeBiographicalSeptenios(entradaSeptenio, evaluatorOptions);
    }

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

// Endpoint para consultar el registro de errores del desarrollador con estadísticas de tasa límite
app.get(['/api/developer/errors', '/developer/errors'], (req, res) => {
  res.json({
    status: 'ok',
    registry: getDeveloperErrorRegistry(),
  });
});

// Gemini Synthesis Endpoint for Anthroposophic Biography & Astrological Transit Reading
app.post(['/api/synthesis', '/synthesis'], async (req, res) => {
  try {
    const result = await generateSynthesisReading(req.body);
    if (!result.success) {
      return res.status(503).json(result);
    }
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error general en /api/synthesis:', error);
    await reportDeveloperError({
      category: 'SERVER_HANDLER_EXCEPTION',
      error,
      customMessage: `Excepción en endpoint /api/synthesis: ${error?.message || error}`,
      context: { bodyConsultante: req.body?.name },
    }).catch(() => {});

    return res.status(503).json({
      success: false,
      error:
        'El servicio de Inteligencia Artificial no pudo completar la lectura en este momento (tiempo de espera o error de servidor). Tu crédito NO ha sido consumido y tu saldo permanece intacto. Por favor, reintenta en unos instantes.',
      creditConsumed: false,
    });
  }
});

// Setup Vite middleware in dev or static files in production
export async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.join(process.cwd(), 'dist');

  if (!isProduction) {
    try {
      console.log('Starting server in DEVELOPMENT mode with Vite middleware...');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom',
      });
      app.use(vite.middlewares);

      // Handle root and client-side navigation in dev
      app.get('*', async (req, res, next) => {
        if (req.path.startsWith('/api')) {
          return next();
        }
        const ext = path.extname(req.path);
        if (ext && ext !== '.html') {
          return res.status(404).send('Not found');
        }
        try {
          const url = req.originalUrl;
          const rootIndex = path.join(process.cwd(), 'index.html');
          if (fs.existsSync(rootIndex)) {
            let template = fs.readFileSync(rootIndex, 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            return res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          }
          return next();
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          next(e);
        }
      });
    } catch (err) {
      console.warn('Vite middleware could not be loaded in dev, falling back to static:', err);
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
      }
    }
  } else {
    console.log('Starting server in PRODUCTION mode...');
    let hasStaticDist = fs.existsSync(path.join(distPath, 'index.html'));

    if (!hasStaticDist) {
      try {
        console.log('dist/index.html not found in production. Attempting build...');
        const { execSync } = await import('child_process');
        execSync('npx vite build', { stdio: 'inherit' });
        hasStaticDist = fs.existsSync(path.join(distPath, 'index.html'));
      } catch (buildErr) {
        console.warn('Could not auto-build client assets on the fly:', buildErr);
      }
    }

    if (hasStaticDist) {
      app.use(express.static(distPath));
    }

    // SPA routing in production: serve dist/index.html only for HTML requests
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        return res.status(404).send('Not found');
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      const rootIndex = path.join(process.cwd(), 'index.html');
      if (fs.existsSync(rootIndex)) {
        return res.sendFile(rootIndex);
      }
      return res.status(200).type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Faro Biográfico</title></head><body><div id="root">Cargando aplicación...</div></body></html>`);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Faro Biográfico server running on port ${PORT}`);
  });
}

export default app;
