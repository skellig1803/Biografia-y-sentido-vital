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
    clean.includes('Sinastría') ||
    clean.includes('Sinastria') ||
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
    activeTransitsRaw,
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
    activeTransitsRaw: Array.isArray(activeTransitsRaw) ? activeTransitsRaw : undefined,
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
- SECCIÓN 4 (REGLA MANDATORIA): "## 4. Cualidad del Día: Tránsitos en Sinastría con tu Carta Natal":
  1. INTERPRETACIÓN DE SINASTRÍA INDIVIDUAL: Esta sección NO debe ser genérica ni plantilla. Debe interpretar de forma explícita la SINASTRÍA del cielo de hoy sobre la carta natal de ${name}. Toma en cuenta exactamente qué planetas del cielo están contactando a qué planetas natales y activando qué casas de su mapa personal.
  2. SÍNTESIS APLICADA A SU DÍA: Sintetiza el significado vivencial de esos contactos celestes aplicados a sus actividades diarias:
     - Qué energías de su carta natal (planetas y casas) se encuentran activadas hoy.
     - BENEFICIOS EN TUS ACTIVIDADES DIARIAS: Detalla los beneficios y facilidades concretas derivadas de los contactos armónicos o fluidos de hoy en su carta.
     - POSIBLES CONFLICTOS: Advierte sobre los posibles roces, riesgos o tensiones derivados de los contactos desafiantes activos hoy en su mapa, y cómo modularlos con serenidad.
     - CONSEJO PRÁCTICO: Una recomendación clara y aplicable a su jornada.
  3. DIFERENCIACIÓN TOTAL: Dos personas con configuraciones planetarias distintas DEBEN recibir respuestas en el punto 4 totalmente diferentes. La interpretación debe pertenecer exclusivamente a la sinastría de los tránsitos de hoy con los planetas y casas natales de esta persona.
  4. ESTILO Y EXTENSIÓN: Tono coloquial, cálido, vivencial y aterrizado (120-170 palabras, aproximadamente 1 minuto de lectura). Sin viñetas mecánicas ni menciones a audio o micrófonos.`;

  const prompt = `Consultante: ${name || 'Consultante'} (${exactAgeFormatted || 'Edad actual'}).
Carta natal individual:
- Sol en ${sunSign || 'N/A'}, Luna en ${moonSign || 'N/A'}, Ascendente en ${ascendantSign || 'N/A'}.
${natalPlanetsSummary ? `- Posiciones natales clave: ${natalPlanetsSummary}.` : ''}
- Septenio: ${septenioStr}.
- Nodos Lunares: ${nodesStr}.
- Profección anual: ${profectionStr}.
- Aspectos natales destacados: ${aspectsStr}.

Configuración de la SINASTRÍA de los tránsitos de hoy con su carta natal:
- Contactos celestes activos sobre sus planetas natales:
${detailedTransitsStr}
${transitHouseActivations && Array.isArray(transitHouseActivations) && transitHouseActivations.length > 0 ? `- Áreas natales (casas) activadas hoy por el cielo:\n${transitHouseActivations.join('\n')}\n` : ''}
${currentSkyPositions ? `Posiciones del cielo de hoy: ${currentSkyPositions}.` : ''}${regenNote}

Escribe la guía biográfica integral abarcando obligatoriamente las 4 secciones numeradas de principio a fin:
## 1. La Esencia Biográfica y el Reto del Septenio Presente
## 2. La Brújula del Alma: El Eje de los Nodos Lunares
## 3. El Clima Vital del Año de Vida Actual
## 4. Cualidad del Día: Tránsitos en Sinastría con tu Carta Natal

(INSTRUCCIÓN MANDATORIA PARA LA SECCIÓN 4: Interpreta la sinastría de los tránsitos actuales sobre la carta natal individual de ${name || 'el consultante'}. Sintetiza el resultado explicando cómo esos contactos específicos activan sus planetas y áreas natales hoy, detallando los beneficios y los posibles conflictos que presenta la jornada en sus actividades diarias, con un consejo práctico. PROHIBIDO DAR GENERALIDADES O TEXTOS PREFABRICADOS: debe ser el reflejo fiel de su sinastría individual de hoy. Máximo 1 minuto de lectura / 120-170 palabras).`;

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
