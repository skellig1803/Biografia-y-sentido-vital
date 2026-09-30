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
      birthDate,
      birthTime,
      placeName,
      exactAgeFormatted,
      currentSeptenio,
      lunarNodes,
      yearOfLife,
      sunSign,
      moonSign,
      ascendantSign,
      activeTransits,
    } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(200).json({
        success: false,
        fallbackReason: 'NO_API_KEY',
        message: 'No se ha configurado GEMINI_API_KEY. Se utilizará la síntesis astrológica y antroposófica integrada.',
      });
    }

    const prompt = `
Eres un sabio biógrafo antroposófico (siguiendo a Rudolf Steiner y Bernard Lievegoed) y un astrólogo humanista y kármico de primer nivel.
Genera una lectura biográfica, evolutiva y espiritual profunda, cálida y personalizada para:

- Nombre: ${name}
- Fecha y Hora de Nacimiento: ${birthDate} a las ${birthTime} en ${placeName}
- Edad Exacta: ${exactAgeFormatted}
- Sol en ${sunSign}, Luna en ${moonSign}, Ascendente en ${ascendantSign}
- Septenio Actual: ${currentSeptenio?.ageRange} — "${currentSeptenio?.archetypalTitle}" (Fase: ${currentSeptenio?.phase}, Esfera Planetaria: ${currentSeptenio?.planetarySphere})
- Eje Nodal Lunar:
  * Nodo Norte (Dharma / Destino a Conquistar): en ${lunarNodes?.northNode?.sign} (Casa ${lunarNodes?.northNode?.house})
  * Nodo Sur (Karma / Memoria / Zona de Confort): en ${lunarNodes?.southNode?.sign} (Casa ${lunarNodes?.southNode?.house})
- Análisis del Año de Vida Actual: ${yearOfLife?.annualCoreTheme} (Profección Casa ${yearOfLife?.profectionHouse}, Regente: ${yearOfLife?.lordOfYear})
- Tránsitos Planetarios Activos en este momento:
  ${activeTransits?.slice(0, 5)?.map((t: any) => `- ${t.name}: ${t.biographicalImpact}`).join('\n') || 'Tránsitos en curso activando la carta natal.'}

Escribe una guía estructurada en español, con tono elevado, empático, lúcido y sin lugares comunes ni jerga fría.
Estructura tu respuesta en 4 secciones claras con títulos en negrita:
1. **La Esencia Biográfica y el Reto del Septenio Presente** (Explica qué fuerza anímica o espiritual está naciendo según la antroposofía, qué máscaras se deben soltar y cuál es el gran desafío evolutivo de su edad exacta).
2. **La Brújula del Alma: El Eje de los Nodos Lunares** (Qué talentos y comodidades del Nodo Sur ya no le sirven, y qué acción concreta y coraje le pide el Nodo Norte para cumplir su propósito kármico).
3. **El Clima Vital del Año de Vida Actual** (Cómo canalizar la energía de la casa de profección activada y su planeta regente).
4. **Alquimia de los Tránsitos: Mensaje de los Cielos para el Presente** (Síntesis de cómo los tránsitos actuales empujan esta transformación y un consejo inspirador para su día a día).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const readingText = response.text || '';

    return res.json({
      success: true,
      reading: readingText,
    });
  } catch (error: any) {
    console.error('Error in /api/synthesis:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error generating synthesis',
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
    console.log(`Carta Natal & Biografía Antroposófica server running on port ${PORT}`);
  });
}

startServer();
