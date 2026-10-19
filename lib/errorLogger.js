import dotenv from 'dotenv';
import { getSupabase } from './db.js';

dotenv.config();

/**
 * @typedef {Object} ErrorRecord
 * @property {string} signature - Clave única de la causa del error.
 * @property {string} category - Categoría del error (ej. GEMINI_TIMEOUT, GEMINI_QUOTA).
 * @property {string} message - Mensaje legible del error.
 * @property {string|null} model - Modelo de IA involucrado.
 * @property {number} firstSeen - Timestamp Unix del primer evento registrado.
 * @property {number} lastSeen - Timestamp Unix del evento más reciente.
 * @property {number} lastAlertedAt - Timestamp Unix de la última alerta enviada.
 * @property {number} occurrences - Cantidad total de incidencias en la ventana actual.
 * @property {Object|null} lastContext - Contexto técnico adicional del último fallo.
 */

// Memoria en proceso para deduplicación y tasa límite (rate limiting) de alertas
const errorRegistry = new Map();

// Ventana de enfriamiento por defecto: 15 minutos (evita saturar al desarrollador con la misma causa)
const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000;

/**
 * Obtiene el tiempo de enfriamiento configurado en minutos o el valor por defecto (15 min).
 * @returns {number}
 */
function getCooldownMs() {
  const envMinutes = parseInt(process.env.DEV_ERROR_COOLDOWN_MINUTES || '', 10);
  if (!isNaN(envMinutes) && envMinutes > 0) {
    return envMinutes * 60 * 1000;
  }
  return DEFAULT_COOLDOWN_MS;
}

/**
 * Normaliza y clasifica la causa del error en una categoría determinística.
 * @param {Error|any} err - Error capturado.
 * @param {string} [hint] - Pista opcional del contexto.
 * @returns {string} Código de categoría estandarizado.
 */
export function classifyErrorCategory(err, hint = '') {
  const msg = String(err?.message || err || '').toLowerCase();
  const h = String(hint).toLowerCase();

  if (msg.includes('timeout') || h.includes('timeout') || err?.name === 'AbortError') {
    if (msg.includes('deepseek') || h.includes('deepseek')) return 'DEEPSEEK_TIMEOUT';
    return 'GEMINI_TIMEOUT';
  }
  if (msg.includes('quota') || msg.includes('429') || msg.includes('resource_exhausted')) {
    if (msg.includes('deepseek') || h.includes('deepseek')) return 'DEEPSEEK_QUOTA_EXCEEDED';
    return 'GEMINI_QUOTA_EXCEEDED';
  }
  if (
    msg.includes('api_key') ||
    msg.includes('apikey') ||
    msg.includes('unauthorized') ||
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('forbidden')
  ) {
    if (msg.includes('deepseek') || h.includes('deepseek')) return 'DEEPSEEK_AUTH_FAILED';
    return 'GEMINI_AUTH_FAILED';
  }
  if (msg.includes('incompleto') || msg.includes('secciones') || h.includes('incomplete')) {
    return 'AI_RESPONSE_INCOMPLETE';
  }
  if (msg.includes('claves de ia') || msg.includes('sin gemini_api_key')) {
    return 'NO_AI_KEYS_CONFIGURED';
  }
  return 'AI_SERVICE_UNAVAILABLE';
}

/**
 * Envía una notificación webhook al desarrollador si está configurada en variables de entorno.
 * Soporta Discord, Slack y webhooks genéricos (POST JSON).
 * @param {Object} alertPayload
 */
