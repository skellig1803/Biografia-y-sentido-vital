import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { computeSwissEphemerisChart } from './swissEphemeris.js';
import { generateGuaranteedCompleteSynthesis } from './comprehensiveSynthesisFallback.js';
import {
  generateSynthesisReading,
  getResolvedApiKey,
  getResolvedDeepSeekApiKey,
} from './synthesisEngine.js';
import { reportDeveloperError, getDeveloperErrorRegistry } from '../lib/errorLogger.js';
import { analyzeBiographicalSeptenios } from '../lib/gemini.js';
import { analyzeBiographicalSeptenios as analyzeBiographicalSepteniosDeepSeek } from '../lib/deepseek.js';
import {
  upsertBiografia,
  getUserById,
  getUserByEmail,
  createUser,
  upsertUserProfile,
  getUserByEmailOrWhatsApp,
  addUserCredits,
  consumeUserCredit,
  getSupabaseConfigDiagnostic,
} from '../lib/db.js';
import {
  upsertSubscription,
  cancelSubscription,
  checkAndSyncSubscriptionStatus,
} from '../lib/subscriptions.js';
import { getDailyAudio } from '../lib/dailyAudioCache.js';
import { createAssistantRouter } from './assistant/webhook.js';
import { runDailyAudioGeneration } from './scheduler/dailyAudioScheduler.js';
import { computeDailyTransitsPoint4 } from './scheduler/dailyTransits.js';
import { generateDailyAudio } from './scheduler/audioGenerator.js';
import { getSignedAudioUrl } from './scheduler/audioStorage.js';
import { sendDailyWhatsAppAudio } from './scheduler/whatsappSender.js';

dotenv.config();

const app = express();

function resolvePort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const cliPort = parseInt(process.argv[portArgIndex + 1], 10);
    if (!Number.isNaN(cliPort) && cliPort > 0 && cliPort !== 8080) {
      return cliPort;
    }
  }
  if (process.env.APP_PORT) {
    const p = parseInt(process.env.APP_PORT, 10);
    if (!Number.isNaN(p) && p > 0) return p;
  }
  if (process.env.DEFAULT_APP_PORT) {
    const p = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!Number.isNaN(p) && p > 0) return p;
  }
  if (process.env.PORT && process.env.PORT !== '8080') {
    const p = parseInt(process.env.PORT, 10);
    if (!Number.isNaN(p) && p > 0) return p;
  }
  return 3000;
}

const PORT = resolvePort();

// Prevent express.json from hanging when run inside serverless environments (e.g. Vercel)
// where req.body has already been pre-parsed and the stream ended.
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    (req as any)._body = true;
  }
  next();
});

app.use(express.json({ limit: '5mb' }));

// Middleware to normalize rewritten paths from Vercel Serverless Function proxy
app.use((req, res, next) => {
  try {
    const rawUrl = req.url || '/';
    const parsed = new URL(rawUrl, 'http://localhost');
    const qPath = parsed.searchParams.get('__path') || (req.query?.__path as string | undefined);

    if (qPath) {
      parsed.searchParams.delete('__path');
      const remainingQs = parsed.searchParams.toString();
      const cleanPath = String(Array.isArray(qPath) ? qPath.join('/') : qPath).replace(/^\/+/, '');
      req.url = `/api/${cleanPath}${remainingQs ? `?${remainingQs}` : ''}`;
    } else {
      const matchedPath = (
        req.headers['x-vercel-matched-path'] ||
        req.headers['x-matched-path'] ||
        req.headers['x-forwarded-uri']
      ) as string | undefined;
      if (
        matchedPath &&
        matchedPath.startsWith('/api/') &&
        !matchedPath.startsWith('/api/index') &&
        !matchedPath.startsWith('/api/[')
      ) {
        req.url = matchedPath;
      }
    }
  } catch {}
  next();
});

// Lazy GoogleGenAI client
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

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(getResolvedApiKey()),
    hasDeepSeekKey: Boolean(getResolvedDeepSeekApiKey()),
    providers: {
      paypal: Boolean(
        process.env.PAYPAL_CLIENT_ID ||
        process.env.PAYPAL_CHECKOUT_URL_SINGLE ||
        process.env.PAYPAL_CHECKOUT_URL_PACK5 ||
        process.env.PAYPAL_CHECKOUT_URL_FARO_DIARIO
      ),
      payphone: Boolean(
        process.env.PAYPHONE_TOKEN ||
        process.env.PAYPHONE_URL_SINGLE ||
        process.env.PAYPHONE_URL_PACK5 ||
        process.env.PAYPHONE_URL_FARO_DIARIO
      ),
      polar: Boolean(
        process.env.POLAR_ACCESS_TOKEN ||
        process.env.POLAR_ORGANIZATION_SLUG ||
        process.env.POLAR_CHECKOUT_URL_SINGLE
      ),
    },
    hasPayPal: Boolean(
      process.env.PAYPAL_CLIENT_ID ||
      process.env.PAYPAL_CHECKOUT_URL_SINGLE ||
      process.env.PAYPAL_CHECKOUT_URL_PACK5 ||
      process.env.PAYPAL_CHECKOUT_URL_FARO_DIARIO
    ),
    hasPayphone: Boolean(
      process.env.PAYPHONE_TOKEN ||
      process.env.PAYPHONE_URL_SINGLE ||
      process.env.PAYPHONE_URL_PACK5 ||
      process.env.PAYPHONE_URL_FARO_DIARIO
    ),
    hasWhatsApp: Boolean(
      process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
    ),
    supabase: getSupabaseConfigDiagnostic(),
    paypalMode: process.env.PAYPAL_MODE || 'live',
  });
});

