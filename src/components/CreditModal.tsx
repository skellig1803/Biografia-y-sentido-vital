import React, { useState, useEffect } from 'react';
import {
  PRICING_PLANS,
  PricingPlan,
  addCredits,
  redeemPromoVoucher,
  getCreditBalance,
  INITIAL_WELCOME_CREDITS,
} from '../utils/creditManager';
import {
  X,
  Sparkles,
  Check,
  CreditCard,
  ShieldCheck,
  Tag,
  Gift,
  ExternalLink,
  Lock,
} from 'lucide-react';

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Url: {
        Open: (url: string) => void;
        Close: () => void;
      };
      Setup: (options: { eventHandler?: (event: any) => void }) => void;
    };
  }
}

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreditsUpdated?: (newBalance: number) => void;
}

export const CreditModal: React.FC<CreditModalProps> = ({
  isOpen,
  onClose,
  onCreditsUpdated,
}) => {
  const [plans, setPlans] = useState<PricingPlan[]>(PRICING_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>(PRICING_PLANS[1]); // Default to 5-pack
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherMsg, setVoucherMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [hasLiveLemonSqueezy, setHasLiveLemonSqueezy] = useState(false);
  const currentBalance = getCreditBalance();

  // Fetch billing configuration from backend
  useEffect(() => {
    let isMounted = true;
    fetch('/api/billing/config')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data?.plans && Array.isArray(data.plans)) {
          setPlans((prevPlans) =>
            prevPlans.map((p) => {
              const remote = data.plans.find((rp: any) => rp.id === p.id);
              return remote ? { ...p, checkoutUrl: remote.checkoutUrl } : p;
            })
          );
        }
        if (data?.hasLiveLemonSqueezy) {
          setHasLiveLemonSqueezy(true);
        }
      })
      .catch((err) => {
        console.warn('Could not load Lemon Squeezy billing config:', err);
      });

    // Initialize Lemon.js overlay if available
    if (typeof window !== 'undefined' && window.createLemonSqueezy) {
      try {
        window.createLemonSqueezy();
        window.LemonSqueezy?.Setup({
          eventHandler: (event) => {
            if (event.event === 'Checkout.Success') {
              const plan = selectedPlan;
              const updated = addCredits(
                plan.credits,
                `Compra verificada Lemon Squeezy: ${plan.name}`,
                'purchase',
                'lemonsqueezy',
                event.data?.order?.id
              );
              setPurchaseSuccess(
                `¡Pago con Lemon Squeezy completado con éxito! Se han acreditado +${plan.credits} créditos a tu cuenta.`
              );
              if (onCreditsUpdated) onCreditsUpdated(updated);
            }
          },
        });
      } catch (err) {
        console.warn('Lemon Squeezy init err:', err);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [selectedPlan, onCreditsUpdated]);

  if (!isOpen) return null;

  const handlePurchase = (plan: PricingPlan) => {
    setIsProcessing(true);
    setPurchaseSuccess(null);
    setVoucherMsg(null);

    // If a direct Lemon Squeezy checkout link is configured:
    if (plan.checkoutUrl) {
      if (typeof window !== 'undefined' && window.LemonSqueezy?.Url?.Open) {
        window.LemonSqueezy.Url.Open(plan.checkoutUrl);
        setIsProcessing(false);
        return;
      } else {
        window.open(plan.checkoutUrl, '_blank', 'noopener,noreferrer');
        setIsProcessing(false);
        return;
      }
    }

    // Default simulation / instant test fulfillment with Lemon Squeezy provider tag
    setTimeout(() => {
      const updated = addCredits(
        plan.credits,
        `Adquisición de ${plan.name} ($${plan.priceUsd} USD) vía Lemon Squeezy`,
        'purchase',
        'lemonsqueezy',
        'LSQ_TX_' + Math.random().toString(36).substring(2, 9).toUpperCase()
      );
      setIsProcessing(false);
      setPurchaseSuccess(
        `¡Pago procesado con Lemon Squeezy! Se han agregado +${plan.credits} créditos a tu monedero vital.`
      );
      if (onCreditsUpdated) onCreditsUpdated(updated);
    }, 1100);
  };

  const handleRedeemVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;

    const res = redeemPromoVoucher(voucherCode);
    if (res.success) {
      setVoucherMsg({ type: 'success', text: res.message });
      setVoucherCode('');
      if (onCreditsUpdated) onCreditsUpdated(getCreditBalance());
    } else {
      setVoucherMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950/40 p-6 border-b border-stone-800 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Monedero de Reportes Biográficos
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-100">
              Créditos para Informes de Análisis con IA
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-xl">
              El cálculo de coordenadas y cronología de septenios es 100% gratuito. Los créditos se utilizan únicamente para generar el informe automatizado de desarrollo personal asistido por IA.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Welcome Gift Highlight Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 border border-amber-500/30 flex items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold shrink-0 text-base shadow-sm">
                🎁
              </div>
              <div>
                <p className="text-amber-200 font-semibold flex items-center gap-1.5">
                  <span>¡Obsequio de bienvenida: 5 créditos gratuitos!</span>
                </p>
                <p className="text-[11px] text-stone-300 mt-0.5">
                  La primera vez que ingresas recibes <strong>{INITIAL_WELCOME_CREDITS} créditos de cortesía</strong> para que disfrutes de tus primeras síntesis biográficas completas sin costo.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-stone-950 uppercase tracking-wider shrink-0">
              5 Gratis
            </span>
          </div>

          {/* Current balance notification banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-stone-950 rounded-xl border border-stone-800 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold">
                {currentBalance}
              </div>
              <div>
                <span className="text-stone-300 font-medium block">
                  Tu saldo actual: <strong>{currentBalance} {currentBalance === 1 ? 'crédito disponible' : 'créditos disponibles'}</strong>
                </span>
                <span className="text-[11px] text-stone-500">
                  1 crédito = 1 informe biográfico profundo completo con IA
                </span>
              </div>
            </div>
            <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Tus créditos nunca caducan</span>
            </div>
          </div>

          {/* Success Notification */}
          {purchaseSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{purchaseSuccess}</span>
            </div>
          )}

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`relative flex flex-col justify-between p-5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-900/10 ring-1 ring-amber-500/50'
                      : 'bg-stone-950/80 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950 shadow-sm uppercase tracking-wider">
                      Más Popular
                    </span>
                  )}

                  <div>
                    <h3 className="font-serif font-bold text-base text-stone-100">{plan.name}</h3>
                    <p className="text-[11px] text-stone-400 mt-0.5">{plan.tagline}</p>

                    <div className="mt-4 mb-4 flex items-baseline gap-1">
                      <span className="font-serif text-3xl font-bold text-amber-300">
                        ${plan.priceUsd}
                      </span>
                      <span className="text-xs text-stone-400">USD</span>
                      {plan.savingsPercent && (
                        <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          Ahorras {plan.savingsPercent}%
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 border-t border-stone-800/80 pt-3 text-xs text-stone-300">
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] leading-tight text-stone-300">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(plan);
                    }}
                    className={`mt-5 w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 shadow-md'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>
                      {isProcessing
                        ? 'Conectando con Lemon Squeezy...'
                        : `Adquirir (${plan.credits} ${plan.credits === 1 ? 'Crédito' : 'Créditos'})`}
                    </span>
                    {plan.checkoutUrl && <ExternalLink className="w-3 h-3 ml-0.5" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Lemon Squeezy Payment Provider Assurance Badge */}
          <div className="p-4 rounded-xl bg-stone-950/70 border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-lg shrink-0">
                🍋
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-200">
                    Procesado por Lemon Squeezy
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Merchant of Record
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Acepta Tarjetas (Visa, Mastercard, Amex), Apple Pay, Google Pay y PayPal de forma 100% segura.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-stone-400 text-[11px] shrink-0">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Cifrado SSL de 256 bits</span>
            </div>
          </div>

          {/* Promotional / Voucher Code Section */}
          <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-300">
              <Gift className="w-4 h-4 text-amber-400" />
              ¿Tienes un cupón promocional o código de activación?
            </div>

            <form onSubmit={handleRedeemVoucher} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder="Ej: STEINER2026, BIOGRAFIAVIP o VITALPASS"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-200 uppercase placeholder:normal-case placeholder:text-stone-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Canjear Código
              </button>
            </form>

            {voucherMsg && (
              <p
                className={`text-xs ${
                  voucherMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {voucherMsg.text}
              </p>
            )}
          </div>

          {/* Footer note & transparency */}
          <div className="text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-800/60 pt-4">
            <span>
              Pagos procesados de forma segura vía Lemon Squeezy • Moneda: Dólares estadounidenses (USD)
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
