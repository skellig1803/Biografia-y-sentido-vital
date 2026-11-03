/**
 * @file intentHandlers.ts
 * @description Manejadores de intenciones para la integración con Google Assistant (Actions on Google).
 * Cada función exportada corresponde a un intent registrado en el proyecto de Google Actions.
 */

import { getSupabase } from '../../lib/db.js';
import { getDailyAudio } from '../../lib/dailyAudioCache.js';
import { getSignedAudioUrl } from '../scheduler/audioStorage.js';

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Datos normalizados que llegan desde el webhook de Google Assistant. */
export interface AssistantRequest {
  intent: string;
  sessionId: string;
  userId?: string;
  userEmail?: string;
  payload?: Record<string, unknown>;
}

/** Respuesta que el webhook devolverá a Google Assistant. */
export interface AssistantResponse {
  speech: string;
  text: string;
  endConversation: boolean;
  audioUrl?: string;
}

// ---------------------------------------------------------------------------
// Handlers de intents
// ---------------------------------------------------------------------------

/**
 * Maneja el intent de bienvenida.
 * Saluda al usuario y le pregunta si desea escuchar su lectura del día.
 */
export async function handleWelcomeIntent(
  _req: AssistantRequest,
): Promise<AssistantResponse> {
  return {
    speech:
      "<speak>Bienvenido a tu Faro Biográfico. Soy tu guía astrológico personal. <break time='1s'/> ¿Deseas escuchar tu lectura biográfica del día de hoy?</speak>",
    text: 'Bienvenido a tu Faro Biográfico. ¿Deseas escuchar tu lectura del día?',
    endConversation: false,
  };
}

/**
 * Maneja el intent de lectura diaria.
 * Verifica la suscripción activa del usuario y devuelve la URL del audio generado
 * o mensajes explicativos según el estado del proceso de generación.
 */
export async function handleDailyReadingIntent(
  req: AssistantRequest,
): Promise<AssistantResponse> {
  // El email es necesario para vincular la cuenta de Google con la cuenta de usuario
  if (!req.userEmail) {
    return {
      speech:
        '<speak>Para escuchar tu lectura personalizada, primero debes vincular tu cuenta de Faro Biográfico con Google Assistant desde la aplicación.</speak>',
      text: 'Debes vincular tu cuenta de Faro Biográfico para acceder a tu lectura diaria.',
      endConversation: false,
    };
  }

  // Consultar si el usuario tiene suscripción activa
  const { data: user, error } = await getSupabase()
    .from('users')
    .select('*')
    .eq('email', req.userEmail)
    .eq('suscripcion_activa', true)
    .single();

  if (error || !user) {
    const appUrl = process.env.APP_URL || 'https://farobiografico.com';
    return {
      speech: `<speak>No encontré una suscripción activa vinculada a tu cuenta. Visita ${appUrl} para activar tu plan Faro Diario y comenzar a recibir tus lecturas personalizadas.</speak>`,
      text: `No tienes una suscripción activa. Visita ${appUrl} para activar tu plan.`,
      endConversation: false,
    };
  }

  // Obtener la fecha de hoy en la zona horaria del usuario (o UTC si no está configurada)
  const userTimezone: string = (user as any).timezone || 'UTC';
  const todayDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replace(/\//g, '-'); // Garantiza formato YYYY-MM-DD

  // Consultar el estado del audio diario
  const audioEntry = await getDailyAudio(user.id, todayDate);

  if (audioEntry && audioEntry.status === 'ready') {
    // Audio listo: obtener URL firmada y devolverla
    const audioUrl = await getSignedAudioUrl(user.id, todayDate);
    return {
      speech:
        '<speak>Aquí está tu Faro Biográfico del día. Escucha con atención tu guía astrológica personalizada.</speak>',
      text: 'Tu lectura biográfica del día está lista. Escucha a continuación.',
      endConversation: false,
      audioUrl: audioUrl ?? undefined,
    };
  }

  if (audioEntry && audioEntry.status === 'generating') {
    return {
      speech:
        '<speak>Tu lectura está siendo preparada en este momento. Por favor intenta nuevamente en unos minutos.</speak>',
      text: 'Tu lectura está siendo preparada. Por favor intenta en unos minutos.',
      endConversation: false,
    };
  }

  // Sin entrada o en estado de error
  return {
    speech:
      '<speak>Tu lectura del día estará disponible a partir de la 1 de la madrugada de tu zona horaria. Por favor intenta más tarde.</speak>',
    text: 'Tu lectura estará disponible a partir de la 1:00 AM de tu zona horaria.',
    endConversation: false,
  };
}

/**
 * Maneja el intent de información sobre la suscripción.
 * Describe el plan Faro Diario y proporciona el enlace de contratación.
 */
export async function handleSubscriptionInfoIntent(
  _req: AssistantRequest,
): Promise<AssistantResponse> {
  const appUrl = process.env.APP_URL || 'https://farobiografico.com';
  return {
    speech: `<speak>El plan Faro Diario te ofrece una cápsula de audio personalizada cada mañana con tu guía astrológica del día, incluyendo tránsitos, septenio activo y nodo lunar. El costo es de <say-as interpret-as="currency" language="es-MX">7.99 USD</say-as> al mes. Puedes suscribirte en ${appUrl}.</speak>`,
    text: `El plan Faro Diario cuesta $7.99/mes e incluye tu audio matutino personalizado. Suscríbete en ${appUrl}.`,
    endConversation: false,
  };
}

/**
 * Maneja el intent de cancelación / despedida.
 * Cierra la conversación con un mensaje cálido.
 */
export async function handleCancelIntent(
  _req: AssistantRequest,
): Promise<AssistantResponse> {
  return {
    speech:
      '<speak>Hasta pronto. Que tu día esté guiado por la luz de tu Faro Biográfico.</speak>',
    text: 'Hasta pronto. Que tu día esté lleno de claridad y propósito.',
    endConversation: true,
  };
}

/**
 * Manejador por defecto para intents no reconocidos.
 * Redirige al usuario hacia la bienvenida.
 */
export async function handleUnknownIntent(
  _req: AssistantRequest,
): Promise<AssistantResponse> {
  return {
    speech:
      '<speak>Lo siento, no entendí tu solicitud. Puedes pedirme que te lea tu Faro del día o consultar información sobre tu suscripción.</speak>',
    text: 'No entendí tu solicitud. Puedes pedirme tu lectura del día o información sobre suscripción.',
    endConversation: false,
  };
}