// Billing, Products & Consulting Services Configuration endpoint (PayPal + Payphone)
app.get(['/api/billing/config', '/billing/config'], (req, res) => {
  const hasLivePayPal = Boolean(
    process.env.PAYPAL_CLIENT_ID ||
    process.env.PAYPAL_CHECKOUT_URL_SINGLE ||
    process.env.PAYPAL_CHECKOUT_URL_PACK5 ||
    process.env.PAYPAL_CHECKOUT_URL_FARO_DIARIO
  );

  const hasLivePayphone = Boolean(
    process.env.PAYPHONE_TOKEN ||
    process.env.PAYPHONE_URL_SINGLE ||
    process.env.PAYPHONE_URL_PACK5 ||
    process.env.PAYPHONE_URL_FARO_DIARIO
  );

  res.json({
    primaryProvider: 'paypal',
    secondaryProvider: 'payphone',
    currency: 'USD',
    paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
    paypalMode: process.env.PAYPAL_MODE || 'live',
    hasLivePayPal,
    hasLivePayphone,
    hasLivePolar: Boolean(
      process.env.POLAR_CHECKOUT_URL_SINGLE ||
      process.env.POLAR_CHECKOUT_URL_PACK5 ||
      process.env.POLAR_ACCESS_TOKEN
    ),
    // 1. Paquetes de Créditos para "Faro Biográfico" (Reportes con IA)
    plans: [
      {
        id: 'pack_single',
        name: '1 Reporte de Trayectoria Vital',
        tagline: 'Ideal para autoconocimiento y análisis personal',
        type: 'one_time',
        typeLabel: 'Pago único (One-time purchase)',
        credits: 1,
        price: 3.99,
        netEstimateUsd: 3.49,
        checkoutUrl: process.env.PAYPAL_CHECKOUT_URL_SINGLE || process.env.POLAR_CHECKOUT_URL_SINGLE || null,
        paypalCheckoutUrl: process.env.PAYPAL_CHECKOUT_URL_SINGLE || null,
        payphoneCheckoutUrl: process.env.PAYPHONE_URL_SINGLE || null,
        features: [
          '1 Reporte de Análisis Biográfico completo con IA',
          'Desglose de ejes de crecimiento y potencial evolutivo',
          'Clima del septenio y dinámica de tránsitos temporales',
          'Exportación e impresión en PDF de alta calidad',
        ],
      },
      {
        id: 'pack_family',
        name: 'Pack 5 Reportes de Análisis',
        tagline: 'Más Popular • Para ti y tus vínculos cercanos',
        type: 'one_time',
        typeLabel: 'Pago único (One-time purchase)',
        credits: 5,
        price: 14.99,
        unitPriceUsd: 2.99,
        netEstimateUsd: 14.10,
        popular: true,
        savingsPercent: 25,
        checkoutUrl: process.env.PAYPAL_CHECKOUT_URL_PACK5 || process.env.POLAR_CHECKOUT_URL_PACK5 || null,
        paypalCheckoutUrl: process.env.PAYPAL_CHECKOUT_URL_PACK5 || null,
        payphoneCheckoutUrl: process.env.PAYPHONE_URL_PACK5 || null,
        features: [
          '5 Créditos sin fecha de caducidad',
          'Equivale a solo $2.99 USD por reporte (Ahorro 25%)',
          'Comparativa de ciclos vitales y tránsitos',
          'Soporte de cálculo y procesamiento prioritario',
        ],
      },
      {
        id: 'pack_professional',
        name: 'Pack Profesional (15 Reportes)',
        tagline: 'Para facilitadores, biógrafos y consultores',
        type: 'one_time',
        typeLabel: 'Pago único (One-time purchase)',
        credits: 15,
        price: 29.99,
        unitPriceUsd: 1.99,
        netEstimateUsd: 28.50,
        savingsPercent: 50,
        checkoutUrl: process.env.PAYPAL_CHECKOUT_URL_PACK15 || process.env.POLAR_CHECKOUT_URL_PACK15 || null,
        paypalCheckoutUrl: process.env.PAYPAL_CHECKOUT_URL_PACK15 || null,
        payphoneCheckoutUrl: process.env.PAYPHONE_URL_PACK15 || null,
        features: [
          '15 Créditos sin caducidad temporal',
          'Equivale a solo $1.99 USD por reporte (Ahorro 50%)',
          'Licencia de uso para consultoría de desarrollo',
          'Informes y comparativas para mentorías profesionales',
        ],
      },
    ],
    // 2. Servicios Continuos y Consultoría
    services: [
      {
        id: 'service_faro_diario',
        name: 'Faro Diario - Suscripción Audio WhatsApp & Web',
        tagline: 'Audio de sincronización vital matutino generado con IA',
        type: 'subscription',
        typeLabel: 'Suscripción Mensual',
        price: 7.99,
        billingInterval: 'mes',
        netEstimateUsd: 7.35,
        checkoutUrl: process.env.PAYPAL_CHECKOUT_URL_FARO_DIARIO || process.env.POLAR_CHECKOUT_URL_FARO_DIARIO || null,
        paypalCheckoutUrl: process.env.PAYPAL_CHECKOUT_URL_FARO_DIARIO || null,
        payphoneCheckoutUrl: process.env.PAYPHONE_URL_FARO_DIARIO || null,
        paypalPlanId: process.env.PAYPAL_PLAN_ID_FARO_DIARIO || null,
        deliverable: 'Nota de voz matutina en WhatsApp y reproductor web privado (Nodo Lunar + Septenio + Nodo Anual + Tránsitos del día)',
        features: [
          'Nota de voz matutina personalizada generada cada día con IA',
          'Síntesis activa: Nodo Lunar + Septenio + Nodo Anual + Tránsitos diarios',
          'Entrega matutina directa a tu WhatsApp y reproductor web',
          'Suscripción mensual recurrente vía PayPal ($7.99/mes) o Payphone Ecuador',
        ],
      },
      {
        id: 'service_rectificacion',
        name: 'Rectificación Biográfica de Carta Natal (Artesanal)',
        tagline: 'Auditoría astronómica y verificación biográfica manual',
        type: 'one_time',
        typeLabel: 'Pago único (One-time purchase)',
        price: 80.00,
        netEstimateUsd: 76.50,
        deliverable: 'Entrega en 3 días laborables mediante revisión manual con atacires y formulario estructurado',
        checkoutUrl: process.env.PAYPAL_CHECKOUT_URL_RECTIFICACION || process.env.POLAR_CHECKOUT_URL_RECTIFICACION || null,
        paypalCheckoutUrl: process.env.PAYPAL_CHECKOUT_URL_RECTIFICACION || null,
        payphoneCheckoutUrl: process.env.PAYPHONE_URL_RECTIFICACION || null,
        features: [
          'Revisión manual minuciosa y artesanal con técnica de atacires',
          'Formulario estructurado de eventos vitales e hitos pasados',
          'Ajuste y determinación exacta al minuto/segundo de nacimiento',
          'Entrega en 3 días laborables con informe y efemérides corregidas',
        ],
      },
      {
        id: 'service_consultas',
        name: 'Consultas Privadas Individuales',
        tagline: 'Sesión personalizada 1 a 1 de orientación y desarrollo',
        type: 'custom',
        typeLabel: 'Tarifa acordada / Contacto directo WhatsApp',
        price: null,
        deliverable: 'Coordinación directa por WhatsApp (+593 99 942 9478) para agendar tu sesión personalizada',
        checkoutUrl: null,
        paypalCheckoutUrl: null,
        payphoneCheckoutUrl: null,
        calendarUrl: 'https://wa.me/593999429478?text=Hola%2C%20me%20gustar%C3%ADa%20coordinar%20una%20Consulta%20Privada%20Individual%20de%20Biograf%C3%ADa%20Vital.',
        features: [
          'Sesión individual personalizada 1 a 1 (60 - 90 min)',
          'Profundización en septenios, crisis evolutivas y dirección vocacional',
          'Contacto directo vía WhatsApp (+593 99 942 9478)',
          'Horarios flexibles y atención personalizada',
        ],
      },
    ],
  });
});

// Helpers de sesión firmada para proteger perfiles de usuario y créditos
function getProfileTokenSecret(): string {
  return (
    process.env.PROFILE_TOKEN_SECRET ||
    process.env.SCHEDULER_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'faro-biografico-session-signing-key'
  );
}

function signProfileToken(userId: string, email: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      uid: userId,
      email: email.toLowerCase(),
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 días
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getProfileTokenSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyProfileToken(token?: string | null): { userId: string; email: string } | null {
  if (!token || typeof token !== 'string') return null;
  const clean = token.replace(/^Bearer\s+/i, '').trim();
  const parts = clean.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getProfileTokenSecret())
    .update(payload)
    .digest('base64url');
  try {
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded?.uid || !decoded?.email || (decoded.exp && Date.now() > decoded.exp)) {
      return null;
    }
    return { userId: String(decoded.uid), email: String(decoded.email).toLowerCase() };
  } catch {
    return null;
  }
}

function extractRequestProfileToken(req: express.Request): { userId: string; email: string } | null {
  const authHeader = (req.headers['authorization'] || req.headers['x-profile-token']) as string | undefined;
  return verifyProfileToken(authHeader);
}

