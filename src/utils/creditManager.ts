// Credit and Pay-Per-Use management system with Polar.sh integration
export interface CreditTransaction {
  id: string;
  timestamp: string;
  type: 'initial' | 'purchase' | 'voucher' | 'usage';
  amount: number; // positive for addition, negative for deduction
  description: string;
  balanceAfter: number;
  provider?: 'polar' | 'voucher' | 'system' | 'lemonsqueezy';
  referenceId?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  tagline: string;
  typeLabel?: string;
  credits: number;
  priceUsd: number;
  netEstimateUsd?: number;
  unitPriceUsd?: number;
  popular?: boolean;
  savingsPercent?: number;
  features: string[];
  checkoutUrl?: string;
}

export interface ConsultingService {
  id: string;
  name: string;
  tagline: string;
  type: 'subscription' | 'one_time' | 'custom';
  typeLabel: string;
  priceUsd: number | null;
  billingInterval?: string; // 'mes'
  netEstimateUsd?: number;
  deliverable: string;
  features: string[];
  checkoutUrl?: string;
  externalLink?: string;
}

export const INITIAL_WELCOME_CREDITS = 5;

// 1. Paquetes de Créditos para "Faro Biográfico" (Reportes con IA)
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'pack_single',
    name: '1 Reporte de Trayectoria Vital',
    tagline: 'Ideal para autoconocimiento y análisis personal',
    typeLabel: 'Pago único (One-time purchase)',
    credits: 1,
    priceUsd: 3.99,
    netEstimateUsd: 3.29,
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
    typeLabel: 'Pago único (One-time purchase)',
    credits: 5,
    priceUsd: 14.99,
    unitPriceUsd: 2.99,
    netEstimateUsd: 13.74,
    popular: true,
    savingsPercent: 25,
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
    typeLabel: 'Pago único (One-time purchase)',
    credits: 15,
    priceUsd: 29.99,
    unitPriceUsd: 1.99,
    netEstimateUsd: 27.99,
    savingsPercent: 50,
    features: [
      '15 Créditos sin caducidad temporal',
      'Equivale a solo $1.99 USD por reporte (Ahorro 50%)',
      'Licencia de uso para consultoría de desarrollo',
      'Informes y comparativas para mentorías profesionales',
    ],
  },
];

// 2. Servicios Continuos y Consultoría
export const CONSULTING_SERVICES: ConsultingService[] = [
  {
    id: 'service_faro_diario',
    name: 'Faro Diario - Suscripción Matutina (OK Google / Audio PWA)',
    tagline: 'Audio de sincronización vital matutino de 45 segundos',
    type: 'subscription',
    typeLabel: 'Suscripción Mensual',
    priceUsd: 7.99,
    billingInterval: 'mes',
    netEstimateUsd: 6.79,
    deliverable: 'Audio matutino personalizado de 45 seg (Nodo Lunar + Septenio + Nodo Anual + Tránsitos del día)',
    features: [
      'Audio matutino personalizado de 45 seg generado cada día',
      'Síntesis activa: Nodo Lunar + Septenio + Nodo Anual + Tránsitos diarios',
      'Integración para PWA móvil y rutinas de altavoz inteligente / voz',
      'Suscripción mensual flexible gestionada por Polar.sh (cancela cuando desees)',
    ],
  },
  {
    id: 'service_rectificacion',
    name: 'Rectificación Biográfica de Carta Natal (Artesanal)',
    tagline: 'Auditoría astronómica y verificación biográfica manual',
    type: 'one_time',
    typeLabel: 'Pago único (One-time purchase)',
    priceUsd: 80.00,
    netEstimateUsd: 75.50,
    deliverable: 'Entrega en 3 días laborables mediante revisión manual con atacires y formulario estructurado',
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
    typeLabel: 'Tarifa acordada / Enlace directo Polar.sh',
    priceUsd: null,
    deliverable: 'Agenda externa (WhatsApp / Cal.com) con cobro acordado enviado a través de enlace directo de Polar.sh',
    features: [
      'Sesión individual personalizada 1 a 1 (60 - 90 min)',
      'Profundización en septenios, crisis evolutivas y dirección vocacional',
      'Coordinación directa de calendario vía WhatsApp / Cal.com',
      'Cobro seguro y flexible con enlace personalizado emitido en Polar.sh',
    ],
  },
];

const STORAGE_KEY = 'biografia_vital_credits';
const TRANSACTIONS_KEY = 'biografia_vital_transactions';
const WELCOME_5_KEY = 'biografia_vital_welcome_5_granted_v2';

type CreditListener = (balance: number) => void;
const listeners = new Set<CreditListener>();

