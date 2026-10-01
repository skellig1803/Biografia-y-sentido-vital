import React, { useState } from 'react';
import {
  PRICING_PLANS,
  PricingPlan,
  addCredits,
  redeemPromoVoucher,
  getCreditBalance,
} from '../utils/creditManager';
import {
  X,
  Sparkles,
  Check,
  CreditCard,
  ShieldCheck,
  Tag,
  Zap,
  ArrowRight,
  Gift,
  HelpCircle,
} from 'lucide-react';

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
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>(PRICING_PLANS[1]); // Default to 5-pack
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherMsg, setVoucherMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const currentBalance = getCreditBalance();

  if (!isOpen) return null;

  const handleSimulatePurchase = (plan: PricingPlan) => {
    setIsProcessing(true);
    setPurchaseSuccess(null);
    setVoucherMsg(null);

    setTimeout(() => {
      const updated = addCredits(
        plan.credits,
        `Compra de ${plan.name} ($${plan.priceUsd} USD)`,
        'purchase'
      );
      setIsProcessing(false);
      setPurchaseSuccess(
        `¡Pago procesado con éxito! Se han agregado +${plan.credits} créditos a tu monedero vital.`
      );
      if (onCreditsUpdated) onCreditsUpdated(updated);
    }, 1200);
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
              Monedero de Lecturas Biográficas
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-100">
              Adquiere Créditos para Síntesis con IA
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-xl">
              El cálculo astronómico de la carta natal y los septenios es 100% gratuito. Los créditos se utilizan únicamente para generar la <strong>lectura biográfica antroposófica profunda redactada por IA</strong> con análisis kármico, dhármico y tránsitos actuales.
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
                  1 crédito = 1 informe biográfico completo con IA
                </span>
              </div>
            </div>
            <div className="text-[11px] text-stone-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Tus créditos nunca caducan
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
            {PRICING_PLANS.map((plan) => {
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
                      handleSimulatePurchase(plan);
                    }}
                    className={`mt-5 w-full py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      isSelected
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {isProcessing ? 'Procesando...' : `Adquirir (${plan.credits} ${plan.credits === 1 ? 'Crédito' : 'Créditos'})`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Promotional / Voucher Code Section */}
          <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-300">
              <Gift className="w-4 h-4 text-amber-400" />
              ¿Tienes un cupón de descuento o código de activación?
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
              Pagos seguros cifrados con SSL • Moneda de cobro: Dólares estadounidenses (USD)
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
