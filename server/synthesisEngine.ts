import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { reportDeveloperError, classifyErrorCategory } from '../lib/errorLogger.js';
import {
  SynthesisFallbackInput,
} from '../src/utils/comprehensiveSynthesisFallback.js';

dotenv.config();

export function getResolvedApiKey(): string | null {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.gemini_api_key ||
    '';
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');
  return cleanKey.length > 5 ? cleanKey : null;
}

export function getResolvedDeepSeekApiKey(): string | null {
  const rawKey =
    process.env.DEEPSEEK_API_KEY ||
    process.env.DEEPSEEK_KEY ||
    process.env.DEEP_SEEK_API_KEY ||
    '';
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');
  return cleanKey.length > 5 ? cleanKey : null;
}

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

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function generateWithDeepSeek(
  prompt: string,
  systemInstruction: string,
  timeoutMs = 25000
): Promise<string | null> {
  const apiKey = getResolvedDeepSeekApiKey();
  if (!apiKey) return null;

  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const controller = new AbortController();
  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 3500,
      stream: false,
    }),
    signal: controller.signal,
  });

  const response = await withTimeout(
    fetchPromise,
    timeoutMs,
    `Timeout de ${timeoutMs / 1000}s excedido en DeepSeek`
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`DeepSeek API HTTP ${response.status}: ${errorText}`);
  }

  const responseData: any = await response.json();
  const outputText = responseData?.choices?.[0]?.message?.content;
  return outputText ? outputText.trim() : null;
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
    clean.includes('Beneficios') ||
    clean.includes('Tránsitos') ||
    clean.includes('Transitos');

  if (!hasSec1 || !hasSec2 || !hasSec3 || !hasSec4) {
    return { complete: false, reason: 'Falta alguna de las 4 secciones estructurales' };
  }

  return { complete: true };
}

