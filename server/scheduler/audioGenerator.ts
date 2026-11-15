import { GoogleGenAI } from '@google/genai';
import { getResolvedApiKey, getResolvedDeepSeekApiKey } from '../synthesisEngine.js';
import type { UserForScheduler, DailyTransitsResult } from './dailyTransits.js';

// ---------------------------------------------------------------------------
// Constantes de configuración
// ---------------------------------------------------------------------------

const MAX_INTENTOS = 3;
const DELAY_ENTRE_INTENTOS_MS = 5_000;
const TIMEOUT_POR_INTENTO_MS = 120_000;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Pausa la ejecución durante los milisegundos indicados.
 */
function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Envuelve una promesa con un timeout. Si la promesa no resuelve antes del
 * tiempo indicado, rechaza con un error descriptivo.
 */
function conTimeout<T>(promesa: Promise<T>, ms: number, etiqueta: string): Promise<T> {
  const reloj = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`[audioGenerator] Timeout de ${ms}ms superado: ${etiqueta}`)), ms),
  );
  return Promise.race([promesa, reloj]);
}

/**
 * Modelos de generación de texto ordenados por capacidad para sintetizar el guion hablado
 */
const TEXT_CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL_OVERRIDE,
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
].filter(Boolean) as string[];

/**
 * Modelos de voz TTS soportados ordenados desde la versión más reciente usable
 */
const TTS_CANDIDATE_MODELS = [
  process.env.GEMINI_TTS_MODEL_OVERRIDE,
  'gemini-3.8-flash-tts',
  'gemini-3.5-flash-tts',
  'gemini-2.5-flash-tts',
].filter(Boolean) as string[];

/**
 * Limpia y recorta el texto para asegurar una locución que jamás supere 1 minuto (<= 88 palabras).
 */