function resolveCreditsForOrder(eventData: any): number {
  const productId = String(eventData?.product_id || eventData?.product?.id || '').trim();
  const productName = String(eventData?.product?.name || eventData?.product_name || '').toLowerCase();
  const amountCents = Number(eventData?.amount ?? eventData?.total_amount ?? 0);

  if (process.env.POLAR_PRODUCT_ID_PACK15 && productId === process.env.POLAR_PRODUCT_ID_PACK15) return 15;
  if (process.env.POLAR_PRODUCT_ID_PACK5 && productId === process.env.POLAR_PRODUCT_ID_PACK5) return 5;
  if (process.env.POLAR_PRODUCT_ID_PACK1 && productId === process.env.POLAR_PRODUCT_ID_PACK1) return 1;

  if (productName.includes('15') || productName.includes('profesional')) return 15;
  if (productName.includes('5') || productName.includes('pack 5') || productName.includes('familiar')) return 5;
  if (productName.includes('1 reporte') || productName.includes('trayectoria')) return 1;

  // Respaldo por monto en centavos USD ($29.99 / $14.99 / $3.99)
  if (amountCents >= 2500 && amountCents < 5000) return 15;
  if (amountCents >= 1200 && amountCents < 2500) return 5;
  if (amountCents >= 300 && amountCents < 700) return 1;
  return 0;
}

// ========================================================
// PAYPAL BUSINESS INTEGRATION (API & WEBHOOKS)
// ========================================================
function getPayPalApiBase(): string {
  const mode = (process.env.PAYPAL_MODE || 'live').toLowerCase();
  return mode === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[PayPal Auth] Error obtaining access token:', errText);
      return null;
    }
    const data = (await res.json()) as any;
    return data.access_token || null;
  } catch (err) {
    console.error('[PayPal Auth] Network error obtaining token:', err);
    return null;
  }
}

// Crear orden de cobro en PayPal (para paquetes de créditos o servicios únicos)
app.post(['/api/paypal/create-order', '/paypal/create-order'], async (req, res) => {
  try {
    const { planId, serviceId, email } = req.body || {};
    const accessToken = await getPayPalAccessToken();
    if (!accessToken) {
      return res.status(503).json({
        success: false,
        error: 'Las credenciales de PayPal (PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET) no están configuradas en el servidor.',
      });
    }

    let value = '3.99';
    let description = '1 Reporte de Trayectoria Vital';
    if (planId === 'pack_professional' || planId === 'pack15') {
      value = '29.99';
      description = 'Pack Profesional (15 Reportes Biográficos)';
    } else if (planId === 'pack_family' || planId === 'pack5') {
      value = '14.99';
      description = 'Pack 5 Reportes de Análisis Biográfico';
    } else if (serviceId === 'service_rectificacion') {
      value = '80.00';
      description = 'Rectificación Biográfica de Carta Natal (Artesanal)';
    }

    const appUrl = (process.env.APP_URL || 'https://www.farobiografico.com').replace(/\/+$/, '');
    const returnUrl = `${appUrl}/?payment=success&provider=paypal&plan=${planId || ''}&service=${serviceId || ''}`;
    const cancelUrl = `${appUrl}/?payment=cancelled&provider=paypal`;

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: `faro_${Date.now()}`,
          description,
          custom_id: email ? String(email).trim().toLowerCase() : undefined,
          amount: {
            currency_code: 'USD',
            value,
          },
        },
      ],
      application_context: {
        brand_name: 'Faro Biográfico',
        locale: 'es-ES',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    };

    const resp = await fetch(`${getPayPalApiBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    const data = (await resp.json()) as any;
    if (!resp.ok) {
      console.error('[PayPal Create Order Error]', data);
      return res.status(resp.status).json({ success: false, error: data.message || 'Error al crear orden en PayPal' });
    }

    const approvalUrl = data.links?.find((l: any) => l.rel === 'approve')?.href;
    return res.json({
      success: true,
      orderId: data.id,
      approvalUrl,
    });
  } catch (err: any) {
    console.error('Error creating PayPal order:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error interno en PayPal' });
  }
});

// Capturar orden aprobada en PayPal y acreditar créditos
app.post(['/api/paypal/capture-order', '/paypal/capture-order'], async (req, res) => {
  try {
    const { orderId, planId, email } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId es requerido' });
    }

    const accessToken = await getPayPalAccessToken();
    if (!accessToken) {
      return res.status(503).json({ success: false, error: 'Credenciales de PayPal no configuradas' });
    }

    const resp = await fetch(`${getPayPalApiBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = (await resp.json()) as any;
    if (!resp.ok || captureData.status !== 'COMPLETED') {
      console.error('[PayPal Capture Error]', captureData);
      return res.status(resp.status || 400).json({
        success: false,
        error: captureData?.message || 'No se pudo completar el cobro en PayPal.',
      });
    }

    const payerEmail = (
      email ||
      captureData.payer?.email_address ||
      captureData.purchase_units?.[0]?.custom_id ||
      ''
    )
      .trim()
      .toLowerCase();

    let creditsAdded = 0;
    if (planId === 'pack_professional' || planId === 'pack15') creditsAdded = 15;
    else if (planId === 'pack_family' || planId === 'pack5') creditsAdded = 5;
    else if (planId === 'pack_single' || planId === 'single') creditsAdded = 1;
    else {
      const amountVal = parseFloat(captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || '0');
      if (amountVal >= 25) creditsAdded = 15;
      else if (amountVal >= 10) creditsAdded = 5;
      else if (amountVal >= 3) creditsAdded = 1;
    }

    let newBalance: number | undefined;
    if (payerEmail && creditsAdded > 0) {
      try {
        let user = await getUserByEmail(payerEmail);
        if (!user) {
          user = await createUser({
            email: payerEmail,
            nombre: captureData.payer?.name?.given_name || payerEmail.split('@')[0],
            fecha_nacimiento: '1990-01-01',
            suscripcion_activa: false,
          });
        }
        if (user) {
          newBalance = await addUserCredits(user.id, creditsAdded);
          console.log(`[PayPal Capture] +${creditsAdded} créditos acreditados a ${payerEmail}. Balance: ${newBalance}`);
        }
      } catch (dbErr: any) {
        console.warn('[PayPal Capture] Advertencia al sincronizar en Supabase:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      status: captureData.status,
      orderId: captureData.id,
      creditsAdded,
      balance: newBalance,
    });
  } catch (err: any) {
    console.error('Error capturing PayPal order:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error capturando orden de PayPal' });
  }
});

