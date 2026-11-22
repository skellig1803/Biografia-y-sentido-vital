/**
 * @file dailyAudioCache.js
 * @description Módulo de acceso a datos para la tabla `daily_audio_cache` en Supabase.
 *              Gestiona el almacenamiento en caché de los audios diarios generados para cada usuario,
 *              incluyendo estados de generación, errores y limpieza de entradas expiradas.
 */

import { getSupabase } from './db.js';

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Devuelve la fecha y hora actual en formato ISO 8601 (UTC).
 * @returns {string}
 */
function ahora() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Funciones exportadas
// ---------------------------------------------------------------------------

/**
 * Obtiene la entrada de caché de audio para un usuario en una fecha concreta.
 *
 * @param {string} userId - ID del usuario en la tabla `users`.
 * @param {string} fecha  - Fecha en formato `'YYYY-MM-DD'`.
 * @returns {Promise<Object|null>} El registro de caché, o `null` si no existe.
 * @throws {Error} Si ocurre un error inesperado en Supabase.
 */
export async function getDailyAudio(userId, fecha) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('daily_audio_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('fecha', fecha)
    .maybeSingle();

  if (error) {
    throw new Error(`getDailyAudio: ${error.message}`);
  }

  return data ?? null;
}

/**
 * Crea o actualiza una entrada de caché de audio diario para un usuario.
 * Cuando el estado es `'ready'`, establece automáticamente `generated_at` a la fecha actual.
 *
 * @param {Object}  params
 * @param {string}  params.userId                  - ID del usuario en la tabla `users`.
 * @param {string}  params.fecha                   - Fecha en formato `'YYYY-MM-DD'`.
 * @param {string}  [params.audioUrl]               - URL pública del archivo de audio generado.
 * @param {number}  [params.audioDurationSeconds]   - Duración del audio en segundos.
 * @param {string}  [params.textoGenerado]          - Texto utilizado para generar el audio.
 * @param {Object}  [params.transitosJson]          - Datos de tránsitos astrológicos en formato JSON.
 * @param {string}  params.status                  - Estado de la entrada ('generating', 'ready', 'error').
 * @returns {Promise<Object>} El registro insertado o actualizado.
 * @throws {Error} Si ocurre un error en Supabase.
 */
export async function upsertDailyAudio({
  userId,
  fecha,
  audioUrl,
  audioDurationSeconds,
  textoGenerado,
  transitosJson,
  status,
}) {
  const supabase = getSupabase();

  const payload = {
    user_id: userId,
    fecha,
    audio_url: audioUrl ?? null,
    audio_duration_seconds: audioDurationSeconds ?? null,
    texto_generado: textoGenerado ?? null,
    transitos_json: transitosJson ?? null,
    status,
    updated_at: ahora(),
  };

  // Registrar el momento en que el audio quedó listo
  if (status === 'ready') {
    payload.generated_at = ahora();
  }

  const { data, error } = await supabase
    .from('daily_audio_cache')
    .upsert(payload, { onConflict: 'user_id, fecha' })
    .select()
    .single();

  if (error) {
    throw new Error(`upsertDailyAudio: ${error.message}`);
  }

  return data;
}

/**
 * Marca una entrada de caché como `'generating'` para un usuario y fecha dados.
 * Si la entrada ya existe con estado `'generating'`, devuelve `false` para evitar
 * procesamientos duplicados.
 *
 * @param {string} userId - ID del usuario en la tabla `users`.
 * @param {string} fecha  - Fecha en formato `'YYYY-MM-DD'`.
 * @returns {Promise<boolean>} `true` si se marcó correctamente, `false` si ya estaba en estado `'generating'`.
 * @throws {Error} Si ocurre un error inesperado en Supabase.
 */