export function sanitizeWordCount(texto: string, nombre: string): string {
  let clean = texto
    .replace(/[«»*#_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const palabras = clean.split(' ');
  if (palabras.length > 88) {
    clean = palabras.slice(0, 84).join(' ') + '... Recuerda que los astros iluminan el sendero, pero tú diriges tus pasos. Que tengas un día luminoso.';
  }
  return clean;
}

/**
 * Genera el guion hablado de WhatsApp usando IA (Gemini con fallback a DeepSeek y a reglas enriquecidas).
 * Toma el análisis astrológico de tránsitos de la persona y lo sintetiza en una locución de 1 minuto
 * o menos (65 a 85 palabras) con situaciones reales de la vida cotidiana (negocios, comunicación,
 * pensamiento lógico, ventas, riesgos de exageración o precipitación).
 */
export async function generatePersonalizedSpokenScriptWithAI(
  user: UserForScheduler,
  transitResult: DailyTransitsResult,
): Promise<string> {
  const geminiKey = getResolvedApiKey();
  const deepseekKey = getResolvedDeepSeekApiKey();

  const promptInstruccion = `Eres un sabio biógrafo y astrólogo práctico humanista.
Tu tarea es convertir el reporte de tránsitos del día en un guion hablado cálido, motivador y sumamente concreto para una nota de voz matutina de WhatsApp dirigida a ${user.nombre}.

DATOS DE TRÁNSITOS DE HOY:
Fecha: ${transitResult.fecha}
Aspectos favorables: ${JSON.stringify(transitResult.aspectosBeneficos)}
Aspectos de tensión: ${JSON.stringify(transitResult.aspectosConflictivos)}
Tránsitos activos: ${JSON.stringify(transitResult.transitosActivos)}
Texto base del reporte:
${transitResult.textoPunto4}

REGLAS CRÍTICAS OBLIGATORIAS:
1. DURACIÓN ESTRICTA: Debe tener entre 65 y 85 palabras (máximo 88 palabras, jamás exceder 1 minuto de habla a 125 ppm).
2. NADA DE GENERALIDADES: Prohibido usar frases vacías o clichés esotéricos (como "ventana de gracia", "energías favorables", "modula las vibraciones").
3. EFECTO EN LA VIDA REAL: Da pistas sumamente concretas sobre situaciones cotidianas:
   - Si hay tránsitos de Mercurio: menciona explícitamente su impacto en negocios, llamadas clave, acuerdos, ventas, contratos, trámites o pensamiento lógico analítico.
   - Si hay tensión de Sol o Marte con Júpiter: advierte con claridad sobre el riesgo de exagerar, sobreestimar fuerzas o prometer más de lo que se puede abarcar; recomendando aterrizar expectativas y evitar decisiones o respuestas con prisa.
   - Si hay contactos de Venus o Luna: menciona el trato con personas, socios o estado anímico.
4. ESTRUCTURA:
   - Saludo con su nombre: "Buenos días, ${user.nombre}. Tu faro para hoy, [Día]:"
   - La oportunidad práctica del día en el trabajo o la vida cotidiana.
   - El punto de atención o cuidado situacional a modular con serenidad.
   - Cierre breve inspirador bajo el modelo EGM (ligera presencia del día).
5. FORMATO DE SALIDA: Entrega ÚNICAMENTE el texto que será leído en voz alta, sin comillas, sin viñetas, sin negritas Markdown ni explicaciones adicionales.`;

  // 1. Intentar con Gemini
  if (geminiKey) {
    try {
      const client = new GoogleGenAI({ apiKey: geminiKey });
      for (const model of TEXT_CANDIDATE_MODELS) {
        try {
          const response = await conTimeout(
            client.models.generateContent({
              model,
              contents: promptInstruccion,
              config: {
                temperature: 0.6,
                maxOutputTokens: 250,
              },
            }),
            10_000,
            `Gemini spoken script (${model})`,
          );

          const text = response.text ? response.text.trim() : '';
          if (text && text.length > 50) {
            return sanitizeWordCount(text, user.nombre);
          }
        } catch (err) {
          console.warn(`[audioGenerator] Fallo al generar guion con Gemini (${model}):`, (err as any)?.message);
        }
      }
    } catch (e) {
      console.warn('[audioGenerator] Error inicializando cliente Gemini:', (e as any)?.message);
    }
  }

  // 2. Intentar con DeepSeek si Gemini no respondió
  if (deepseekKey) {
    try {
      const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
      const res = await conTimeout(
        fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: promptInstruccion }],
            temperature: 0.6,
            max_tokens: 250,
          }),
        }),
        10_000,
        'DeepSeek spoken script',
      );

      if (res.ok) {
        const data: any = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text && text.length > 50) {
          return sanitizeWordCount(text, user.nombre);
        }
      }
    } catch (dsErr) {
      console.warn('[audioGenerator] Fallo al generar guion con DeepSeek:', (dsErr as any)?.message);
    }
  }

  // 3. Fallback determinista enriquecido con pistas situacionales reales
  const fallbackTexto = (transitResult.sintesisAudioMatutino || '').trim();
  if (fallbackTexto && fallbackTexto.length >= 15) {
    return sanitizeWordCount(fallbackTexto, user.nombre);
  }

  return (
    `Buenos días, ${user.nombre}. Tu faro para hoy, ${transitResult.fecha}: ` +
    `el cielo te invita a avanzar con orden en tus actividades cotidianas. ` +
    `Recuerda que los astros iluminan el sendero, pero tú diriges tus pasos. Que tengas un día luminoso y consciente.`
  );
}

/**
 * Realiza una llamada a la API de Gemini para generar el audio TTS,
 * probando automáticamente desde el modelo más nuevo usable con degradación elegante.
 */
async function llamarApiTts(prompt: string, apiKey: string): Promise<Buffer> {
  const client = new GoogleGenAI({ apiKey });
  let ultimoError: unknown;

  for (const modelName of TTS_CANDIDATE_MODELS) {
    try {
      const interaction = await client.interactions.create({
        model: modelName,
        input: prompt,
        response_modalities: ['audio'],
        generation_config: {
          speech_config: [{ voice: 'achernar', language: 'es-ES' }],
        },
      });

      // Recorrer los steps para encontrar el audio base64
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          for (const content of step.content ?? []) {
            if (content.type === 'audio' && content.data) {
              return Buffer.from(content.data, 'base64');
            }
          }
        }
      }
    } catch (err) {
      ultimoError = err;
      console.warn(`[audioGenerator] Fallo con modelo TTS ${modelName}:`, (err as any)?.message || err);
      // Continuar al siguiente modelo en cascada
    }
  }

  throw new Error(`[audioGenerator] No se pudo generar audio con los modelos TTS disponibles. Último error: ${ultimoError}`);
}