// Receptor de Webhooks de PayPal (para suscripciones y pagos completados)
app.post(['/api/paypal/webhook', '/paypal/webhook'], async (req, res) => {
  try {
    const eventType = String(req.body?.event_type || '');
    const resource = req.body?.resource || {};
    console.log(`[PayPal Webhook] Evento recibido: ${eventType}`, { id: resource?.id });

    const customerEmail = String(
      resource?.subscriber?.email_address ||
      resource?.payer?.email_address ||
      resource?.custom_id ||
      ''
    )
      .trim()
      .toLowerCase();

    if (customerEmail) {
      try {
        let user = await getUserByEmail(customerEmail);
        if (!user && (eventType.includes('SUBSCRIPTION') || eventType.includes('PAYMENT'))) {
          user = await createUser({
            email: customerEmail,
            nombre: resource?.subscriber?.name?.given_name || customerEmail.split('@')[0],
            fecha_nacimiento: '1990-01-01',
            suscripcion_activa: false,
          });
        }

        if (user) {
          if (
            eventType === 'BILLING.SUBSCRIPTION.ACTIVATED' ||
            eventType === 'BILLING.SUBSCRIPTION.CREATED' ||
            eventType === 'BILLING.SUBSCRIPTION.RE-ACTIVATED'
          ) {
            const subId = String(resource?.id || `sub_pp_${user.id}`);
            const planId = String(resource?.plan_id || 'faro_diario_mensual');
            const startTime = resource?.start_time || new Date().toISOString();
            const nextBilling =
              resource?.billing_info?.next_billing_time ||
              new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();

            await upsertSubscription({
              userId: user.id,
              subscriptionId: subId,
              planId,
              status: 'active',
              currentPeriodStart: startTime,
              currentPeriodEnd: nextBilling,
            });
            await checkAndSyncSubscriptionStatus(user.id);
            console.log(`[PayPal Webhook] Suscripción activada para ${customerEmail}`);
          } else if (
            eventType === 'BILLING.SUBSCRIPTION.CANCELLED' ||
            eventType === 'BILLING.SUBSCRIPTION.EXPIRED' ||
            eventType === 'BILLING.SUBSCRIPTION.SUSPENDED'
          ) {
            if (resource?.id) {
              await cancelSubscription(String(resource.id));
              console.log(`[PayPal Webhook] Suscripción cancelada: ${resource.id}`);
            }
          } else if (eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'CHECKOUT.ORDER.APPROVED') {
            const amountVal = parseFloat(resource?.amount?.value || '0');
            let credits = 0;
            if (amountVal >= 25) credits = 15;
            else if (amountVal >= 10) credits = 5;
            else if (amountVal >= 3) credits = 1;
            if (credits > 0) {
              await addUserCredits(user.id, credits);
              console.log(`[PayPal Webhook] +${credits} créditos acreditados a ${customerEmail}`);
            }
          }
        }
      } catch (dbErr: any) {
        console.warn('[PayPal Webhook] Error al sincronizar Supabase:', dbErr.message);
      }
    }

    return res.json({ received: true, event: eventType, provider: 'paypal' });
  } catch (err: any) {
    console.error('Error in PayPal webhook:', err);
    return res.status(500).json({ error: 'Error procesando webhook PayPal' });
  }
});

// ========================================================
// PAYPHONE ECUADOR INTEGRATION (API & WEBHOOKS)
// ========================================================

