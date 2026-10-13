import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  generateGuaranteedCompleteSynthesis,
  SynthesisFallbackInput,
} from '../src/utils/comprehensiveSynthesisFallback.js';

dotenv.config();

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

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

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

export async function generateSynthesisReading(body: any): Promise<{
  success: boolean;
  reading: string;
  source: 'ai' | 'structured_synthesis';
}> {
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
  } = body || {};

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

  const fallbackData: SynthesisFallbackInput = {
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
    console.info('[Synthesis] Sin GEMINI_API_KEY en entorno, entregando síntesis biográfica garantizada.');
    return {
      success: true,
      reading: generateGuaranteedCompleteSynthesis(fallbackData),
      source: 'structured_synthesis',
    };
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

  // Try current generation models (optimized timeout for serverless / Vercel execution)
  const modelsToTry = [
    { name: 'gemini-3.8-flash', timeoutMs: 12000 },
    { name: 'gemini-3.1-flash-lite', timeoutMs: 8000 },
  ];

  for (const { name: modelName, timeoutMs } of modelsToTry) {
    try {
      console.log(`[Synthesis] Intentando con modelo: ${modelName} (timeout ${timeoutMs}ms)`);
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
        timeoutMs,
        `Timeout de ${timeoutMs}ms excedido en ${modelName}`
      );

      const text = response.text || '';
      const finishReason = response.candidates?.[0]?.finishReason;
      const validation = isReadingComplete(text, finishReason);

      if (validation.complete) {
        const readingText = text.trim();
        console.log(`[Synthesis] Generación exitosa con ${modelName} (${readingText.length} caracteres)`);
        return {
          success: true,
          reading: readingText,
          source: 'ai',
        };
      } else {
        console.warn(`[Synthesis] Modelo ${modelName} incompleto (${validation.reason}).`);
      }
    } catch (err: any) {
      console.warn(`[Synthesis] Error o timeout con ${modelName}:`, err?.message || err);
    }
  }

  // Fallback guaranteed reading if AI is slow or encounters issues
  console.info('[Synthesis] Fallback activado. Entregando síntesis biográfica garantizada.');
  return {
    success: true,
    reading: generateGuaranteedCompleteSynthesis(fallbackData),
    source: 'structured_synthesis',
  };
}