// ---------------------------------------------------------------------------
// Tipos y Errores públicos
// ---------------------------------------------------------------------------

export interface GeneratedAudioResult {
  audioBuffer: Buffer;
  textoGenerado: string;
}

/** Error especializado cuando se agotan los tokens o cuota semanal/diaria de Gemini */
export class QuotaExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExhaustedError';
  }
}

/**
 * Detecta si el error corresponde a límite de cuota o agotamiento de tokens.
 */
export function isQuotaExhaustedError(err: unknown): boolean {
  if (err instanceof QuotaExhaustedError) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('exhausted')
  );
}

// ---------------------------------------------------------------------------
// Función principal exportada
// ---------------------------------------------------------------------------

/**
 * Genera el audio diario del Faro Biográfico para un usuario dado.
 *
 * El texto síntesis de los Tránsitos Diarios con IA se convierte en voz española cálida usando
 * el modelo Gemini TTS. Se realizan hasta 3 intentos con un intervalo de
 * 5 segundos y un timeout de 120 segundos por intento. Si se detecta
 * agotamiento de tokens / cuota (429 / RESOURCE_EXHAUSTED), se interrumpe
 * inmediatamente con QuotaExhaustedError para pausar la cola hasta la recarga.
 *
 * @param user          - Datos del usuario (nombre, etc.)
 * @param transitResult - Resultado del cálculo de tránsitos diarios
 * @returns             Objeto con el audioBuffer (WAV) y el textoGenerado
 * @throws              QuotaExhaustedError si los tokens se acabaron, o Error genérico
 */
export async function generateDailyAudio(
  user: UserForScheduler,
  transitResult: DailyTransitsResult,
): Promise<GeneratedAudioResult> {
  const apiKey = getResolvedApiKey();
  if (!apiKey) {
    throw new Error('[audioGenerator] No se encontró una API key de Gemini configurada.');
  }

  // 1. Sintetizar el guion hablado personalizado con IA (< 1 minuto, con impacto real en la vida cotidiana)
  const prompt = await generatePersonalizedSpokenScriptWithAI(user, transitResult);
  let ultimoError: unknown;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      console.info(`[audioGenerator] Intento ${intento}/${MAX_INTENTOS} para usuario ${user.id}...`);

      const buffer = await conTimeout(
        llamarApiTts(prompt, apiKey),
        TIMEOUT_POR_INTENTO_MS,
        `generateDailyAudio (intento ${intento})`,
      );

      console.info(`[audioGenerator] Audio generado exitosamente para usuario ${user.id}.`);
      return {
        audioBuffer: buffer,
        textoGenerado: prompt,
      };
    } catch (err) {
      ultimoError = err;
      const mensaje = err instanceof Error ? err.message : String(err);

      // Si es cuota/tokens agotados, no reintentar en bucle; lanzar de inmediato
      if (isQuotaExhaustedError(err)) {
        console.warn(`[audioGenerator] Cuota de tokens agotada en Gemini para ${user.id}: ${mensaje}`);
        throw new QuotaExhaustedError(
          `Tokens o cuota agotada en Gemini API: ${mensaje}. La generación se reanudará al recargarse los tokens.`,
        );
      }

      console.warn(`[audioGenerator] Intento ${intento} fallido para usuario ${user.id}: ${mensaje}`);

      if (intento < MAX_INTENTOS) {
        console.info(`[audioGenerator] Esperando ${DELAY_ENTRE_INTENTOS_MS}ms antes del siguiente intento...`);
        await esperar(DELAY_ENTRE_INTENTOS_MS);
      }
    }
  }

  const mensajeError =
    ultimoError instanceof Error ? ultimoError.message : String(ultimoError);

  throw new Error(
    `[audioGenerator] Fallaron los ${MAX_INTENTOS} intentos de generación de audio ` +
    `para el usuario ${user.id} (${user.nombre}). Último error: ${mensajeError}`,
  );
}
