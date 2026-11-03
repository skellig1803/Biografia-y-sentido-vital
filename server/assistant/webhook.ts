/**
 * @file webhook.ts
 * @description Router Express para el webhook de Google Assistant (Actions on Google).
 * Recibe las solicitudes POST del fulfillment, las enruta al manejador de intent
 * correspondiente y devuelve la respuesta en formato JSON de Google Actions.
 */

import express from 'express';
import { getSupabase } from '../../lib/db.js';
import {
  AssistantRequest,
  handleWelcomeIntent,
  handleDailyReadingIntent,
  handleSubscriptionInfoIntent,
  handleCancelIntent,
  handleUnknownIntent,
} from './intentHandlers.js';

// ---------------------------------------------------------------------------
// Factory del router
// ---------------------------------------------------------------------------

/**
 * Crea y devuelve el router de Express para el webhook de Google Assistant.
 * Montar en: `/api/assistant/webhook`
 */
export function createAssistantRouter(): express.Router {
  const router = express.Router();

  /**
   * POST /
   * Punto de entrada único del fulfillment de Google Actions.
   */
  router.post('/', async (req, res) => {
    try {
      // -----------------------------------------------------------------------
      // 1. Verificación opcional de secreto compartido
      // -----------------------------------------------------------------------
      const webhookSecret = process.env.ASSISTANT_WEBHOOK_SECRET;
      if (webhookSecret) {
        const incomingSecret = req.headers['x-assistant-secret'];
        if (incomingSecret !== webhookSecret) {
          console.warn('[Assistant Webhook] Secreto de webhook inválido o ausente.');
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      // -----------------------------------------------------------------------
      // 2. Parsear la solicitud de Google Actions
      // -----------------------------------------------------------------------
      const body = req.body;
      const intent: string =
        body?.handler?.name || body?.intent?.name || 'welcome';
      const sessionId: string = body?.session?.id || 'unknown';
      const googleUserId: string | undefined =
        body?.user?.params?.userId || body?.user?.userId;
      const userEmail: string | undefined =
        body?.user?.params?.email || body?.session?.params?.email;

      const assistantRequest: AssistantRequest = {
        intent,
        sessionId,
        userId: googleUserId,
        userEmail,
        payload: body,
      };

      // -----------------------------------------------------------------------
      // 3. Enrutar al handler de intent correspondiente
      // -----------------------------------------------------------------------
      let result;

      switch (intent) {
        case 'welcome':
        case 'WELCOME':
        case 'actions.intent.MAIN':
          result = await handleWelcomeIntent(assistantRequest);
          break;

        case 'daily_reading':
        case 'get_daily_reading':
          result = await handleDailyReadingIntent(assistantRequest);
          break;

        case 'subscription_info':
        case 'get_subscription_info':
          result = await handleSubscriptionInfoIntent(assistantRequest);
          break;

        case 'cancel':
        case 'CANCEL':
        case 'actions.intent.CANCEL':
          result = await handleCancelIntent(assistantRequest);
          break;

        default:
          result = await handleUnknownIntent(assistantRequest);
      }

      // -----------------------------------------------------------------------
      // 4. Construir la respuesta en formato Google Actions JSON
      // -----------------------------------------------------------------------
      const response: Record<string, unknown> = {
        session: { id: sessionId, params: {} },
        prompt: {
          override: false,
          firstSimple: { speech: result.speech, text: result.text },
        },
      };

      // Adjuntar objeto media si el handler devolvió una URL de audio
      if (result.audioUrl) {
        (response.prompt as any).media = {
          mediaObjects: [
            {
              name: 'Tu Faro Biográfico Diario',
              description: 'Lectura astrológica personalizada',
              url: result.audioUrl,
              image: {
                large: {
                  url: `${process.env.APP_URL || 'https://farobiografico.com'}/logo.png`,
                  alt: 'Faro Biográfico',
                },
              },
            },
          ],
          mediaType: 'AUDIO',
        };
      }

      // Finalizar la conversación si el handler lo indica
      if (result.endConversation) {
        response.scene = { next: { name: 'actions.scene.END_CONVERSATION' } };
      }

      // -----------------------------------------------------------------------
      // 5. Registrar la sesión en la tabla assistant_sessions (fire-and-forget)
      // -----------------------------------------------------------------------
      getSupabase()
        .from('assistant_sessions')
        .insert({
          session_id: sessionId,
          user_id: googleUserId || null,
          user_email: userEmail || null,
          intent,
          end_conversation: result.endConversation,
          has_audio: Boolean(result.audioUrl),
          created_at: new Date().toISOString(),
        })
        .then(({ error: dbErr }) => {
          if (dbErr) {
            console.warn('[Assistant Webhook] Error al registrar sesión en BD:', dbErr.message);
          }
        });

      // -----------------------------------------------------------------------
      // 6. Devolver respuesta
      // -----------------------------------------------------------------------
      return res.json(response);
    } catch (err: any) {
      console.error('[Assistant Webhook] Error inesperado:', err?.message || err);

      // Respuesta mínima de error compatible con Google Actions
      return res.status(500).json({
        session: { id: 'error', params: {} },
        prompt: {
          override: false,
          firstSimple: {
            speech:
              '<speak>Lo siento, hubo un error interno. Por favor intenta nuevamente más tarde.</speak>',
            text: 'Error interno. Por favor intenta nuevamente.',
          },
        },
      });
    }
  });

  return router;
}
