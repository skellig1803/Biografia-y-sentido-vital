/**
 * @file dailyAudioScheduler.ts
 * @description Orquestador del proceso batch de generación de audio diario para todos
 * los suscriptores activos. Diseñado para ejecutarse cada noche (ej. a la 1:00 AM UTC)
 * via cron o trigger externo a través del endpoint `/api/scheduler/run-daily`.
 *
 * Flujo por usuario:
 *  1. Verificar si el audio ya existe y está listo → omitir (skipped).
 *  2. Verificar si ya está en proceso (con guarda contra procesos colgados).
 *  3. Marcar como "generating" para evitar duplicados concurrentes.
 *  4. Calcular tránsitos astronómicos del día.
 *  5. Generar el audio con IA.
 *  6. Subir el buffer de audio al almacenamiento.
 *  7. Persistir el resultado en la caché de audio diario.
 */

import { getActiveSubscribers } from '../../lib/subscriptions.js';
import {
  getDailyAudio,
  markAsGenerating,
  markAsError,
  upsertDailyAudio,
} from '../../lib/dailyAudioCache.js';
import { computeDailyTransitsPoint4 } from './dailyTransits.js';
import { generateDailyAudio, isQuotaExhaustedError } from './audioGenerator.js';
import { uploadDailyAudio } from './audioStorage.js';

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Resumen de la ejecución del scheduler para una fecha concreta. */
export interface SchedulerResult {
  /** Fecha procesada en formato YYYY-MM-DD. */
  date: string;
  /** Total de suscriptores activos evaluados. */
  totalUsers: number;
  /** Audios generados exitosamente en esta ejecución. */
  generated: number;
  /** Audios que ya existían y fueron omitidos. */
  skipped: number;
  /** Usuarios con error durante el proceso. */
  failed: number;
  /** Indica si la cuota de tokens se agotó durante el procesamiento. */
  quotaExhausted?: boolean;
  /** Detalle de errores por usuario para diagnóstico. */
  errors: Array<{ userId: string; name: string; error: string }>;
}

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/** Umbral en milisegundos para considerar un proceso de generación como colgado (10 minutos). */
const STALE_GENERATING_THRESHOLD_MS = 10 * 60 * 1000;

/**
 * Procesa una lista de ítems con límite de concurrencia usando un patrón de semáforo.
 * @param items   - Lista de ítems a procesar.
 * @param limit   - Máximo de promesas activas simultáneamente.
 * @param fn      - Función asíncrona a aplicar sobre cada ítem.
 */
async function processWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const p = fn(item).finally(() => {
      executing.splice(executing.indexOf(p), 1);
    });
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}

// ---------------------------------------------------------------------------
// Función principal exportada
// ---------------------------------------------------------------------------

/**
 * Ejecuta la generación de audio diario para todos los suscriptores activos.
 *
 * @param targetDate - Fecha objetivo en formato YYYY-MM-DD.
 *                     Si se omite, se usa la fecha actual en UTC.
 * @returns Resumen de la ejecución con contadores y lista de errores.
 */
export async function runDailyAudioGeneration(
  targetDate?: string,
): Promise<SchedulerResult> {
  // Fecha objetivo: parámetro recibido o hoy en UTC
  const date: string = targetDate ?? new Date().toISOString().split('T')[0];

  console.log(`[Scheduler] Iniciando generación de audio diario para la fecha: ${date}`);

  const result: SchedulerResult = {
    date,
    totalUsers: 0,
    generated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // Obtener todos los suscriptores activos
  const subscribers = await getActiveSubscribers();
  result.totalUsers = subscribers.length;

  console.log(`[Scheduler] Procesando ${subscribers.length} suscriptores activos.`);

  // Flag de cortocircuito si se agota la cuota semanal/diaria de tokens
  let quotaExhausted = false;

  /**
   * Lógica de procesamiento de un único usuario.
   * El bloque completo está encapsulado para que los errores queden contenidos
   * y no interrumpan el procesamiento del resto de usuarios.
   */
  async function processUser(user: any): Promise<void> {
    const userId: string = user.id;
    const userName: string = user.nombre || user.name || user.email || userId;

    // Si los tokens ya se agotaron en esta ejecución, omitir el resto para no saturar
    if (quotaExhausted) {
      console.warn(
        `[Scheduler] Cuota de tokens agotada; posponiendo usuario ${userName} hasta recarga semanal.`,
      );
      result.skipped++;
      return;
    }

    try {
      // 1. Verificar si el audio ya está listo
      const existing = await getDailyAudio(userId, date);

      if (existing?.status === 'ready') {
        console.log(`[Scheduler] Audio ya listo para ${userName} (${userId}). Omitiendo.`);
        result.skipped++;
        return;
      }

      // 2. Verificar si está en proceso (pero sin quedar colgado más de 10 min)
      if (existing?.status === 'generating') {
        const generatedAt: Date | null = existing.generated_at
          ? new Date(existing.generated_at)
          : null;
        const isStale =
          !generatedAt ||
          Date.now() - generatedAt.getTime() > STALE_GENERATING_THRESHOLD_MS;

        if (!isStale) {
          console.log(
            `[Scheduler] Generación en curso (no colgada) para ${userName}. Omitiendo.`,
          );
          result.skipped++;
          return;
        }

        console.warn(
          `[Scheduler] Generación colgada detectada para ${userName}. Reintentando.`,
        );
      }

      // 3. Marcar como "generating" para evitar ejecuciones concurrentes
      await markAsGenerating(userId, date);

      // 4. Calcular los tránsitos astronómicos del día
      const transitResult = await computeDailyTransitsPoint4(user, new Date(date));

      // 5. Generar el audio con IA
      const { audioBuffer, textoGenerado } = await generateDailyAudio(user, transitResult);

      // 6. Subir el audio al almacenamiento (Supabase Storage / S3 / etc.)
      const audioUrl = await uploadDailyAudio(userId, date, audioBuffer);

      // 7. Persistir el resultado como "ready" en la caché de audio diario
      await upsertDailyAudio({
        userId,
        fecha: date,
        status: 'ready',
        audioUrl,
        textoGenerado,
        transitosJson: transitResult,
        audioDurationSeconds: 0,
      });

      console.log(`[Scheduler] ✓ Audio generado para ${userName} (${userId}).`);
      result.generated++;
    } catch (err: any) {
      const errorMessage: string = err?.message || String(err);
      console.error(
        `[Scheduler] ✗ Error procesando a ${userName} (${userId}):`,
        errorMessage,
      );

      if (isQuotaExhaustedError(err)) {
        quotaExhausted = true;
        result.quotaExhausted = true;
        console.warn(
          `[Scheduler] ⚠️ Agotamiento de tokens detectado. Pausando cola. Se reanudará al recargarse.`,
        );
      }

      // Marcar el registro como fallido para diagnóstico y reintento automático tras recarga
      await markAsError(userId, date, errorMessage).catch(() => {});

      result.failed++;
      result.errors.push({ userId, name: userName, error: errorMessage });
    }
  }

  // Procesar todos los suscriptores con concurrencia máxima de 3
  await processWithConcurrency(subscribers, 3, processUser);

  console.log(
    `[Scheduler] Proceso finalizado. Generados: ${result.generated}, ` +
      `Omitidos: ${result.skipped}, Fallidos: ${result.failed}, ` +
      `CuotaAgotada: ${result.quotaExhausted ? 'SÍ (esperando recarga)' : 'NO'}.`,
  );

  return result;
}