export function getCreditBalance(): number {
  if (typeof window === 'undefined') return INITIAL_WELCOME_CREDITS;
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (stored === null) {
    // Initial welcome bonus: 5 free credits to try the AI synthesis
    const initialCredits = INITIAL_WELCOME_CREDITS;
    localStorage.setItem(STORAGE_KEY, initialCredits.toString());
    localStorage.setItem(WELCOME_5_KEY, 'true');
    recordTransaction({
      id: 'tx_init_' + Date.now(),
      timestamp: new Date().toISOString(),
      type: 'initial',
      amount: initialCredits,
      description: '¡Obsequio inicial de bienvenida! (+5 créditos gratuitos)',
      balanceAfter: initialCredits,
      provider: 'system',
    });
    return initialCredits;
  }

  const parsed = parseInt(stored, 10);
  const current = isNaN(parsed) ? 0 : parsed;

  // Upgrade migration for users who previously got 1 credit: ensure they receive the 5 welcome credits
  if (!localStorage.getItem(WELCOME_5_KEY)) {
    localStorage.setItem(WELCOME_5_KEY, 'true');
    if (current < INITIAL_WELCOME_CREDITS) {
      const topUp = INITIAL_WELCOME_CREDITS - current;
      const updated = current + topUp;
      localStorage.setItem(STORAGE_KEY, updated.toString());
      recordTransaction({
        id: 'tx_welcome5_' + Date.now(),
        timestamp: new Date().toISOString(),
        type: 'initial',
        amount: topUp,
        description: '¡Obsequio especial! Activación de 5 créditos de bienvenida',
        balanceAfter: updated,
        provider: 'system',
      });
      return updated;
    }
  }

  return current;
}

export function subscribeToCredits(listener: CreditListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(newBalance: number) {
  listeners.forEach((listener) => {
    try {
      listener(newBalance);
    } catch (e) {
      console.error('Error notifying credit listener', e);
    }
  });
}

function recordTransaction(tx: CreditTransaction) {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    const list: CreditTransaction[] = raw ? JSON.parse(raw) : [];
    list.unshift(tx);
    // Keep last 30 transactions
    if (list.length > 30) list.length = 30;
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving transaction', err);
  }
}

export function getCreditTransactions(): CreditTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addCredits(
  amount: number,
  description: string,
  type: 'purchase' | 'voucher' | 'initial' = 'purchase',
  provider: 'polar' | 'voucher' | 'system' | 'lemonsqueezy' = 'purchase' === type ? 'polar' : 'system',
  referenceId?: string
): number {
  const current = getCreditBalance();
  const updated = current + amount;
  localStorage.setItem(STORAGE_KEY, updated.toString());
  recordTransaction({
    id: 'tx_' + Date.now(),
    timestamp: new Date().toISOString(),
    type,
    amount,
    description,
    balanceAfter: updated,
    provider,
    referenceId,
  });
  notifyListeners(updated);
  return updated;
}

export function consumeCredit(reason: string = 'Lectura Biográfica con IA'): boolean {
  const current = getCreditBalance();
  if (current < 1) {
    return false;
  }
  const updated = current - 1;
  localStorage.setItem(STORAGE_KEY, updated.toString());
  recordTransaction({
    id: 'tx_' + Date.now(),
    timestamp: new Date().toISOString(),
    type: 'usage',
    amount: -1,
    description: reason,
    balanceAfter: updated,
  });
  notifyListeners(updated);
  return true;
}

// Built-in promotional and activation vouchers
export const PROMO_VOUCHERS: Record<string, { credits: number; label: string }> = {
  STEINER2026: { credits: 3, label: 'Cupón Especial Antroposofía (+3 Créditos)' },
  BIOGRAFIAVIP: { credits: 5, label: 'Pase VIP Biografía Vital (+5 Créditos)' },
  VITALPASS: { credits: 2, label: 'Pase Vital Inicial (+2 Créditos)' },
  PROMO1: { credits: 1, label: 'Código Promocional (+1 Crédito)' },
};

export function redeemPromoVoucher(code: string): { success: boolean; creditsAdded?: number; message: string } {
  const cleanCode = code.trim().toUpperCase();
  const voucher = PROMO_VOUCHERS[cleanCode];

  if (!voucher) {
    return {
      success: false,
      message: 'Código de cupón o activación no válido o caducado.',
    };
  }

  // Check if voucher was already redeemed on this device
  const redeemedKey = `voucher_redeemed_${cleanCode}`;
  if (localStorage.getItem(redeemedKey)) {
    return {
      success: false,
      message: 'Este código promocional ya fue canjeado en este navegador.',
    };
  }

  addCredits(voucher.credits, voucher.label, 'voucher');
  localStorage.setItem(redeemedKey, 'true');

  return {
    success: true,
    creditsAdded: voucher.credits,
    message: `¡Canje exitoso! Se han agregado ${voucher.credits} créditos a tu cuenta.`,
  };
}
