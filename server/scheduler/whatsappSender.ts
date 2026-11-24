/**
 * @file whatsappSender.ts
 * @description Módulo opcional para enviar la nota de voz diaria (o enlace seguro)
 * al número de WhatsApp del suscriptor usando Meta WhatsApp Cloud API.
 * Si WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID no están configurados,
 * omite el envío silenciosamente dejando el audio disponible en daily_audio_cache.
 */

export interface WhatsAppSendResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  messageId?: string;
}

/**
 * Normaliza un número de teléfono al formato E.164 sin '+' requerido por Meta Cloud API.
 */
function normalizeWhatsAppPhone(phone: string): string {
  return String(phone || '').replace(/[^\d]/g, '');
}

/**
 * Envía el audio diario por WhatsApp Cloud API.
 * 1. Si hay URL firmada o pública disponible, intenta enviar un mensaje con enlace
 *    o audio directo a través de Meta Graph API.
 */
export async function sendDailyWhatsAppAudio(params: {
  toPhone?: string | null;
  userName: string;
  fecha: string;
  audioUrl: string;
  scriptText: string;
}): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return {
      sent: false,
      skipped: true,
      reason: 'WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados.',
    };
  }

  const recipient = normalizeWhatsAppPhone(params.toPhone || '');
  if (!recipient || recipient.length < 8) {
    return {
      sent: false,
      skipped: true,
      reason: 'El usuario no tiene un número de WhatsApp válido registrado.',
    };
  }

  const graphVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
  const endpoint = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const templateLang = process.env.WHATSAPP_TEMPLATE_LANG?.trim() || 'es';
  const forceTemplate = process.env.WHATSAPP_FORCE_TEMPLATE === 'true';

  async function sendTemplateMessage(): Promise<WhatsAppSendResult> {
    if (!templateName) {
      return {
        sent: false,
        reason: 'Meta rechazó el texto libre fuera de la ventana de 24h y no hay WHATSAPP_TEMPLATE_NAME configurado.',
      };
    }

    const useNoParams =
      templateName === 'hello_world' || process.env.WHATSAPP_TEMPLATE_HAS_PARAMS === 'false';

    const payload: any = {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateName === 'hello_world' ? 'en_US' : templateLang },
      },
    };

    if (!useNoParams) {
      payload.template.components = [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: params.userName || 'Viajero' },
            { type: 'text', text: params.fecha },
            { type: 'text', text: params.scriptText.slice(0, 900) },
            { type: 'text', text: params.audioUrl || 'https://www.farobiografico.com' },
          ],
        },
      ];
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        sent: false,
        reason: `Meta WhatsApp Template HTTP ${res.status}: ${errText}`,
      };
    }

    const data: any = await res.json();
    return {
      sent: true,
      messageId: data?.messages?.[0]?.id,
    };
  }

  try {
    if (forceTemplate && templateName) {
      return await sendTemplateMessage();
    }

    // Enviar mensaje con la síntesis matutina y el enlace directo al audio
    const bodyText =
      `☀️ *Faro Biográfico — ${params.fecha}*\n\n` +
      `${params.scriptText}\n\n` +
      `🎧 Escucha tu audio personalizado de hoy:\n${params.audioUrl}\n\n` +
      `_Para actualizar tu hora natal o número, escríbenos o ingresa a "Mi Perfil" en farobiografico.com_`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: {
          preview_url: true,
          body: bodyText,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      // Si la ventana de 24h expiró (código 131047) y hay plantilla configurada, reintentar con plantilla
      if (templateName && (errText.includes('131047') || errText.toLowerCase().includes('re-engagement'))) {
        return await sendTemplateMessage();
      }
      return {
        sent: false,
        reason: `Meta WhatsApp API HTTP ${response.status}: ${errText}`,
      };
    }

    const data: any = await response.json();
    const messageId = data?.messages?.[0]?.id;
    return {
      sent: true,
      messageId,
    };
  } catch (err: any) {
    return {
      sent: false,
      reason: err?.message || String(err),
    };
  }
}
