import React, { useState, useEffect } from 'react';
import { NatalChartCalculationResult } from '../types';
import {
  Sparkles,
  Copy,
  Check,
  Printer,
  RefreshCw,
  Coins,
  AlertCircle,
  PlusCircle,
  RotateCcw,
  Lock,
  Loader2,
} from 'lucide-react';
import { getCreditBalance, consumeCredit } from '../utils/creditManager';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  generateGuaranteedCompleteSynthesis,
  SynthesisFallbackInput,
} from '../utils/comprehensiveSynthesisFallback';

interface DeepSynthesisCardProps {
  calculation: NatalChartCalculationResult;
  onOpenCreditsModal?: () => void;
}

export const DeepSynthesisCard: React.FC<DeepSynthesisCardProps> = ({
  calculation,
  onOpenCreditsModal,
}) => {
  const cacheKey = `faro_reading_${calculation.birthData.name}_${calculation.birthData.birthDate}_${calculation.birthData.birthTime}`;

  // Initialize aiReading from session cache if already unlocked for this calculation
  const [aiReading, setAiReading] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(cacheKey) || null;
    } catch {
      return null;
    }
  });

  const [regenerationCount, setRegenerationCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showNoCreditNotice, setShowNoCreditNotice] = useState(false);

  // Sync cache if calculation changes
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setAiReading(cached);
      } else {
        setAiReading(null);
      }
    } catch {
      setAiReading(null);
    }
    setErrorMsg(null);
    setShowNoCreditNotice(false);
  }, [cacheKey]);

  const sun = calculation.planets.find((p) => p.id === 'sun');
  const moon = calculation.planets.find((p) => p.id === 'moon');
  const ascendant = calculation.planets.find((p) => p.id === 'ascendant');

  const currentBalance = getCreditBalance();

  const handleFetchAiReading = async () => {
    const isFirstUnlock = !aiReading;

    // Check credit balance on first generation
    if (isFirstUnlock) {
      const balance = getCreditBalance();
      if (balance < 1) {
        setShowNoCreditNotice(true);
        if (onOpenCreditsModal) {
          onOpenCreditsModal();
        }
        return;
      }
    }

    setShowNoCreditNotice(false);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Extract compact aspect codes (e.g., "Sol △ Luna (0.8°)")
      const natalAspectCodes = (calculation.aspects || [])
        .slice(0, 6)
        .map(
          (a) =>
            `${a.planet1.name} ${a.symbol} ${a.planet2.name} (${a.orb.toFixed(1)}°)`
        );

      const aspectSymbols: Record<string, string> = {
        conjunction: '☌',
        opposition: '☍',
        trine: '△',
        square: '□',
        sextile: '⚹',
      };

      const aspectSpanish: Record<string, string> = {
        conjunction: 'conjunción exacta',
        opposition: 'oposición directa',
        trine: 'trígono armónico',
        square: 'cuadratura desafiante',
        sextile: 'sextil favorable',
      };

      // Extract specific user transits with rich detail
      const activeTransits = calculation.currentTransits?.activeTransits || [];
      const transitDetailedList = activeTransits.slice(0, 6).map((t) => {
        const aspectLabel = aspectSpanish[t.aspectType] || t.aspectType;
        const trPlanet = t.transitPlanet?.name || 'Planeta';
        const trSign = t.transitPlanet?.sign ? `en ${t.transitPlanet.sign}` : '';
        const natPlanet = t.natalPlanet?.name || 'Punto';
        const natSign = t.natalPlanet?.sign ? `en ${t.natalPlanet.sign}` : '';
        const natHouse = t.natalPlanet?.house ? `(en tu Casa ${t.natalPlanet.house} natal)` : '';
        const impact = t.biographicalImpact || t.practicalTip || t.simpleExplanation || '';
        return `• ${trPlanet} ${trSign} en ${aspectLabel} a tu ${natPlanet} natal ${natSign} ${natHouse}. Dinámica: ${impact}`;
      });

      // Extract transit house activations in user's natal chart
      const transitHouseActivations = (calculation.currentTransits?.transitPlanets || [])
        .filter((tp) => tp.house)
        .slice(0, 6)
        .map((tp) => {
          const houseTheme = calculation.houses.find((h) => h.house === tp.house)?.theme || 'área vital';
          return `${tp.name} transita hoy por tu Casa ${tp.house} natal (${houseTheme})`;
        });

      // Summary of consultant's individual natal chart
      const natalPlanetsSummary = calculation.planets
        .slice(0, 10)
        .map((p) => `${p.name} en ${p.sign}${p.house ? ` (Casa ${p.house})` : ''}`)
        .join(', ');

      // Extract compact transit codes (fallback)
      const transitCodes = activeTransits
        .slice(0, 5)
        .map((t) => {
          const sym = aspectSymbols[t.aspectType] || '☌';
          return `Tr-${t.transitPlanet.name} ${sym} Nat-${t.natalPlanet.name} (${t.orb.toFixed(1)}°)`;
        });

      const currentSkyPositions = (calculation.currentTransits?.transitPlanets || [])
        .slice(0, 7)
        .map((p) => `${p.name} en ${p.sign}`)
        .join(', ');

      const septenioCode = `${calculation.currentSeptenio.number}° Septenio (${calculation.currentSeptenio.ageRange}), ${calculation.currentSeptenio.archetypalTitle} [${calculation.currentSeptenio.phase} / ${calculation.currentSeptenio.planetarySphere}]`;

      const nodalAxisCode = `NN en ${calculation.lunarNodes.northNode.sign} (C${calculation.lunarNodes.northNode.house}) / NS en ${calculation.lunarNodes.southNode.sign} (C${calculation.lunarNodes.southNode.house})`;

      const profectionCode = `Año ${calculation.yearOfLife.currentYearOfLife} (C${calculation.yearOfLife.profectionHouse} en ${calculation.yearOfLife.profectionSign}, Regente: ${calculation.yearOfLife.lordOfYear})`;

      const activeTransitsRaw = activeTransits.slice(0, 8).map((t) => ({
        transitPlanetName: t.transitPlanet?.name,
        transitSign: t.transitPlanet?.sign,
        natalPlanetName: t.natalPlanet?.name,
        natalSign: t.natalPlanet?.sign,
        natalHouse: t.natalPlanet?.house,
        aspectType: t.aspectType,
        aspectLabel: aspectSpanish[t.aspectType] || t.aspectType,
        nature: t.nature,
        biographicalImpact: t.biographicalImpact,
        simpleExplanation: t.simpleExplanation,
        practicalTip: t.practicalTip,
        activatedHouseArea: t.activatedHouseArea,
      }));

      const fallbackData: SynthesisFallbackInput = {
        name: calculation.birthData.name,
        exactAgeFormatted: calculation.exactAge.formatted,
        sunSign: sun?.sign || 'Aries',
        moonSign: moon?.sign || 'Tauro',
        ascendantSign: ascendant?.sign || 'Géminis',
        septenioCode,
        nodalAxisCode,
        profectionCode,
        natalAspectCodes,
        natalPlanetsSummary,
        transitHouseActivations,
        transitCodes,
        transitDetailedList,
        activeTransitsRaw,
        currentSkyPositions,
        todayDate: calculation.currentTransits?.transitDate,
      };

      let finalReading = '';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch('/api/synthesis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            ...fallbackData,
            isRegeneration: Boolean(aiReading),
            regenerationCount: regenerationCount + 1,
          }),
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json().catch(() => null);
          if (data && data.success && data.reading && typeof data.reading === 'string' && data.reading.trim().length > 200) {
            finalReading = data.reading.trim();
          }
        }
      } catch (networkErr) {
        console.warn('[Lectura Integral] Error o timeout en llamada de red Vercel:', networkErr);
      }

      // If serverless function did not return reading or failed/timed out, deliver guaranteed synthesis immediately
      if (!finalReading) {
        console.info('[Lectura Integral] Entregando síntesis biográfica garantizada de alta precisión');
        finalReading = generateGuaranteedCompleteSynthesis(fallbackData);
      }

      if (finalReading && finalReading.length > 200) {
        if (isFirstUnlock) {
          consumeCredit(`Lectura Integral para ${calculation.birthData.name}`);
        }
        setAiReading(finalReading);
        try {
          sessionStorage.setItem(cacheKey, finalReading);
        } catch {}
        setRegenerationCount((prev) => prev + 1);
        setErrorMsg(null);
      } else {
        setErrorMsg('No se pudo completar la lectura en este intento. Por favor, pulsa Reintentar.');
      }
    } catch (err: any) {
      console.warn('AI endpoint unexpected error:', err);
      setErrorMsg('Hubo un problema al generar la lectura. Tu crédito está a salvo. Puedes reintentar en un instante.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!aiReading) return;
    navigator.clipboard.writeText(aiReading);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!aiReading) return;
    window.print();
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Lectura Integral
            </span>
            {aiReading ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Lectura Desbloqueada {regenerationCount > 1 ? `(Perspectiva #${regenerationCount})` : ''}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-800 text-stone-300 border border-stone-700 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                Bloqueado (1 Crédito)
              </span>
            )}
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 mt-2">
            Informe Integral de Trayectoria & Dinámica Temporal
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Integración del perfil biográfico, el eje de crecimiento, la cronología de septenios y la dinámica temporal para {calculation.birthData.name}.
          </p>
        </div>

        {/* Action Controls in Header (Only active/available when reading is unlocked) */}
        {aiReading && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-copy-reading"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-950 text-xs text-stone-300 hover:text-amber-300 hover:border-stone-600 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>

            <button
              type="button"
              id="btn-print-reading"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border border-stone-700 bg-stone-950 text-xs text-stone-300 hover:text-amber-300 hover:border-stone-600 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>

            <button
              type="button"
              id="btn-generate-ai"
              disabled={isLoading}
              onClick={handleFetchAiReading}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold rounded-lg text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Sintetizando...' : 'Regenerar con IA (Nueva Perspectiva)'}
            </button>
          </div>
        )}
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={handleFetchAiReading}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-medium rounded-md border border-rose-500/40 text-xs cursor-pointer flex items-center gap-1 self-start sm:self-auto"
          >
            <RotateCcw className="w-3 h-3" />
            Reintentar
          </button>
        </div>
      )}

      {/* No Credit Notice */}
      {showNoCreditNotice && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Has agotado tus créditos para la lectura integral. Adquiere créditos para desbloquear este informe biográfico ampliado.
            </span>
          </div>
          {onOpenCreditsModal && (
            <button
              type="button"
              onClick={onOpenCreditsModal}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Recargar Créditos
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LOCKED STATE (When reading is not yet unlocked - text is NOT visible)     */}
      {/* ========================================================================= */}
      {!aiReading && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-stone-900 via-stone-900/90 to-stone-950 p-6 sm:p-8 text-center shadow-2xl">
          {/* Subtle gold glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-400 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                Lectura Integral Personalizada
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-100 tracking-wide">
                Lectura Integral
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 max-w-lg mx-auto leading-relaxed">
                Integra el mapa natal completo de <strong>{calculation.birthData.name}</strong>, el septenio de vida según Rudolf Steiner, el eje evolutivo nodal y la interpretación de los tránsitos actuales en sinastría con su carta natal.
              </p>
            </div>

            {/* Action Trigger Area */}
            <div className="pt-3 space-y-3">
              {isLoading ? (
                <div className="p-6 rounded-xl bg-stone-950 border border-amber-500/40 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-stone-100">
                      Generando tu Informe Integral con IA...
                    </p>
                    <p className="text-xs text-stone-400">
                      Sintetizando septenios, perfil biográfico y análisis temporal para {calculation.birthData.name}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    id="btn-unlock-reading"
                    onClick={handleFetchAiReading}
                    className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-bold rounded-xl text-sm shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
                  >
                    <Sparkles className="w-4 h-4 text-stone-950" />
                    <span>Acceder a la Lectura Integral (1 Crédito)</span>
                  </button>

                  {currentBalance < 1 && onOpenCreditsModal && (
                    <button
                      type="button"
                      onClick={onOpenCreditsModal}
                      className="w-full sm:w-auto px-5 py-3.5 bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/40 font-semibold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4 text-amber-400" />
                      <span>Recargar Créditos</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-xs text-stone-400 pt-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Tu saldo actual:{' '}
                  <strong className="text-amber-300 font-semibold">
                    {currentBalance} {currentBalance === 1 ? 'crédito disponible' : 'créditos disponibles'}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNLOCKED STATE (Only displayed once the user has accessed with 1 credit) */}
      {/* ========================================================================= */}
      {aiReading && (
        <div className="space-y-4 animate-fade-in">
          {/* Mode Indicator Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-stone-950/60 border border-stone-800/80 rounded-xl text-xs text-stone-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 font-medium">
                Lectura Biográfica con IA {regenerationCount > 1 ? `(Perspectiva #${regenerationCount})` : ''}
              </span>
            </div>
            <div className="text-[11px] text-stone-500 hidden sm:block">
              Formato Markdown Enriquecido • Trayectoria y Clima Diario
            </div>
          </div>

          {/* Reading Text Container with Full Markdown Rendering */}
          <div className="p-6 bg-stone-950 rounded-xl border border-stone-800 text-stone-200 shadow-inner print:bg-white print:text-black print:border-none">
            <MarkdownRenderer content={aiReading} />
          </div>
        </div>
      )}
    </div>
  );
};