// Crear o preparar transacción en Payphone (vía API o Enlace directo)
app.post(['/api/payphone/create-payment', '/payphone/create-payment'], async (req, res) => {
  try {
    const { planId, serviceId, email, phoneNumber } = req.body || {};
    const token = process.env.PAYPHONE_TOKEN;

    let amountCents = 399; // $3.99 USD
    if (planId === 'pack_professional' || planId === 'pack15') amountCents = 2999;
    else if (planId === 'pack_family' || planId === 'pack5') amountCents = 1499;
    else if (serviceId === 'service_faro_diario') amountCents = 799;
    else if (serviceId === 'service_rectificacion') amountCents = 8000;

    const appUrl = (process.env.APP_URL || 'https://www.farobiografico.com').replace(/\/+$/, '');
    const clientTxId = `TX_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Si hay token de Payphone Developer configurado, invocar Button Prepare API
    if (token) {
      try {
        const cleanPhone = String(phoneNumber || '').replace(/[^\d]/g, '');
        const responseUrl = `${appUrl}/?payment=success&provider=payphone&plan=${planId || ''}&service=${serviceId || ''}`;
        const cancellationUrl = `${appUrl}/?payment=cancelled&provider=payphone`;

        const preparePayload: any = {
          responseUrl,
          cancellationUrl,
          amount: amountCents,
          amountWithoutTax: amountCents,
          amountWithTax: 0,
          tax: 0,
          service: 0,
          tip: 0,
          currency: 'USD',
          clientTransactionId: clientTxId,
          email: email ? String(email).trim().toLowerCase() : undefined,
        };

        if (cleanPhone) {
          preparePayload.phoneNumber = cleanPhone.startsWith('593') ? cleanPhone : `593${cleanPhone.replace(/^0+/, '')}`;
        }

        const payphoneRes = await fetch('https://pay.payphonetodoesposible.com/api/button/Prepare', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(preparePayload),
        });

        const prepData = (await payphoneRes.json()) as any;
        if (payphoneRes.ok && prepData.payWithCard) {
          return res.json({
            success: true,
            mode: 'api',
            paymentId: prepData.paymentId,
            payUrl: prepData.payWithCard,
            clientTransactionId: clientTxId,
          });
        } else {
          console.warn('[Payphone Prepare Fallback]', prepData);
        }
      } catch (apiErr: any) {
        console.warn('[Payphone Prepare Network Error]', apiErr.message);
      }
    }

    // Fallback a enlace directo configurado en variables de entorno
    let directUrl = process.env.PAYPHONE_URL_SINGLE || null;
    if (planId === 'pack_professional' || planId === 'pack15') directUrl = process.env.PAYPHONE_URL_PACK15 || directUrl;
    else if (planId === 'pack_family' || planId === 'pack5') directUrl = process.env.PAYPHONE_URL_PACK5 || directUrl;
    else if (serviceId === 'service_faro_diario') directUrl = process.env.PAYPHONE_URL_FARO_DIARIO || directUrl;
    else if (serviceId === 'service_rectificacion') directUrl = process.env.PAYPHONE_URL_RECTIFICACION || directUrl;

    return res.json({
      success: true,
      mode: 'link',
      payUrl: directUrl,
      clientTransactionId: clientTxId,
    });
  } catch (err: any) {
    console.error('Error creating Payphone payment:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error en Payphone' });
  }
});

// Confirmar transacción de Payphone
app.post(['/api/payphone/confirm', '/payphone/confirm'], async (req, res) => {
  try {
    const { id, clientTransactionId, planId, serviceId, email } = req.body || {};
    const token = process.env.PAYPHONE_TOKEN;

    let isApproved = false;

    if (token && id && clientTransactionId) {
      try {
        const confirmRes = await fetch('https://pay.payphonetodoesposible.com/api/button/Confirm', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: Number(id), clientTxId: String(clientTransactionId) }),
        });

        const confirmData = (await confirmRes.json()) as any;
        if (confirmRes.ok && (confirmData.transactionStatus === 'Approved' || confirmData.statusCode === 3)) {
          isApproved = true;
        } else {
          console.warn('[Payphone Confirm Failed]', confirmData);
        }
      } catch (err: any) {
        console.warn('[Payphone Confirm Error]', err.message);
      }
    } else {
      isApproved = true;
    }

    if (!isApproved) {
      return res.status(400).json({ success: false, error: 'Transacción no aprobada por Payphone' });
    }

    let creditsAdded = 0;
    if (planId === 'pack_professional' || planId === 'pack15') creditsAdded = 15;
    else if (planId === 'pack_family' || planId === 'pack5') creditsAdded = 5;
    else if (planId === 'pack_single' || planId === 'single') creditsAdded = 1;

    const userEmail = String(email || '').trim().toLowerCase();
    let newBalance: number | undefined;

    if (userEmail) {
      try {
        let user = await getUserByEmail(userEmail);
        if (!user) {
          user = await createUser({
            email: userEmail,
            nombre: userEmail.split('@')[0],
            fecha_nacimiento: '1990-01-01',
            suscripcion_activa: false,
          });
        }
        if (user) {
          if (serviceId === 'service_faro_diario' || planId === 'faro_diario') {
            await upsertSubscription({
              userId: user.id,
              subscriptionId: `payphone_${clientTransactionId || id || Date.now()}`,
              planId: 'faro_diario_mensual',
              status: 'active',
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
            });
            await checkAndSyncSubscriptionStatus(user.id);
            console.log(`[Payphone] Suscripción activada para ${userEmail}`);
          } else if (creditsAdded > 0) {
            newBalance = await addUserCredits(user.id, creditsAdded);
            console.log(`[Payphone] +${creditsAdded} créditos acreditados a ${userEmail}`);
          }
        }
      } catch (dbErr: any) {
        console.warn('[Payphone DB sync error]:', dbErr.message);
      }
    }

    return res.json({
      success: true,
      status: 'Approved',
      creditsAdded,
      balance: newBalance,
    });
  } catch (err: any) {
    console.error('Error confirming Payphone payment:', err);
    return res.status(500).json({ success: false, error: err.message || 'Error confirmando Payphone' });
  }
});

// Receptor Webhook de Payphone
app.post(['/api/payphone/webhook', '/payphone/webhook'], async (req, res) => {
  try {
    const { id, clientTxId, clientTransactionId, transactionStatus, email, optionalParameter } = req.body || {};
    console.log('[Payphone Webhook]', { id, clientTxId, transactionStatus });

    if (transactionStatus === 'Approved') {
      const userEmail = String(email || optionalParameter || '').trim().toLowerCase();
      if (userEmail) {
        let user = await getUserByEmail(userEmail);
        if (user) {
          await addUserCredits(user.id, 5); // Fallback créditos
        }
      }
    }

    return res.json({ received: true, provider: 'payphone' });
  } catch (err: any) {
    console.error('Error in Payphone webhook:', err);
    return res.status(500).json({ error: 'Error procesando webhook Payphone' });
  }
});

// Polar.sh Webhook receiver (for order.created, subscription.created, etc.)
app.post(['/api/polar/webhook', '/polar/webhook', '/api/billing/webhook'], async (req, res) => {
  try {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET || process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const signature = (req.headers['webhook-signature'] || req.headers['x-signature'] || req.headers['x-polar-signature']) as string;
    const webhookId = req.headers['webhook-id'] as string;
    const webhookTimestamp = req.headers['webhook-timestamp'] as string;

    if (webhookSecret) {
      if (!signature) {
        return res.status(401).json({ error: 'Firma de webhook ausente' });
      }
      const rawPayload = JSON.stringify(req.body);
      const toSign = webhookId && webhookTimestamp ? `${webhookId}.${webhookTimestamp}.${rawPayload}` : rawPayload;

      // Soportar secreto plano o secreto Standard Webhooks con prefijo whsec_
      const secretCandidates: Array<string | Buffer> = [webhookSecret];
      if (webhookSecret.startsWith('whsec_')) {
        secretCandidates.push(Buffer.from(webhookSecret.slice(6), 'base64'));
      }

      let matches = false;
      for (const secretKey of secretCandidates) {
        const computedHex = crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
        const computedBase64 = crypto.createHmac('sha256', secretKey).update(toSign).digest('base64');
        if (
          signature === computedHex ||
          signature === computedBase64 ||
          signature.includes(computedBase64) ||
          signature.includes(computedHex)
        ) {
          matches = true;
          break;
        }
      }

      if (!matches) {
        console.warn('[Polar Webhook] Firma inválida rechazada.');
        return res.status(401).json({ error: 'Firma de webhook inválida' });
      }
    }

    const eventType = String(req.body?.type || req.body?.event || req.body?.meta?.event_name || 'polar.event');
    const eventData = req.body?.data || req.body;
    const customerEmail = String(
      eventData?.customer?.email || eventData?.customer_email || eventData?.user?.email || ''
    )
      .trim()
      .toLowerCase();

    console.log(`[Polar Webhook] Evento recibido: ${eventType}`, {
      id: eventData?.id,
      customerEmail,
      productId: eventData?.product_id,
      productName: eventData?.product?.name,
    });

    // Sincronización con Supabase si hay correo del cliente y credenciales de DB
    if (customerEmail) {
      try {
        let user = await getUserByEmail(customerEmail);

        // Si el usuario pagó en Polar sin haber guardado su ficha antes, crear registro base para no perder el pago
        if (!user && (eventType.includes('subscription') || eventType.includes('order'))) {
          user = await createUser({
            email: customerEmail,
            nombre: eventData?.customer?.name || customerEmail.split('@')[0],
            fecha_nacimiento: '1990-01-01',
            suscripcion_activa: false,
          });
        }

        if (user) {
          if (
            eventType === 'subscription.created' ||
            eventType === 'subscription.active' ||
            eventType === 'subscription.updated' ||
            eventType === 'subscription.uncanceled'
          ) {
            const subStatusRaw = String(eventData?.status || 'active').toLowerCase();
            const mappedStatus =
              subStatusRaw === 'canceled' || subStatusRaw === 'cancelled'
                ? 'cancelled'
                : subStatusRaw === 'past_due'
                ? 'past_due'
                : subStatusRaw === 'expired' || subStatusRaw === 'revoked'
                ? 'expired'
                : 'active';

            const periodStart = eventData?.current_period_start || new Date().toISOString();
            const periodEnd =
              eventData?.current_period_end ||
              new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();

            await upsertSubscription({
              userId: user.id,
              polarSubscriptionId: String(eventData?.id || `sub_${user.id}`),
              polarOrderId: eventData?.order_id ? String(eventData.order_id) : undefined,
              planId: String(eventData?.product_id || 'faro_diario_mensual'),
              status: mappedStatus,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            });
            await checkAndSyncSubscriptionStatus(user.id);
          } else if (eventType === 'subscription.canceled' || eventType === 'subscription.revoked') {
            if (eventData?.id) {
              await cancelSubscription(String(eventData.id));
            }
          } else if (eventType === 'order.created' || eventType === 'order.paid') {
            const creditsToAdd = resolveCreditsForOrder(eventData);
            if (creditsToAdd > 0) {
              await addUserCredits(user.id, creditsToAdd);
              console.log(`[Polar Webhook] +${creditsToAdd} créditos acreditados en Supabase a ${customerEmail}`);
            }
          }
        }
      } catch (dbErr: any) {
        console.warn('[Polar Webhook] Advertencia al sincronizar evento con Supabase:', dbErr?.message || dbErr);
      }
    }

    return res.json({ received: true, event: eventType, provider: 'polar' });
  } catch (err: any) {
    console.error('Error in Polar webhook:', err);
    return res.status(500).json({ error: 'Error procesando webhook Polar' });
  }
});

// Guardar o actualizar perfil natal del usuario + WhatsApp (protegido contra suplantación)
app.post(['/api/user/profile', '/user/profile'], async (req, res) => {
  try {
    const {
      email,
      nombre,
      name,
      fecha_nacimiento,
      birthDate,
      hora_nacimiento,
      birthTime,
      lugar_nacimiento,
      placeName,
      latitude,
      lat,
      longitude,
      lng,
      timezone,
      ianaTimeZone,
      whatsapp,
      clientCredits,
    } = req.body || {};

    const userEmail = String(email || '').trim().toLowerCase();
    if (!userEmail || !userEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'El correo electrónico es requerido para vincular tu suscripción.' });
    }

    const birthDateVal = String(fecha_nacimiento || birthDate || '').trim().slice(0, 10);
    if (!birthDateVal) {
      return res.status(400).json({ success: false, error: 'La fecha de nacimiento es requerida.' });
    }

    const tokenData = extractRequestProfileToken(req);
    const existing = await getUserByEmail(userEmail);

    if (existing) {
      const hasValidSession = tokenData && tokenData.userId === existing.id;
      const existingBirth = String(existing.fecha_nacimiento || '').slice(0, 10);
      const matchesBirth = existingBirth === birthDateVal || existingBirth === '1990-01-01';

      if (!hasValidSession && !matchesBirth) {
        return res.status(403).json({
          success: false,
          error:
            'Este correo ya tiene una ficha registrada. Recupera tu sesión desde el botón "Mi Perfil" verificando tu fecha de nacimiento actual para poder modificarla.',
        });
      }
    }

    const safeInitialCredits =
      existing
        ? undefined
        : typeof clientCredits === 'number' && clientCredits >= 0 && clientCredits <= 20
        ? Math.floor(clientCredits)
        : 5;

    const saved = await upsertUserProfile({
      email: userEmail,
      nombre: nombre || name || 'Suscriptor',
      fecha_nacimiento: birthDateVal,
      hora_nacimiento: hora_nacimiento || birthTime || '12:00',
      lugar_nacimiento: lugar_nacimiento || placeName || 'Desconocido',
      latitude: typeof latitude === 'number' ? latitude : (lat ? Number(lat) : null),
      longitude: typeof longitude === 'number' ? longitude : (lng ? Number(lng) : null),
      timezone: timezone || ianaTimeZone || 'America/Bogota',
      whatsapp: whatsapp || null,
      credits: safeInitialCredits,
    });

    const profileToken = signProfileToken(saved.id, saved.email);

    return res.json({
      success: true,
      profileToken,
      user: {
        id: saved.id,
        email: saved.email,
        nombre: saved.nombre,
        fecha_nacimiento: saved.fecha_nacimiento,
        hora_nacimiento: saved.hora_nacimiento,
        lugar_nacimiento: saved.lugar_nacimiento,
        latitude: saved.latitude,
        longitude: saved.longitude,
        timezone: saved.timezone,
        whatsapp: saved.whatsapp,
        credits: typeof saved.credits === 'number' ? saved.credits : 5,
        suscripcion_activa: Boolean(saved.suscripcion_activa),
      },
    });
  } catch (error: any) {
    console.error('Error al guardar perfil de usuario:', error);
    const rawMsg = error?.message || 'Error al guardar perfil';
    const friendlyMsg = rawMsg.includes('Invalid path specified in request URL')
      ? 'Error de configuración en SUPABASE_URL en Vercel: asegúrate de que sea únicamente https://TU_PROYECTO.supabase.co (sin rutas adicionales como /rest/v1 o /dashboard).'
      : rawMsg;
    return res.status(500).json({ success: false, error: friendlyMsg });
  }
});

// Recuperar perfil natal del usuario (exige token de sesión o verificación por fecha de nacimiento)
app.get(['/api/user/profile', '/user/profile'], async (req, res) => {
  try {
    const tokenData = extractRequestProfileToken(req);
    const query = (req.query.q || req.query.email || req.query.whatsapp || req.query.identifier) as string;
    const birthDateParam = (req.query.birthDate || req.query.fecha_nacimiento || '') as string;

    let user: any = null;

    if (tokenData) {
      user = await getUserById(tokenData.userId);
    } else {
      if (!query || query.trim().length < 3) {
        return res.status(400).json({ success: false, error: 'Ingresa un correo o número de WhatsApp válido.' });
      }
      if (!birthDateParam || birthDateParam.trim().length < 8) {
        return res.status(400).json({
          success: false,
          requiresVerification: true,
          error: 'Por seguridad, ingresa también tu fecha de nacimiento para verificar tu identidad.',
        });
      }

      user = await getUserByEmailOrWhatsApp(query);
      if (!user) {
        return res.json({ success: true, found: false, message: 'No se encontró un perfil registrado con esos datos.' });
      }

      const storedBirth = String(user.fecha_nacimiento || '').slice(0, 10);
      const providedBirth = birthDateParam.trim().slice(0, 10);
      if (storedBirth !== providedBirth && storedBirth !== '1990-01-01') {
        return res.status(403).json({
          success: false,
          error: 'La fecha de nacimiento no coincide con el perfil registrado. Verifica tus datos o escríbenos por WhatsApp.',
        });
      }
    }

    if (!user) {
      return res.json({ success: true, found: false, message: 'No se encontró un perfil registrado.' });
    }

    const profileToken = signProfileToken(user.id, user.email);

    return res.json({
      success: true,
      found: true,
      profileToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        fecha_nacimiento: user.fecha_nacimiento,
        hora_nacimiento: user.hora_nacimiento,
        lugar_nacimiento: user.lugar_nacimiento,
        latitude: user.latitude,
        longitude: user.longitude,
        timezone: user.timezone,
        whatsapp: user.whatsapp,
        credits: typeof user.credits === 'number' ? user.credits : 5,
        suscripcion_activa: Boolean(user.suscripcion_activa),
      },
    });
  } catch (error: any) {
    console.error('Error al consultar perfil de usuario:', error);
    const rawMsg = error?.message || 'Error al buscar perfil';
    const friendlyMsg = rawMsg.includes('Invalid path specified in request URL')
      ? 'Error de configuración en SUPABASE_URL en Vercel: asegúrate de que sea únicamente https://TU_PROYECTO.supabase.co (sin rutas adicionales).'
      : rawMsg;
    return res.status(500).json({ success: false, error: friendlyMsg });
  }
});

// Sincronizar o consumir créditos persistentes del usuario autenticado por token
app.post(['/api/user/credits/consume', '/user/credits/consume'], async (req, res) => {
  try {
    const tokenData = extractRequestProfileToken(req);
    if (!tokenData) {
      return res.status(401).json({ success: false, error: 'Sesión de perfil no vinculada o expirada.' });
    }

    const result = await consumeUserCredit(tokenData.userId);
    return res.json({
      success: result.success,
      credits: result.credits,
    });
  } catch (error: any) {
    console.error('Error al consumir crédito en Supabase:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al actualizar créditos' });
  }
});

// Obtener el audio matutino más reciente del suscriptor para el reproductor web
app.get(['/api/user/daily-audio', '/user/daily-audio'], async (req, res) => {
  try {
    const tokenData = extractRequestProfileToken(req);
    if (!tokenData) {
      return res.status(401).json({ success: false, error: 'Vincula tu perfil primero para escuchar tu audio diario.' });
    }

    const user = await getUserById(tokenData.userId);
    if (!user || !user.suscripcion_activa) {
      return res.status(403).json({ success: false, error: 'Requiere suscripción activa a Faro Diario.' });
    }

    const targetDate = String(req.query.date || new Date().toISOString().split('T')[0]);
    const cached = await getDailyAudio(user.id, targetDate);
    if (!cached || cached.status !== 'ready') {
      return res.json({ success: true, available: false });
    }

    const signedUrl = (await getSignedAudioUrl(user.id, targetDate)) || cached.audio_url;
    return res.json({
      success: true,
      available: true,
      fecha: cached.fecha,
      audioUrl: signedUrl,
      textoGenerado: cached.texto_generado,
    });
  } catch (error: any) {
    console.error('Error al obtener audio diario del usuario:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error al obtener audio diario' });
  }
});

// Endpoint de prueba instantánea para generar y escuchar el audio diario con los datos del usuario
app.post(['/api/scheduler/test-audio', '/scheduler/test-audio'], async (req, res) => {
  try {
    const { nombre, fecha_nacimiento, hora_nacimiento, lugar_nacimiento, latitude, longitude, timezone } = req.body || {};

    const userForCalc = {
      id: 'test_user',
      nombre: nombre || 'Viajero de la Vida',
      fecha_nacimiento: fecha_nacimiento || '1990-05-15',
      hora_nacimiento: hora_nacimiento || '12:00',
      lugar_nacimiento: lugar_nacimiento || 'Madrid, España',
      latitude: typeof latitude === 'number' ? latitude : 40.4168,
      longitude: typeof longitude === 'number' ? longitude : -3.7038,
      timezone: timezone || 'Europe/Madrid',
    };

    const targetDate = new Date();
    // 1. Calcular tránsitos astronómicos del día con Swiss Ephemeris
    const transits = await computeDailyTransitsPoint4(userForCalc, targetDate);

    // 2. Generar el audio de voz con Gemini TTS
    const { audioBuffer, textoGenerado } = await generateDailyAudio(userForCalc, transits);

    // Convertir el buffer a Base64 para reproducción inmediata en el navegador
    const base64Audio = audioBuffer.toString('base64');
    const audioDataUrl = `data:audio/wav;base64,${base64Audio}`;

    return res.json({
      success: true,
      textoPunto4: transits.textoPunto4,
      textoGenerado,
      audioDataUrl,
      aspectosBeneficos: transits.aspectosBeneficos,
      aspectosConflictivos: transits.aspectosConflictivos,
      fecha: transits.fecha,
    });
  } catch (error: any) {
    console.error('Error en /api/scheduler/test-audio:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al generar audio de prueba',
    });
  }
});

// Online Geocoding endpoint using OpenStreetMap (Nominatim) & Open-Meteo for Timezone
app.get(['/api/geocode', '/geocode'], async (req, res) => {
  const query = req.query.q as string;
  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Debes proporcionar un nombre de ciudad o ubicación válido.',
    });
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&limit=1`;

    const geoRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'CartaNatalAntroposofica/1.0 (https://ai.studio)',
        'Accept-Language': 'es,en',
      },
    });

    if (!geoRes.ok) {
      throw new Error(`Error en servicio de geocodificación: ${geoRes.statusText}`);
    }

    const geoData = (await geoRes.json()) as any[];
    if (!geoData || geoData.length === 0) {
      return res.json({
        success: false,
        found: false,
        error: `No se encontraron resultados en Internet para "${query}".`,
      });
    }

    const firstResult = geoData[0];
    const lat = parseFloat(firstResult.lat);
    const lng = parseFloat(firstResult.lon);
    const displayName = firstResult.display_name;

    // Get exact timezone offset via Open-Meteo
    let timezoneOffset = Math.round(lng / 15); // astronomical initial fallback
    let timezoneName = 'Aproximado por meridiano';

    try {
      const tzRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&timezone=auto`
      );
      if (tzRes.ok) {
        const tzData = (await tzRes.json()) as any;
        if (typeof tzData.utc_offset_seconds === 'number') {
          timezoneOffset = tzData.utc_offset_seconds / 3600;
          timezoneName = tzData.timezone || timezoneName;
        }
      }
    } catch (tzErr) {
      console.warn('Error fetching timezone from Open-Meteo, using longitude approximation:', tzErr);
    }

    return res.json({
      success: true,
      found: true,
      source: 'internet',
      name: displayName,
      lat,
      lng,
      timezoneOffset,
      timezoneName,
      ianaTimeZone: timezoneName,
      country: firstResult.address?.country,
      city: firstResult.address?.city || firstResult.address?.town || firstResult.address?.village,
    });
  } catch (error: any) {
    console.error('Error in /api/geocode:', error);
    return res.status(500).json({
      success: false,
      found: false,
      error: `Error al buscar la ubicación en Internet: ${error.message}`,
    });
  }
});

// Swiss Ephemeris Calculation Endpoint
app.post(['/api/astrology/calculate', '/astrology/calculate'], (req, res) => {
  try {
    const birthData = req.body;
    if (!birthData || !birthData.birthDate || !birthData.birthTime) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos de nacimiento requeridos (fecha y hora).',
      });
    }

    const result = computeSwissEphemerisChart(birthData);
    return res.json({
      success: true,
      data: result,
      source: 'Swiss Ephemeris / Engine de Precisión',
    });
  } catch (error: any) {
    console.error('Error in /api/astrology/calculate:', error);
    return res.status(500).json({
      success: false,
      error: `Error al calcular carta natal: ${error.message}`,
    });
  }
});

// Utility helper to apply strict timeout on async operations
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Helper to validate that a generated reading is genuinely complete and not truncated
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
    clean.includes('Beneficios') ||
    clean.includes('Clima Diario') ||
    clean.includes('Alquimia') ||
    clean.includes('Tránsitos') ||
    clean.includes('Transitos') ||
    clean.includes('Cápsula de Audio');

  if (!hasSec1 || !hasSec2 || !hasSec3 || !hasSec4) {
    return { complete: false, reason: 'Falta alguna de las 4 secciones estructurales' };
  }

  return { complete: true };
}

// Endpoint para evaluar un septenio biográfico con Gemini Structured Outputs y persistir en BD
app.post(['/api/biografia/evaluar', '/biografia/evaluar'], async (req, res) => {
  try {
    const { user_id, septenio_num, recuerdos, patrones_clave } = req.body;

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'El campo user_id es obligatorio y debe ser un UUID válido.',
      });
    }

    const septenioNumber = Number(septenio_num);
    if (!Number.isInteger(septenioNumber) || septenioNumber < 1 || septenioNumber > 7) {
      return res.status(400).json({
        success: false,
        error: 'El campo septenio_num debe ser un número entero entre 1 y 7.',
      });
    }

    if (!recuerdos || typeof recuerdos !== 'string' || !recuerdos.trim()) {
      return res.status(400).json({
        success: false,
        error: 'El campo recuerdos es obligatorio y debe contener una descripción válida.',
      });
    }

    let userContext: any = null;
    try {
      userContext = await getUserById(user_id);
    } catch (err: any) {
      console.warn(`[evaluar] No se pudo recuperar usuario ${user_id} de BD:`, err?.message);
    }

    const entradaSeptenio = {
      septenio_num: septenioNumber,
      recuerdos: recuerdos.trim(),
      patrones_previos: patrones_clave || null,
    };

    const evaluatorOptions = {
      contextoAdicional: userContext
        ? {
            nombre: userContext.nombre,
            fecha_nacimiento: userContext.fecha_nacimiento,
            lugar_nacimiento: userContext.lugar_nacimiento,
          }
        : null,
    };

    let interpretacion: any;
    if (getResolvedApiKey()) {
      interpretacion = await analyzeBiographicalSeptenios(entradaSeptenio, evaluatorOptions);
    } else if (getResolvedDeepSeekApiKey()) {
      interpretacion = await analyzeBiographicalSepteniosDeepSeek(entradaSeptenio, evaluatorOptions);
    } else {
      interpretacion = await analyzeBiographicalSeptenios(entradaSeptenio, evaluatorOptions);
    }

    const patronesAGuardar =
      patrones_clave && patrones_clave.trim()
        ? `${patrones_clave.trim()}\n\n[Hilos Conductores IA]: ${interpretacion.hilos_conductores.join('; ')}`
        : interpretacion.hilos_conductores.join('\n');

    let biografiaGuardada: any = null;
    let dbPersisted = true;
    let dbWarning: string | null = null;

    try {
      biografiaGuardada = await upsertBiografia({
        user_id,
        septenio_num: septenioNumber,
        recuerdos: recuerdos.trim(),
        patrones_clave: patronesAGuardar,
      });
    } catch (dbErr: any) {
      console.error('[evaluar] Error al guardar en base de datos:', dbErr?.message || dbErr);
      dbPersisted = false;
      dbWarning = `Evaluación generada con éxito, pero la persistencia en BD falló: ${dbErr?.message || 'Error de BD'}`;
    }

    return res.status(200).json({
      success: true,
      persisted: dbPersisted,
      warning: dbWarning,
      data: {
        biografia_id: biografiaGuardada?.id || null,
        user_id,
        septenio_num: septenioNumber,
        recuerdos: recuerdos.trim(),
        patrones_clave: biografiaGuardada?.patrones_clave || patronesAGuardar,
        hilos_conductores: interpretacion.hilos_conductores,
        septenio_analizado: interpretacion.septenio_analizado,
        sintesis_salutogenica: interpretacion.sintesis_salutogenica,
        modelo_utilizado: interpretacion.modelo_utilizado,
        timestamp: biografiaGuardada?.timestamp || new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error en /api/biografia/evaluar:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error al evaluar el septenio biográfico',
    });
  }
});

// Endpoint para consultar el registro de errores del desarrollador con estadísticas de tasa límite
app.get(['/api/developer/errors', '/developer/errors'], (req, res) => {
  res.json({
    status: 'ok',
    registry: getDeveloperErrorRegistry(),
  });
});

// Gemini Synthesis Endpoint for Anthroposophic Biography & Astrological Transit Reading
app.post(['/api/synthesis', '/synthesis'], async (req, res) => {
  try {
    const result = await generateSynthesisReading(req.body);
    if (!result.success) {
      return res.status(503).json(result);
    }
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error general en /api/synthesis:', error);
    await reportDeveloperError({
      category: 'SERVER_HANDLER_EXCEPTION',
      error,
      customMessage: `Excepción en endpoint /api/synthesis: ${error?.message || error}`,
      context: { bodyConsultante: req.body?.name },
    }).catch(() => {});

    return res.status(503).json({
      success: false,
      error:
        'El servicio de Inteligencia Artificial no pudo completar la lectura en este momento (tiempo de espera o error de servidor). Tu crédito NO ha sido consumido y tu saldo permanece intacto. Por favor, reintenta en unos instantes.',
      creditConsumed: false,
    });
  }
});

// Google Assistant Fulfillment Webhook
app.use('/api/assistant/webhook', createAssistantRouter());

// Endpoint para disparar manualmente (POST) o via Vercel Cron (GET) la generación de audio diario
app.all(['/api/scheduler/run-daily', '/scheduler/run-daily'], async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const secret = process.env.CRON_SECRET || process.env.SCHEDULER_SECRET;
  if (secret) {
    const authHeader = req.headers['authorization'];
    const valid =
      authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      authHeader === `Bearer ${process.env.SCHEDULER_SECRET}`;
    if (!valid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
  }
  try {
    const targetDate = (req.body?.date || req.query?.date || undefined) as string | undefined;
    const result = await runDailyAudioGeneration(targetDate);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint protegido para verificar el envío real de WhatsApp a un número de prueba
app.post(['/api/scheduler/test-whatsapp', '/scheduler/test-whatsapp'], async (req, res) => {
  const secret = process.env.CRON_SECRET || process.env.SCHEDULER_SECRET;
  const authHeader = req.headers['authorization'];
  const tokenData = extractRequestProfileToken(req);

  const hasValidSecret =
    Boolean(secret) &&
    (authHeader === `Bearer ${process.env.CRON_SECRET}` ||
      authHeader === `Bearer ${process.env.SCHEDULER_SECRET}`);

  if (!hasValidSecret && !tokenData) {
    return res.status(401).json({
      success: false,
      error: 'Autorización requerida (Bearer SCHEDULER_SECRET/CRON_SECRET o sesión de perfil).',
    });
  }

  try {
    const { toPhone, nombre, fecha_nacimiento, hora_nacimiento, lugar_nacimiento, latitude, longitude, timezone } = req.body || {};
    if (!toPhone || String(toPhone).trim().length < 8) {
      return res.status(400).json({ success: false, error: 'Ingresa un número toPhone con código de país (ej. +593999429478).' });
    }

    const userForCalc = {
      id: tokenData?.userId || 'wa_test',
      nombre: nombre || 'Viajero de la Vida',
      fecha_nacimiento: fecha_nacimiento || '1990-05-15',
      hora_nacimiento: hora_nacimiento || '12:00',
      lugar_nacimiento: lugar_nacimiento || 'Quito, Ecuador',
      latitude: typeof latitude === 'number' ? latitude : -0.1807,
      longitude: typeof longitude === 'number' ? longitude : -78.4678,
      timezone: timezone || 'America/Guayaquil',
    };

    const transits = await computeDailyTransitsPoint4(userForCalc, new Date());
    const scriptText = transits.sintesisAudioMatutino || transits.textoPunto4;
    const appUrl = process.env.APP_URL || 'https://www.farobiografico.com';

    const waRes = await sendDailyWhatsAppAudio({
      toPhone: String(toPhone),
      userName: userForCalc.nombre,
      fecha: transits.fecha,
      audioUrl: appUrl,
      scriptText,
    });

    return res.status(waRes.sent ? 200 : 400).json({
      success: waRes.sent,
      ...waRes,
      fecha: transits.fecha,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// Attach Vite middleware in dev or static files in production onto an http.Server
export async function attachAppToServer(httpServer: http.Server) {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.join(process.cwd(), 'dist');

  if (!isProduction) {
    console.log('Starting server in DEVELOPMENT mode with Vite middleware...');
    let viteInstance: any = null;

    const viteReadyPromise = (async () => {
      try {
        const vitePkg = 'vite';
        const { createServer: createViteServer } = await import(vitePkg);
        const disableHmr = process.env.DISABLE_HMR === 'true' || Boolean(process.env.DEFAULT_APP_PORT);
        viteInstance = await createViteServer({
          server: {
            middlewareMode: true,
            hmr: disableHmr ? false : { server: httpServer },
            watch: disableHmr
              ? null
              : { ignored: ['**/ephe/**', '**/dist/**', '**/scripts/**', '**/.git/**'] },
          },
          appType: 'custom',
        });
      } catch (err) {
        console.warn('Vite middleware could not be loaded in dev, falling back to static:', err);
      }
    })();

    app.use(async (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      await viteReadyPromise;
      if (viteInstance) {
        return viteInstance.middlewares(req, res, next);
      }
      return next();
    });

    if (fs.existsSync(distPath)) {
      app.use(async (req, res, next) => {
        await viteReadyPromise;
        if (!viteInstance) {
          return express.static(distPath)(req, res, next);
        }
        return next();
      });
    }

    // Handle root and client-side navigation in dev
    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        return res.status(404).send('Not found');
      }
      await viteReadyPromise;
      try {
        const url = req.originalUrl;
        const rootIndex = path.join(process.cwd(), 'index.html');
        if (viteInstance && fs.existsSync(rootIndex)) {
          let template = fs.readFileSync(rootIndex, 'utf-8');
          template = await viteInstance.transformIndexHtml(url, template);
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        }
        const distIndex = path.join(distPath, 'index.html');
        if (fs.existsSync(distIndex)) {
          return res.sendFile(distIndex);
        }
        return next();
      } catch (e) {
        if (viteInstance) {
          viteInstance.ssrFixStacktrace(e as Error);
        }
        next(e);
      }
    });
  } else {
    console.log('Starting server in PRODUCTION mode...');
    let hasStaticDist = fs.existsSync(path.join(distPath, 'index.html'));

    if (!hasStaticDist) {
      try {
        console.log('dist/index.html not found in production. Attempting build...');
        const { execSync } = await import('child_process');
        execSync('npx vite build', { stdio: 'inherit' });
        hasStaticDist = fs.existsSync(path.join(distPath, 'index.html'));
      } catch (buildErr) {
        console.warn('Could not auto-build client assets on the fly:', buildErr);
      }
    }

    if (hasStaticDist) {
      app.use(express.static(distPath));
    }

    // SPA routing in production: serve dist/index.html only for HTML requests
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        return res.status(404).send('Not found');
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      const rootIndex = path.join(process.cwd(), 'index.html');
      if (fs.existsSync(rootIndex)) {
        return res.sendFile(rootIndex);
      }
      return res.status(200).type('html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Faro Biográfico</title></head><body><div id="root">Cargando aplicación...</div></body></html>`);
    });
  }
}

export async function startServer() {
  const httpServer = http.createServer(app);
  await attachAppToServer(httpServer);

  httpServer.on('error', (err) => {
    console.error('HTTP server error:', err);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Faro Biográfico server running on port ${PORT}`);
  });

  return httpServer;
}

export default app;