export async function generateSynthesisReading(body: any): Promise<{
  success: boolean;
  reading?: string;
  source?: 'ai' | 'none';
  error?: string;
  errorCategory?: string;
  creditConsumed?: boolean;
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
    lunarNodesDetail,
    currentSkyPositions,
    todayDate,
    currentSeptenio,
    lunarNodes,
    yearOfLife,
    aspects,
    houses,
    planets,
    activeTransits,
    currentTransits,
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
    lunarNodesDetail,
    profectionCode: profectionStr,
    natalAspectCodes: Array.isArray(natalAspectCodes) ? natalAspectCodes : undefined,
    natalPlanetsSummary,
    transitHouseActivations: Array.isArray(transitHouseActivations) ? transitHouseActivations : undefined,
    transitCodes: Array.isArray(transitCodes) ? transitCodes : undefined,
    transitDetailedList: Array.isArray(transitDetailedList) ? transitDetailedList : undefined,
    currentSkyPositions,
    todayDate,
    activeTransitsRaw: Array.isArray(activeTransitsRaw) ? activeTransitsRaw : undefined,
    currentSeptenio,
    yearOfLife,
    lunarNodes,
    planets,
    houses,
    aspects,
    currentTransits,
  };

  const ai = getGeminiClient();
  const hasDeepSeek = Boolean(getResolvedDeepSeekApiKey());
  if (!ai && !hasDeepSeek) {
    const errorMsg = 'No hay claves de API de IA configuradas en el entorno (GEMINI_API_KEY o DEEPSEEK_API_KEY).';
    console.warn(`[Synthesis] ${errorMsg}`);
    await reportDeveloperError({
      category: 'NO_AI_KEYS_CONFIGURED',
      error: errorMsg,
      model: 'none',
      customMessage: 'El usuario intentó generar la síntesis biográfica pero no hay GEMINI_API_KEY ni DEEPSEEK_API_KEY configuradas.',
      context: { consultante: name, edad: exactAgeFormatted },
    });
    return {
      success: false,
      reading: '',
      error: 'El servicio de Inteligencia Artificial no está configurado temporalmente. Tu crédito NO ha sido consumido y tu saldo permanece intacto.',
      errorCategory: 'NO_AI_KEYS_CONFIGURED',
      creditConsumed: false,
    };
  }

  const regenNote = isRegeneration
    ? `\nREGENERACIÓN (Perspectiva #${regenerationCount || 2}): Aporta un prisma interpretativo renovado, fresco y complementario. Indaga en matices anímicos inéditos, polaridades de sombra a integrar, vocación profunda y prácticas vitales concretas según Steiner y Lievegoed.`
    : '';

  // Rich data formatting for prompt
  const septenioContext = currentSeptenio
    ? `- Septenio: ${currentSeptenio.number}° Septenio (${currentSeptenio.ageRange}), «${currentSeptenio.archetypalTitle}»
- Fase: ${currentSeptenio.phase} | Esfera: ${currentSeptenio.planetarySphere}
- Progreso en el ciclo de 7 años: ${currentSeptenio.progressPct}%
- Pregunta Arquetípica del Alma: "${currentSeptenio.coreQuestion}"
- Concepto de Rudolf Steiner: ${currentSeptenio.steinerConcept}
- Retos Evolutivos de esta Edad: ${(currentSeptenio.ageSpecificChallenges || []).join('; ')}`
    : `- Septenio: ${septenioStr}`;

  const resolvedLunarNodes = lunarNodes || (lunarNodesDetail ? {
    northNode: {
      sign: lunarNodesDetail.northSign,
      house: lunarNodesDetail.northHouse,
      dharmaDirection: lunarNodesDetail.dharmaDirection,
      soulLesson: lunarNodesDetail.soulLesson,
      evolutionaryAction: lunarNodesDetail.evolutionaryAction,
      strengthsToCultivate: lunarNodesDetail.strengthsToCultivate,
    },
    southNode: {
      sign: lunarNodesDetail.southSign,
      house: lunarNodesDetail.southHouse,
      pastLifeGifts: lunarNodesDetail.pastLifeGifts,
      comfortZoneTrap: lunarNodesDetail.comfortZoneTrap,
      patternsToRelease: lunarNodesDetail.patternsToRelease,
    },
    nodalCycle: {
      cycleMeaning: lunarNodesDetail.cycleMeaning,
      nextNodalReturnAge: lunarNodesDetail.nextNodalReturnAge,
    },
  } : null);

  const nodesContext = resolvedLunarNodes
    ? `- Nodo Norte: en ${resolvedLunarNodes.northNode?.sign}${resolvedLunarNodes.northNode?.house ? ` (Casa ${resolvedLunarNodes.northNode.house})` : ''}
  * Dirección de Dharma: ${resolvedLunarNodes.northNode?.dharmaDirection || ''}
  * Lección del Alma: ${resolvedLunarNodes.northNode?.soulLesson || ''}
  * Acción Concreta: ${resolvedLunarNodes.northNode?.evolutionaryAction || ''}
  * Fortalezas a cultivar: ${(resolvedLunarNodes.northNode?.strengthsToCultivate || []).join(', ')}
- Nodo Sur: en ${resolvedLunarNodes.southNode?.sign}${resolvedLunarNodes.southNode?.house ? ` (Casa ${resolvedLunarNodes.southNode.house})` : ''}
  * Dones innatos del pasado: ${resolvedLunarNodes.southNode?.pastLifeGifts || ''}
  * Trampa de inercia y confort: ${resolvedLunarNodes.southNode?.comfortZoneTrap || ''}
  * Patrones automáticos a soltar: ${(resolvedLunarNodes.southNode?.patternsToRelease || []).join(', ')}
- Ciclo Nodal: ${resolvedLunarNodes.nodalCycle?.cycleMeaning || ''}${resolvedLunarNodes.nodalCycle?.nextNodalReturnAge ? ` (Próximo retorno nodal a los ${resolvedLunarNodes.nodalCycle.nextNodalReturnAge} años)` : ''}`
    : `- Eje Nodal: ${nodesStr}`;

  const profectionContext = yearOfLife
    ? `- Año de Vida: Año ${yearOfLife.currentYearOfLife} (${yearOfLife.completedYears} años cumplidos)
- Profección Helenística: Casa ${yearOfLife.profectionHouse} en ${yearOfLife.profectionSign}
- Regente del Año (Señor del Año): ${yearOfLife.lordOfYear}
- Tema Central del Año: ${yearOfLife.annualCoreTheme}
- Clima y Energía Antroposófica: ${yearOfLife.anthroposophicYearEnergy}
- Directivas Clave del Año: ${(yearOfLife.keyDirectives || []).join('; ')}
- Recomendaciones Prácticas: ${(yearOfLife.vitalRecommendations || []).join('; ')}`
    : `- Profección anual: ${profectionStr}`;

  const systemInstruction = `Eres un sabio biógrafo antroposófico (siguiendo las enseñanzas de Rudolf Steiner y Bernard Lievegoed) y astrólogo humanista. Redacta análisis biográficos profundos, vivenciales, cálidos y transformadores.
REGLA CRÍTICA DE INTEGRIDAD: Debes redactar y concluir de forma completa y exhaustiva cada una de las 4 secciones solicitadas sin dejar ideas truncadas ni oraciones a medias en Markdown bien estructurado.

DIRECTRICES POR SECCIÓN:
- SECCIÓN 1: "## 1. La Esencia Biográfica y el Reto del Septenio Presente":
  1. No hables en generalidades abstractas. Cita e interpreta el septenio específico (${septenioStr}), la pregunta arquetípica de Steiner, el principio biográfico y los retos evolutivos concretos calculados para esta edad.
  2. Conecta todo lo anterior con su tríada natal individual: Sol en ${sunSign}, Luna en ${moonSign} y Ascendente en ${ascendantSign}.
- SECCIÓN 2 (REGLA MANDATORIA): "## 2. La Brújula del Alma: El Eje de los Nodos Lunares":
  1. PERSONALIZACIÓN OBLIGATORIA: Queda terminantemente prohibido hablar en generalidades o descripciones abstractas. Debes interpretar de forma explícita y profunda los signos y casas exactos del Nodo Norte y Nodo Sur de ${name}.
  2. NODO SUR (PASADO): Detalla los dones y facilidades innatas traídas, pero advierte con claridad sobre la trampa de comodidad, inercia o patrones automáticos a trascender en este signo y casa específicos.
  3. NODO NORTE (DHARMA): Detalla el vector de crecimiento, la lección esencial del alma, las acciones evolutivas concretas y las fortalezas que debe desplegar conscientemente en este signo y casa.
  4. INTEGRACIÓN: Explica cómo poner la sabiduría del Nodo Sur al servicio del destino trazado por el Nodo Norte y su sincronía con el ciclo nodal.
- SECCIÓN 3: "## 3. El Clima Vital del Año de Vida Actual":
  1. Cita e integra el año de vida, la casa de profección, el signo y el Regente del Año.
  2. Desarrolla el Tema Central del Año y la energía antroposófica calculados para el consultante.
  3. Expón las directivas prioritarias y recomendaciones prácticas calculadas para modular la energía de este año, articulándolas con sus aspectos natales destacados.
- SECCIÓN 4 (REGLA MANDATORIA): "## 4. Cualidad del Día: Tránsitos en Sinastría con tu Carta Natal":
  1. INTERPRETACIÓN DE SINASTRÍA INDIVIDUAL: Esta sección NO debe ser genérica ni plantilla. Debe interpretar de forma explícita la SINASTRÍA del cielo de hoy sobre la carta natal de ${name}. Toma en cuenta exactamente qué planetas del cielo están contactando a qué planetas natales y activando qué casas de su mapa personal.
  2. SÍNTESIS APLICADA A SU DÍA: Sintetiza el significado vivencial de esos contactos celestes aplicados a sus actividades diarias:
     - Qué energías de su carta natal (planetas y casas) se encuentran activadas hoy.
     - BENEFICIOS EN TUS ACTIVIDADES DIARIAS: Detalla los beneficios y facilidades concretas derivadas de los contactos armónicos o fluidos de hoy en su carta.
     - POSIBLES CONFLICTOS: Advierte sobre los posibles roces, riesgos o tensiones derivados de los contactos desafiantes activos hoy en su mapa, y cómo modularlos con serenidad.
     - CONSEJO PRÁCTICO: Una recomendación clara y aplicable a su jornada.
  3. DIFERENCIACIÓN TOTAL: Dos personas con configuraciones planetarias distintas DEBEN recibir respuestas totalmente diferentes. La interpretación debe pertenecer exclusivamente a la sinastría de los tránsitos de hoy con los planetas y casas natales de esta persona.
  4. ESTILO Y EXTENSIÓN: Tono coloquial, cálido, vivencial y aterrizado (120-170 palabras, aproximadamente 1 minuto de lectura). Sin viñetas mecánicas ni menciones a audio o micrófonos.`;

  const prompt = `Consultante: ${name || 'Consultante'} (${exactAgeFormatted || 'Edad actual'}).

DATOS YA OBTENIDOS EN LAS OTRAS PESTAÑAS DE LA APLICACIÓN:
[PESTAÑA 1 - SEPTENIOS]:
${septenioContext}

[PESTAÑA 2 - NODOS LUNARES]:
${nodesContext}

[PESTAÑA 3 - AÑO DE VIDA Y PROFECCIONES]:
${profectionContext}

[CARTA NATAL BASE]:
- Sol en ${sunSign || 'N/A'}, Luna en ${moonSign || 'N/A'}, Ascendente en ${ascendantSign || 'N/A'}.
${natalPlanetsSummary ? `- Posiciones natales clave: ${natalPlanetsSummary}.` : ''}
- Aspectos natales destacados: ${aspectsStr}.

[PESTAÑA 4 - SINASTRÍA DE TRÁNSITOS DE HOY CON LA CARTA NATAL]:
- Contactos celestes activos sobre sus planetas natales:
${detailedTransitsStr}
${transitHouseActivations && Array.isArray(transitHouseActivations) && transitHouseActivations.length > 0 ? `- Áreas natales (casas) activadas hoy por el cielo:\n${transitHouseActivations.join('\n')}\n` : ''}
${currentSkyPositions ? `Posiciones del cielo de hoy: ${currentSkyPositions}.` : ''}${regenNote}

REQUISITO FUNDAMENTAL:
Sintetiza e integra en una narrativa biográfica continua y profunda los datos YA CALCULADOS arriba. No uses respuestas genéricas.
Escribe la guía biográfica integral abarcando obligatoriamente las 4 secciones numeradas de principio a fin:
## 1. La Esencia Biográfica y el Reto del Septenio Presente
## 2. La Brújula del Alma: El Eje de los Nodos Lunares
## 3. El Clima Vital del Año de Vida Actual
## 4. Cualidad del Día: Tránsitos en Sinastría con tu Carta Natal`;

  const failedAttempts: Array<{ model: string; error: string; category: string }> = [];

  if (ai) {
    const candidateModelNames = [
      process.env.GEMINI_MODEL_OVERRIDE,
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
    ].filter(Boolean) as string[];

    const uniqueModelNames = Array.from(new Set(candidateModelNames));
    const modelsToTry = uniqueModelNames.map((name, idx) => ({
      name,
      timeoutMs: idx === 0 ? 30000 : 15000,
    }));

    for (const { name: modelName, timeoutMs } of modelsToTry) {
      try {
        console.log(`[Synthesis] Intentando con modelo: ${modelName} (timeout ${timeoutMs}ms)`);
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: isRegeneration ? 0.78 : 0.68,
              maxOutputTokens: 4096,
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
            creditConsumed: true,
          };
        } else {
          const incompleteMsg = `Modelo ${modelName} retornó texto incompleto: ${validation.reason}`;
          console.warn(`[Synthesis] ${incompleteMsg}`);
          failedAttempts.push({
            model: modelName,
            error: incompleteMsg,
            category: 'AI_RESPONSE_INCOMPLETE',
          });
        }
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        console.warn(`[Synthesis] Error o timeout con ${modelName}:`, errorMsg);
        failedAttempts.push({
          model: modelName,
          error: errorMsg,
          category: classifyErrorCategory(err, modelName),
        });
      }
    }
  }

  // DeepSeek AI fallback if Gemini was unavailable, timed out or unconfigured
  if (hasDeepSeek) {
    try {
      console.log('[Synthesis] Intentando generación biográfica profunda con DeepSeek API...');
      const deepSeekText = await generateWithDeepSeek(prompt, systemInstruction, 25000);
      if (deepSeekText) {
        const validation = isReadingComplete(deepSeekText);
        if (validation.complete) {
          console.log(`[Synthesis] Generación exitosa con DeepSeek (${deepSeekText.length} caracteres)`);
          return {
            success: true,
            reading: deepSeekText,
            source: 'ai',
            creditConsumed: true,
          };
        } else {
          const incompleteMsg = `Respuesta de DeepSeek incompleta: ${validation.reason}`;
          console.warn(`[Synthesis] ${incompleteMsg}`);
          failedAttempts.push({
            model: 'deepseek-chat',
            error: incompleteMsg,
            category: 'AI_RESPONSE_INCOMPLETE',
          });
        }
      }
    } catch (deepSeekErr: any) {
      const deepSeekMsg = deepSeekErr?.message || String(deepSeekErr);
      console.warn('[Synthesis] Error o timeout con DeepSeek:', deepSeekMsg);
      failedAttempts.push({
        model: 'deepseek-chat',
        error: deepSeekMsg,
        category: classifyErrorCategory(deepSeekErr, 'deepseek'),
      });
    }
  }

  // NO contingency reading: report to developer with rate limiting and notify user cleanly
  const primaryCategory = failedAttempts[0]?.category || 'AI_SERVICE_UNAVAILABLE';
  const summaryError = failedAttempts.map((f) => `[${f.model}: ${f.error}]`).join(' | ');

  console.error(`[Synthesis] Ningún modelo de IA pudo completar la síntesis: ${summaryError}`);

  await reportDeveloperError({
    category: primaryCategory,
    error: summaryError || 'Fallo general de generación IA en síntesis',
    model: failedAttempts[0]?.model || (ai ? 'gemini-3.8-flash' : 'deepseek-chat'),
    customMessage: `Fallo al generar síntesis para el consultante "${name || 'N/A'}". Ningún modelo de IA pudo entregar la lectura requerida.`,
    context: {
      consultante: name,
      edad: exactAgeFormatted,
      intentos: failedAttempts,
    },
  });

  return {
    success: false,
    reading: '',
    error:
      'El servicio de Inteligencia Artificial no pudo completar la lectura en este momento (tiempo de espera o saturación temporal). Tu crédito NO ha sido consumido y tu saldo permanece intacto. Por favor, reintenta en unos instantes.',
    errorCategory: primaryCategory,
    creditConsumed: false,
  };
}