async function dispatchWebhookNotification(alertPayload) {
  const webhookUrl =
    process.env.DEV_ALERT_WEBHOOK_URL ||
    process.env.DEVELOPER_NOTIFICATION_WEBHOOK ||
    process.env.DISCORD_WEBHOOK_URL ||
    process.env.SLACK_WEBHOOK_URL ||
    null;

  if (!webhookUrl) return;

  try {
    const isDiscord = webhookUrl.includes('discord.com/api/webhooks');
    const isSlack = webhookUrl.includes('hooks.slack.com');

    let bodyPayload = {};

    if (isDiscord) {
      bodyPayload = {
        username: 'Faro Biográfico Sentinel',
        embeds: [
          {
            title: `⚠️ Incidencia IA: ${alertPayload.category}`,
            description: alertPayload.message,
            color: 0xef4444, // Rojo alerta
            fields: [
              { name: 'Modelo', value: alertPayload.model || 'N/A', inline: true },
              { name: 'Incidencias agrupadas', value: String(alertPayload.occurrences), inline: true },
              { name: 'Impacto en Usuario', value: 'Crédito NO consumido (Protegido)', inline: true },
              {
                name: 'Detalle Técnico',
                value: `\`\`\`${(alertPayload.detail || 'Sin detalle adicional').slice(0, 900)}\`\`\``,
              },
            ],
            footer: {
              text: `Faro Biográfico • Notificación agrupada (${Math.round(getCooldownMs() / 60000)}m cooldown)`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else if (isSlack) {
      bodyPayload = {
        text: `⚠️ *[Faro Biográfico - Alerta de Desarrollador]*\n*Causa:* ${alertPayload.category}\n*Mensaje:* ${alertPayload.message}\n*Modelo:* ${alertPayload.model || 'N/A'}\n*Incidencias agrupadas:* ${alertPayload.occurrences}\n*Impacto:* Crédito de usuario preservado.\n\`\`\`${(alertPayload.detail || '').slice(0, 500)}\`\`\``,
      };
    } else {
      bodyPayload = {
        source: 'faro-biografico',
        event: 'AI_SYNTHESIS_ERROR',
        ...alertPayload,
        timestamp: new Date().toISOString(),
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
  } catch (err) {
    console.warn('[ErrorLogger] No se pudo despachar el webhook al desarrollador:', err?.message || err);
  }
}

/**
 * Guarda el error en la base de datos Supabase si la tabla `error_logs` está disponible.
 * No arroja excepciones para evitar interferir con el flujo principal.
 * @param {Object} alertPayload
 */
async function persistErrorInDatabase(alertPayload) {
  try {
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase
      .from('error_logs')
      .insert([
        {
          category: alertPayload.category,
          message: alertPayload.message,
          model: alertPayload.model || null,
          occurrences: alertPayload.occurrences,
          detail: alertPayload.detail ? String(alertPayload.detail).slice(0, 2000) : null,
          context: alertPayload.context || null,
          created_at: new Date().toISOString(),
        },
      ])
      .throwOnError();
  } catch {
    // Si la tabla no existe o Supabase no está configurado, ignoramos silenciosamente
  }
}

/**
 * Registra y despacha una alerta al desarrollador con deduplicación y tasa límite.
 *
 * Si un error de la misma causa ya fue alertado recientemente dentro de la ventana de enfriamiento
 * (ej. 15 min), la alerta repetitiva se silencia pero se incrementa el contador de incidencias.
 * Cuando la ventana expira o se produce una causa diferente, se despacha la alerta con el acumulado.
 *
 * @param {Object} params
 * @param {string} [params.category] - Categoría del error (ej. GEMINI_TIMEOUT). Si se omite, se deduce del error.
 * @param {Error|string} params.error - Error o mensaje original.
 * @param {string} [params.model] - Modelo involucrado (ej. 'gemini-3.8-flash').
 * @param {string} [params.customMessage] - Mensaje explicativo para el desarrollador.
 * @param {Object} [params.context] - Datos adicionales útiles para depurar (sin contraseñas ni datos sensibles).
 * @returns {Promise<{alertSent: boolean, suppressed: boolean, occurrences: number, signature: string}>}
 */
export async function reportDeveloperError({
  category,
  error,
  model = null,
  customMessage = null,
  context = null,
}) {
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Error desconocido';
  const resolvedCategory = category || classifyErrorCategory(error, customMessage || '');
  const signature = `${resolvedCategory}:${model || 'default'}`;
  const now = Date.now();
  const cooldownMs = getCooldownMs();

  let record = errorRegistry.get(signature);

  if (!record) {
    record = {
      signature,
      category: resolvedCategory,
      message: customMessage || errorMessage,
      model,
      firstSeen: now,
      lastSeen: now,
      lastAlertedAt: 0,
      occurrences: 0,
      lastContext: context,
    };
    errorRegistry.set(signature, record);
  }

  record.lastSeen = now;
  record.occurrences += 1;
  record.lastContext = context;

  const timeSinceLastAlert = now - record.lastAlertedAt;
  const isCooldownActive = record.lastAlertedAt > 0 && timeSinceLastAlert < cooldownMs;

  if (isCooldownActive) {
    const remainingMin = Math.ceil((cooldownMs - timeSinceLastAlert) / 60000);
    console.info(
      `[ErrorLogger][Silenciado Anti-Saturación] Causa "${signature}" repetida x${record.occurrences}. Alerta al desarrollador en espera por ${remainingMin}m.`
    );
    return {
      alertSent: false,
      suppressed: true,
      occurrences: record.occurrences,
      signature,
    };
  }

  // Se envía la alerta (primera vez o ventana de enfriamiento cumplida)
  record.lastAlertedAt = now;
  const currentOccurrences = record.occurrences;
  // Reiniciamos el contador de acumulados para el siguiente ciclo
  record.occurrences = 1;

  const alertPayload = {
    category: resolvedCategory,
    message: customMessage || errorMessage,
    model: model || 'N/A',
    occurrences: currentOccurrences,
    detail: typeof error === 'object' && error?.stack ? error.stack : errorMessage,
    context,
    timestamp: new Date().toISOString(),
  };

  // 1. Log estructurado y llamativo en consola de servidor
  console.error('\n' + '='.repeat(70));
  console.error(`🚨 [ALERTA DESARROLLADOR - FARO BIOGRÁFICO] Incidencia en Generación IA`);
  console.error(`   Causa / Categoría:    ${alertPayload.category}`);
  console.error(`   Modelo de IA:         ${alertPayload.model}`);
  console.error(`   Mensaje:              ${alertPayload.message}`);
  console.error(`   Incidencias previas:  ${currentOccurrences} (agrupadas durante la ventana de ${Math.round(cooldownMs / 60000)}m)`);
  console.error(`   Protección Usuario:   ✅ Crédito NO consumido (reembolsado / saldo intacto)`);
  if (alertPayload.detail) {
    console.error(`   Detalle:              ${String(alertPayload.detail).slice(0, 300)}...`);
  }
  console.error('='.repeat(70) + '\n');

  // 2. Despacho no bloqueante a webhook externo si está configurado
  dispatchWebhookNotification(alertPayload).catch(() => {});

  // 3. Persistencia en base de datos si existe tabla
  persistErrorInDatabase(alertPayload).catch(() => {});

  return {
    alertSent: true,
    suppressed: false,
    occurrences: currentOccurrences,
    signature,
  };
}

/**
 * Retorna la lista activa de errores agrupados para paneles o diagnóstico del desarrollador.
 * @returns {Array<ErrorRecord>}
 */
export function getDeveloperErrorRegistry() {
  return Array.from(errorRegistry.values());
}

/**
 * Limpia el registro en memoria de incidencias (útil para pruebas o reinicio manual).
 */
export function clearDeveloperErrorRegistry() {
  errorRegistry.clear();
}

export default {
  classifyErrorCategory,
  reportDeveloperError,
  getDeveloperErrorRegistry,
  clearDeveloperErrorRegistry,
};
