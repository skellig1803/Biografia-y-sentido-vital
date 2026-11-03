import { GoogleGenAI } from '@google/genai';
import { getResolvedApiKey } from '../synthesisEngine.js';
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
 * Construye el prompt cálido y personal en español para la generación de voz.
 */
function construirPrompt(user: UserForScheduler, transitResult: DailyTransitsResult): string {
  return (
    `Hola ${user.nombre}. Este es tu Faro Biográfico para el día de hoy, ${transitResult.fecha}.\n\n` +
    `${transitResult.textoPunto4}\n\n` +
    `Recuerda que los astros no determinan tu destino, sino que iluminan el camino.`
  );
}

/**
 * Realiza una única llamada a la API de Gemini para generar el audio TTS.
 * Extrae el base64 del audio del primer step de tipo 'model_output' con
 * contenido de tipo 'audio' y lo devuelve como Buffer.
 */
async function llamarApiTts(prompt: string, apiKey: string): Promise<Buffer> {
  const client = new GoogleGenAI({ apiKey });

  const interaction = await client.interactions.create({
    model: 'gemini-3.8-flash-tts',
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

  throw new Error('[audioGenerator] La respuesta de la API no contiene datos de audio.');
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

  const prompt = construirPrompt(user, transitResult);
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
