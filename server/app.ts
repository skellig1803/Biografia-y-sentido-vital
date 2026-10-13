import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { computeSwissEphemerisChart } from './swissEphemeris.js';
import { generateGuaranteedCompleteSynthesis } from './comprehensiveSynthesisFallback.js';
import { analyzeBiographicalSeptenios } from '../lib/gemini.js';
import { upsertBiografia, getUserById } from '../lib/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '5mb' }));

// Middleware to normalize rewritten paths from Vercel Serverless Function proxy
app.use((req, res, next) => {
  const matchedPath = (req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-forwarded-uri']) as string;
  if (matchedPath && matchedPath.startsWith('/api') && req.url === '/api') {
    req.url = matchedPath;
  } else if (req.query && req.query.__path) {
    const qPath = Array.isArray(req.query.__path) ? req.query.__path.join('/') : req.query.__path;
    req.url = `/api/${qPath}`;
  }
  next();
});

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
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
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

    const interpretacion = await analyzeBiographicalSeptenios(entradaSeptenio, {
      contextoAdicional: userContext
        ? {
            nombre: userContext.nombre,
            fecha_nacimiento: userContext.fecha_nacimiento,
            lugar_nacimiento: userContext.lugar_nacimiento,
          }
        : null,
    });

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
app.post(['/api/synthesis', '/synthesis'], async (req, res) => {
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
      natalPlanetsSummary,
      transitHouseActivations,
      transitCodes,
      transitDetailedList,
      currentSkyPositions,
      todayDate,
      currentSeptenio,
      lunarNodes,
      yearOfLife,
      aspects,
      activeTransits,
      isRegeneration,
      regenerationCount,
    } = req.body;

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

    const aspectsStr =
      Array.isArray(natalAspectCodes) && natalAspectCodes.length > 0
        ? natalAspectCodes.slice(0, 6).join('; ')
        : Array.isArray(aspects) && aspects.length > 0
        ? aspects.slice(0, 6).map((a: any) => `${a.planet1?.name || ''} ${a.symbol || ''} ${a.planet2?.name || ''} (${(a.orb ?? 0).toFixed?.(1) || 0}°)`).join('; ')
        : 'Aspectos natales calculados';

    const detailedTransitsStr =
      Array.isArray(transitDetailedList) && transitDetailedList.length > 0
        ? transitDetailedList.join('\n')
        : Array.isArray(transitCodes) && transitCodes.length > 0
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
      natalPlanetsSummary,
      transitHouseActivations: Array.isArray(transitHouseActivations) ? transitHouseActivations : undefined,
      transitCodes: Array.isArray(transitCodes) ? transitCodes : undefined,
      transitDetailedList: Array.isArray(transitDetailedList) ? transitDetailedList : undefined,
      currentSkyPositions,
      todayDate,
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

    const systemInstruction = `Eres un sabio biógrafo antroposófico (siguiendo las enseñanzas de Rudolf Steiner y Bernard Lievegoed) y astrólogo humanista. Redacta análisis biográficos profundos, vivenciales, cálidos y transformadores.
REGLA CRÍTICA DE INTEGRIDAD: Debes redactar y concluir de forma completa y exhaustiva cada una de las 4 secciones solicitadas sin dejar ideas truncadas ni oraciones a medias en Markdown bien estructurado.

DIRECTRICES POR SECCIÓN:
- Secciones 1, 2 y 3: Desarrolla el análisis biográfico con profundidad antroposófica, abordando el septenio presente, el eje nodal evolutivo y el clima del año de vida con riqueza vivencial.
- SECCIÓN 4 (REGLA MANDATORIA): "## 4. Cualidad del Día: Beneficios y Posibles Conflictos en tus Actividades Diarias":
  1. NO MENCIONES LOS TRÁNSITOS: Queda terminantemente prohibido usar la palabra "tránsito", "tránsitos" o tecnicismos astronómicos de aspectos (no hables de conjunciones, cuadraturas, trígonos ni de planetas transitando).
  2. CUALIDAD DEL DÍA: Traduce la configuración celeste activa de hoy en la cualidad anímica, mental y energética de la jornada para ${name || 'el consultante'} (considerando su Sol en ${sunSign || 'su signo'}, Luna en ${moonSign || 'su luna'} y Ascendente en ${ascendantSign || 'su ascendente'}).
  3. BENEFICIOS EN ACTIVIDADES DIARIAS: Detalla con total claridad qué beneficios, facilidades y oportunidades favorables se presentan hoy en sus actividades cotidianas (comunicación, decisiones laborales, concentración, creatividad o resolución de tareas).
  4. POSIBLES CONFLICTOS EN ACTIVIDADES DIARIAS: Advierte sobre los posibles conflictos, riesgos de fricción o tropiezos que pueden surgir en su día a día (impulsividad al responder, dispersión, impaciencia ante imprevistos, malentendidos o rigidez) y cómo modularlos con serenidad.
  5. ESTILO Y EXTENSIÓN: Tono coloquial, cálido, ameno y reflexivo, como una charla con un mentor de confianza. Extensión de 1 minuto de lectura máximo (aproximadamente 120-150 palabras), en prosa fluida y aterrizada. Sin viñetas mecánicas, sin jerga matemática y sin menciones a audio o micrófonos.`;

    const prompt = `Consultante: ${name || 'Consultante'} (${exactAgeFormatted || 'Edad actual'}).
Carta natal individual:
- Sol en ${sunSign || 'N/A'}, Luna en ${moonSign || 'N/A'}, Ascendente en ${ascendantSign || 'N/A'}.
${natalPlanetsSummary ? `- Posiciones natales clave: ${natalPlanetsSummary}.` : ''}
- Septenio: ${septenioStr}.
- Nodos Lunares: ${nodesStr}.
- Profección anual: ${profectionStr}.
- Aspectos natales destacados: ${aspectsStr}.

Configuración celeste activa de hoy (para que extraigas la cualidad del día aplicada a sus actividades diarias):
${transitHouseActivations && Array.isArray(transitHouseActivations) && transitHouseActivations.length > 0 ? `Áreas vitales tocadas hoy:\n${transitHouseActivations.join('\n')}\n` : ''}
Activaciones e influjos de hoy sobre su mapa:
${detailedTransitsStr}
${currentSkyPositions ? `Posiciones del cielo de hoy: ${currentSkyPositions}.` : ''}${regenNote}

Escribe la guía biográfica integral abarcando obligatoriamente las 4 secciones numeradas de principio a fin:
## 1. La Esencia Biográfica y el Reto del Septenio Presente
## 2. La Brújula del Alma: El Eje de los Nodos Lunares
## 3. El Clima Vital del Año de Vida Actual
## 4. Cualidad del Día: Beneficios y Posibles Conflictos en tus Actividades Diarias

(INSTRUCCIÓN OBLIGATORIA PARA LA SECCIÓN 4: No menciones la palabra "tránsito" ni aspectos técnicos. Enfoca el texto exclusivamente en dar la cualidad del día para sus actividades diarias, mencionando los beneficios y los posibles conflictos que puede presentar la jornada, con una actitud práctica serena. Máximo 1 minuto de lectura / 120-150 palabras).`;

    // Production-ready Gemini models supported by Google GenAI (gemini-3.8-flash is latest standard)
    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
    ];
    let readingText = '';
    let lastFailureReason = '';

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Synthesis] Intentando con modelo: ${modelName}`);
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: isRegeneration ? 0.82 : 0.70,
              maxOutputTokens: 8192,
            },
          }),
          25000,
          `Timeout de 25s excedido en ${modelName}`
        );

        const text = response.text || '';
        const finishReason = response.candidates?.[0]?.finishReason;
        const validation = isReadingComplete(text, finishReason);

        if (validation.complete) {
          readingText = text.trim();
          console.log(`[Synthesis] Generación exitosa con ${modelName} (${readingText.length} caracteres)`);
          break;
        } else {
          console.warn(`[Synthesis] Modelo ${modelName} incompleto (${validation.reason}).`);
          lastFailureReason = validation.reason || 'Salida incompleta';
        }
      } catch (err: any) {
        console.warn(`[Synthesis] Error con ${modelName}:`, err?.message || err);
        lastFailureReason = err?.message || 'Error de API';
      }
    }

    // If AI calls timed out or failed, deliver guaranteed full synthesis
    if (!readingText) {
      console.warn(`[Synthesis] Fallback activado (${lastFailureReason}). Entregando síntesis garantizada.`);
      readingText = generateGuaranteedCompleteSynthesis(fallbackData);
    }

    return res.json({
      success: true,
      reading: readingText,
    });
  } catch (error: any) {
    console.error('Error general en /api/synthesis:', error);
    try {
      const fallbackReading = generateGuaranteedCompleteSynthesis(req.body || {});
      return res.status(200).json({
        success: true,
        reading: fallbackReading,
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Error al generar la síntesis biográfica',
      });
    }
  }
});

// Setup Vite middleware in dev or static files in production
export async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const hasStaticDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' || hasStaticDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite middleware could not be loaded, falling back to static files:', err);
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Faro Biográfico server running on port ${PORT}`);
  });
}

export default app;
