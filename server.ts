import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { computeSwissEphemerisChart } from './server/swissEphemeris';

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
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Billing & Pricing Configuration endpoint
app.get('/api/billing/config', (req, res) => {
  res.json({
    currency: 'USD',
    plans: [
      { id: 'pack_single', credits: 1, price: 3.99, paymentLink: process.env.STRIPE_PAYMENT_LINK_SINGLE || null },
      { id: 'pack_family', credits: 5, price: 14.99, paymentLink: process.env.STRIPE_PAYMENT_LINK_PACK5 || null },
      { id: 'pack_professional', credits: 15, price: 29.99, paymentLink: process.env.STRIPE_PAYMENT_LINK_PACK15 || null },
    ],
    hasLiveStripe: Boolean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_PAYMENT_LINK_SINGLE),
  });
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

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        success: false,
        fallbackReason: 'NO_API_KEY',
        message: 'No se ha configurado GEMINI_API_KEY. Se utilizará la síntesis astrológica y antroposófica integrada.',
      });
    }

    // Concise representation of astrological markers to minimize input tokens
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

    const regenNote = isRegeneration
      ? `\nREGENERACIÓN (Perspectiva #${regenerationCount || 2}): Aporta un prisma interpretativo renovado, fresco y complementario. Indaga en matices anímicos inéditos, polaridades de sombra a integrar, vocación profunda y prácticas vitales concretas según Steiner y Lievegoed.`
      : '';

    // Condensed system instruction: ~50 tokens
    const systemInstruction = `Eres un sabio biógrafo antroposófico (Steiner/Lievegoed) y astrólogo humanista. Redacta análisis biográficos profundos, vivenciales y transformadores. Evita lugares comunes o clichés. Escribe en Markdown impecable con subtítulos ##, negritas precisas y listas claras.`;

    // Condensed user prompt: ~120-150 tokens
    const prompt = `Consultante: ${name || 'Consultante'} (${exactAgeFormatted || 'Edad actual'}).
Luminarias/ASC: Sol en ${sunSign || 'N/A'}, Luna en ${moonSign || 'N/A'}, Ascendente en ${ascendantSign || 'N/A'}.
Septenio: ${septenioStr}.
Nodos Lunares: ${nodesStr}.
Profección anual: ${profectionStr}.
Aspectos natales clave: ${aspectsStr}.
Tránsitos celestes activos: ${transitsStr}.${regenNote}

Escribe una guía biográfica lúcida y personalizada estructurada en estas 4 secciones en Markdown:
## 1. La Esencia Biográfica y el Reto del Septenio Presente
## 2. La Brújula del Alma: El Eje de los Nodos Lunares
## 3. El Clima Vital del Año de Vida Actual
## 4. Alquimia de los Tránsitos: Mensaje de los Cielos para el Presente`;

    // Resilient generation with fallback across primary and fast model
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    let readingText = '';
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: isRegeneration ? 0.88 : 0.72,
            maxOutputTokens: 1200,
          },
        });

        if (response.text && response.text.trim().length > 0) {
          readingText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Attempt with ${modelName} encountered error:`, err?.message || err);
        lastError = err;
      }
    }

    if (!readingText) {
      throw lastError || new Error('No se pudo generar la lectura con los modelos de IA disponibles.');
    }

    return res.json({
      success: true,
      reading: readingText,
    });
  } catch (error: any) {
    console.error('Error in /api/synthesis:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al generar la síntesis biográfica',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
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

startServer();