export async function markAsGenerating(userId, fecha) {
  const supabase = getSupabase();

  // Comprobar si ya existe una entrada en estado 'generating'
  const { data: existente, error: selectError } = await supabase
    .from('daily_audio_cache')
    .select('status')
    .eq('user_id', userId)
    .eq('fecha', fecha)
    .maybeSingle();

  if (selectError) {
    throw new Error(`markAsGenerating (verificación): ${selectError.message}`);
  }

  if (existente?.status === 'generating') {
    // Ya en proceso: evitar duplicado
    return false;
  }

  // Insertar o actualizar con estado 'generating'
  const { error: upsertError } = await supabase
    .from('daily_audio_cache')
    .upsert(
      {
        user_id: userId,
        fecha,
        status: 'generating',
        updated_at: ahora(),
      },
      { onConflict: 'user_id, fecha' }
    );

  if (upsertError) {
    throw new Error(`markAsGenerating (upsert): ${upsertError.message}`);
  }

  return true;
}

/**
 * Marca una entrada de caché como `'error'` y registra el mensaje de error.
 *
 * @param {string} userId    - ID del usuario en la tabla `users`.
 * @param {string} fecha     - Fecha en formato `'YYYY-MM-DD'`.
 * @param {string} errorMsg  - Descripción del error ocurrido.
 * @returns {Promise<Object>} El registro actualizado.
 * @throws {Error} Si ocurre un error en Supabase.
 */
export async function markAsError(userId, fecha, errorMsg) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('daily_audio_cache')
    .upsert(
      {
        user_id: userId,
        fecha,
        status: 'error',
        error: errorMsg,
        updated_at: ahora(),
      },
      { onConflict: 'user_id, fecha' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`markAsError: ${error.message}`);
  }

  return data;
}

/**
 * Elimina las entradas de caché cuya fecha de expiración (`expires_at`) ya ha pasado
 * y cuyo estado es `'ready'`. Útil para mantener limpia la tabla y liberar almacenamiento.
 *
 * @returns {Promise<number>} Número de filas eliminadas.
 * @throws {Error} Si ocurre un error en Supabase.
 */
export async function cleanupExpiredAudio() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('daily_audio_cache')
    .delete()
    .lt('expires_at', ahora())
    .eq('status', 'ready')
    .select('id');

  if (error) {
    throw new Error(`cleanupExpiredAudio: ${error.message}`);
  }

  return Array.isArray(data) ? data.length : 0;
}

/**
 * Obtiene la lista de IDs de usuarios que aún NO tienen una entrada con estado `'ready'`
 * para la fecha indicada. Ideal para determinar qué usuarios necesitan generación de audio.
 *
 * La estrategia consiste en obtener primero los `user_id` que ya tienen audio listo
 * y luego consultar los usuarios con suscripción activa que no están en esa lista.
 *
 * @param {string} fecha - Fecha en formato `'YYYY-MM-DD'`.
 * @returns {Promise<string[]>} Array de `user_id` que necesitan audio para la fecha indicada.
 * @throws {Error} Si ocurre un error en Supabase.
 */
export async function getUsersNeedingAudioForDate(fecha) {
  const supabase = getSupabase();

  // Paso 1: obtener los user_id que ya tienen audio listo para esa fecha
  const { data: conAudio, error: errorConAudio } = await supabase
    .from('daily_audio_cache')
    .select('user_id')
    .eq('fecha', fecha)
    .eq('status', 'ready');

  if (errorConAudio) {
    throw new Error(`getUsersNeedingAudioForDate (con audio): ${errorConAudio.message}`);
  }

  const idsConAudio = (conAudio ?? []).map((row) => row.user_id);

  // Paso 2: obtener usuarios con suscripción activa que NO tienen audio listo
  let query = supabase
    .from('users')
    .select('id')
    .eq('suscripcion_activa', true);

  if (idsConAudio.length > 0) {
    query = query.not('id', 'in', `(${idsConAudio.join(',')})`);
  }

  const { data: usuariosSinAudio, error: errorSinAudio } = await query;

  if (errorSinAudio) {
    throw new Error(`getUsersNeedingAudioForDate (sin audio): ${errorSinAudio.message}`);
  }

  return (usuariosSinAudio ?? []).map((row) => row.id);
}
