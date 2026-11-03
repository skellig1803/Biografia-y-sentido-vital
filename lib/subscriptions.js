/**
 * @file subscriptions.js
 * @description Módulo de acceso a datos para la tabla `subscriptions` en Supabase.
 *              Gestiona la creación, lectura, actualización y cancelación de suscripciones,
 *              así como la sincronización del campo `suscripcion_activa` en la tabla `users`.
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
 * Crea o actualiza una suscripción en la tabla `subscriptions`.
 * La operación de upsert se basa en el campo `polar_subscription_id`.
 * Si el estado de la suscripción es `'active'`, también actualiza
 * `users.suscripcion_activa` a `true` para el usuario correspondiente.
 *
 * @param {Object} params
 * @param {string} params.userId               - ID del usuario en la tabla `users`.
 * @param {string} params.polarSubscriptionId  - ID único de la suscripción en Polar.
 * @param {string} [params.polarOrderId]       - ID de la orden en Polar (opcional).
 * @param {string} params.planId               - ID del plan contratado.
 * @param {string} params.status               - Estado de la suscripción (p. ej. 'active', 'cancelled').
 * @param {string} [params.currentPeriodStart] - Inicio del período actual (ISO 8601).
 * @param {string} [params.currentPeriodEnd]   - Fin del período actual (ISO 8601).
 * @returns {Promise<Object>} El registro insertado o actualizado.
 * @throws {Error} Si ocurre un error en Supabase.
 */
export async function upsertSubscription({
  userId,
  polarSubscriptionId,
  polarOrderId,
  planId,
  status,
  currentPeriodStart,
  currentPeriodEnd,
}) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        polar_subscription_id: polarSubscriptionId,
        polar_order_id: polarOrderId ?? null,
        plan_id: planId,
        status,
        current_period_start: currentPeriodStart ?? null,
        current_period_end: currentPeriodEnd ?? null,
        updated_at: ahora(),
      },
      { onConflict: 'polar_subscription_id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`upsertSubscription: ${error.message}`);
  }

  // Sincronizar suscripcion_activa en la tabla users
  if (status === 'active') {
    const { error: userError } = await supabase
      .from('users')
      .update({ suscripcion_activa: true })
      .eq('id', userId);

    if (userError) {
      throw new Error(`upsertSubscription (sync users): ${userError.message}`);
    }
  }

  return data;
}

/**
 * Obtiene la suscripción activa de un usuario.
 * Una suscripción se considera activa cuando su estado es `'active'`
 * y su fecha de fin de período es posterior al momento actual.
 *
 * @param {string} userId - ID del usuario en la tabla `users`.
 * @returns {Promise<Object|null>} El registro de suscripción activa, o `null` si no existe.
 * @throws {Error} Si ocurre un error inesperado en Supabase.
 */
export async function getActiveSubscription(userId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', ahora())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`getActiveSubscription: ${error.message}`);
  }

  return data ?? null;
}

/**
 * Obtiene todas las suscripciones de un usuario, ordenadas de la más
 * reciente a la más antigua.
 *
 * @param {string} userId - ID del usuario en la tabla `users`.
 * @returns {Promise<Object[]>} Array de registros de suscripción.
 * @throws {Error} Si ocurre un error en Supabase.
 */
export async function getUserSubscriptions(userId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`getUserSubscriptions: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Cancela una suscripción actualizando su estado a `'cancelled'`
 * y registrando la fecha de cancelación (`cancelled_at`).
 * También actualiza `users.suscripcion_activa` a `false` para el
 * usuario propietario de la suscripción.
 *
 * @param {string} polarSubscriptionId - ID único de la suscripción en Polar.
 * @returns {Promise<Object>} El registro de suscripción actualizado.
 * @throws {Error} Si la suscripción no existe o Supabase devuelve error.
 */
export async function cancelSubscription(polarSubscriptionId) {
  const supabase = getSupabase();

  // Actualizar la suscripción
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: ahora(),
      updated_at: ahora(),
    })
    .eq('polar_subscription_id', polarSubscriptionId)
    .select()
    .single();

  if (error) {
    throw new Error(`cancelSubscription: ${error.message}`);
  }

  // Sincronizar suscripcion_activa en la tabla users
  const { error: userError } = await supabase
    .from('users')
    .update({ suscripcion_activa: false })
    .eq('id', data.user_id);

  if (userError) {
    throw new Error(`cancelSubscription (sync users): ${userError.message}`);
  }

  return data;
}

/**
 * Verifica si un usuario tiene alguna suscripción activa y actualiza
 * el campo `users.suscripcion_activa` en consecuencia.
 *
 * @param {string} userId - ID del usuario en la tabla `users`.
 * @returns {Promise<boolean>} `true` si el usuario tiene suscripción activa, `false` en caso contrario.
 * @throws {Error} Si ocurre un error en Supabase.
 */
export async function checkAndSyncSubscriptionStatus(userId) {
  const supabase = getSupabase();

  // Comprobar si existe al menos una suscripción activa vigente
  const { data, error } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', ahora())
    .limit(1);

  if (error) {
    throw new Error(`checkAndSyncSubscriptionStatus: ${error.message}`);
  }

  const tieneActiva = Array.isArray(data) && data.length > 0;

  // Actualizar el flag en la tabla users
  const { error: userError } = await supabase
    .from('users')
    .update({ suscripcion_activa: tieneActiva })
    .eq('id', userId);

  if (userError) {
    throw new Error(`checkAndSyncSubscriptionStatus (sync users): ${userError.message}`);
  }

  return tieneActiva;
}

/**
 * Obtiene todos los usuarios que tienen una suscripción activa y vigente.
 * Realiza un JOIN entre `users` y `subscriptions` filtrando por estado `'active'`
 * y `current_period_end` posterior al momento actual.
 *
 * @returns {Promise<Object[]>} Array de objetos con los datos completos de los usuarios suscriptores activos.
 * @throws {Error} Si ocurre un error en Supabase.
 */
export async function getActiveSubscribers() {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('users')
    .select(
      'id, email, nombre, fecha_nacimiento, hora_nacimiento, lugar_nacimiento, timezone, google_user_id, assistant_linked, subscriptions!inner(status, current_period_end)'
    )
    .eq('subscriptions.status', 'active')
    .gt('subscriptions.current_period_end', ahora())
    .eq('suscripcion_activa', true);

  if (error) {
    throw new Error(`getActiveSubscribers: ${error.message}`);
  }

  return data ?? [];
}
