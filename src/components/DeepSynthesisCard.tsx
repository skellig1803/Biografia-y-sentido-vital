import React, { useState } from 'react';
import { NatalChartCalculationResult } from '../types';
import {
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Printer,
  RefreshCw,
  Coins,
  AlertCircle,
  PlusCircle,
  RotateCcw,
} from 'lucide-react';
import { getCreditBalance, consumeCredit } from '../utils/creditManager';
import { MarkdownRenderer } from './MarkdownRenderer';

interface DeepSynthesisCardProps {
  calculation: NatalChartCalculationResult;
  onOpenCreditsModal?: () => void;
}

export const DeepSynthesisCard: React.FC<DeepSynthesisCardProps> = ({
  calculation,
  onOpenCreditsModal,
}) => {
  const [aiReading, setAiReading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'ai' | 'essential'>('essential');
  const [regenerationCount, setRegenerationCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showNoCreditNotice, setShowNoCreditNotice] = useState(false);

  const sun = calculation.planets.find((p) => p.id === 'sun');
  const moon = calculation.planets.find((p) => p.id === 'moon');
  const ascendant = calculation.planets.find((p) => p.id === 'ascendant');

  const currentBalance = getCreditBalance();

  const generateDefaultSynthesis = () => {
    return `## 1. La Esencia Biográfica y el Reto del Septenio Presente
Te encuentras transitando el **${calculation.currentSeptenio.number}° Septenio (${calculation.currentSeptenio.ageRange})**, titulado *"**${calculation.currentSeptenio.archetypalTitle}**"*, perteneciente a la fase de **${calculation.currentSeptenio.phase}** y gobernado por la esfera de **${calculation.currentSeptenio.planetarySphere}**. 

Con **${calculation.exactAge.formatted}**, tu ser interior confronta la pregunta arquetípica: *"${calculation.currentSeptenio.coreQuestion}"*. A esta edad precisa, el organismo ya no sostiene automáticamente las fuerzas juveniles sin esfuerzo consciente; la antroposofía enseña que la verdadera individualidad del Yo debe tomar el timón de la existencia. Tu principal desafío consiste en soltar las máscaras y mandatos sociales que ya no te pertenecen para cultivar una autenticidad radical.

---

## 2. La Brújula del Alma: El Eje de los Nodos Lunares
Tu **Nodo Norte en ${calculation.lunarNodes.northNode.sign} (Casa ${calculation.lunarNodes.northNode.house})** marca con nitidez la brújula evolutiva de tu encarnación:
- **La Dirección a Tomar:** ${calculation.lunarNodes.northNode.dharmaDirection}
- **La Lección del Alma:** ${calculation.lunarNodes.northNode.soulLesson}
- **La Trampa a Trascender:** Con tu **Nodo Sur en ${calculation.lunarNodes.southNode.sign} (Casa ${calculation.lunarNodes.southNode.house})**, tiendes a refugiarte inconscientemente en: *${calculation.lunarNodes.southNode.comfortZoneTrap}*. Aunque posees dones innatos en este signo, usarlos como refugio estanca tu crecimiento. El cosmos te exige avanzar con coraje hacia la energía de ${calculation.lunarNodes.northNode.sign}.

---

## 3. El Clima Vital del Año de Vida Actual
Con ${calculation.yearOfLife.completedYears} años cumplidos, estás viviendo tu **año ${calculation.yearOfLife.currentYearOfLife} de vida**, el cual activa la **Casa ${calculation.yearOfLife.profectionHouse} astrológica en ${calculation.yearOfLife.profectionSign}**, regido este año por el planeta **${calculation.yearOfLife.lordOfYear}**.
- **Tema Central Anual:** ${calculation.yearOfLife.annualCoreTheme}
- **Directriz de Oro:** ${calculation.yearOfLife.keyDirectives[0]}

---

## 4. Alquimia de los Tránsitos: Mensaje del Cielo
El firmamento actual cuenta con tránsitos clave impactando tu carta natal. Destacan:
${calculation.currentTransits.activeTransits.slice(0, 4).map((t) => `- **${t.name}**: ${t.simpleExplanation || t.biographicalImpact}`).join('\n')}

> **Consejo Integrador:** Abraza el ritmo sagrado de tu biografía. Las crisis no son desvíos en el camino, sino los dolores de parto de un Yo más despierto, libre y compasivo.`;
  };

  const handleFetchAiReading = async () => {
    // Check credit balance on first generation
    if (!aiReading) {
      const balance = getCreditBalance();
      if (balance < 1) {
        setShowNoCreditNotice(true);
        if (onOpenCreditsModal) {
          onOpenCreditsModal();
        }
        return;
      }
      consumeCredit(`Lectura Biográfica con IA para ${calculation.birthData.name}`);
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

      // Extract compact transit codes (e.g., "Tr-Saturno □ Nat-Sol (1.1°)")
      const transitCodes = (calculation.currentTransits?.activeTransits || [])
        .slice(0, 5)
        .map((t) => {
          const sym = aspectSymbols[t.aspectType] || '☌';
          return `Tr-${t.transitPlanet.name} ${sym} Nat-${t.natalPlanet.name} (${t.orb.toFixed(1)}°)`;
        });

      const septenioCode = `${calculation.currentSeptenio.number}° Septenio (${calculation.currentSeptenio.ageRange}), ${calculation.currentSeptenio.archetypalTitle} [${calculation.currentSeptenio.phase} / ${calculation.currentSeptenio.planetarySphere}]`;

      const nodalAxisCode = `NN en ${calculation.lunarNodes.northNode.sign} (C${calculation.lunarNodes.northNode.house}) / NS en ${calculation.lunarNodes.southNode.sign} (C${calculation.lunarNodes.southNode.house})`;

      const profectionCode = `Año ${calculation.yearOfLife.currentYearOfLife} (C${calculation.yearOfLife.profectionHouse} en ${calculation.yearOfLife.profectionSign}, Regente: ${calculation.yearOfLife.lordOfYear})`;

      const response = await fetch('/api/synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: calculation.birthData.name,
          exactAgeFormatted: calculation.exactAge.formatted,
          sunSign: sun?.sign || 'Aries',
          moonSign: moon?.sign || 'Tauro',
          ascendantSign: ascendant?.sign || 'Géminis',
          septenioCode,
          nodalAxisCode,
          profectionCode,
          natalAspectCodes,
          transitCodes,
          isRegeneration: Boolean(aiReading),
          regenerationCount: regenerationCount + 1,
        }),
      });

      const data = await response.json();
      if (data.success && data.reading) {
        setAiReading(data.reading);
        setViewMode('ai');
        setRegenerationCount((prev) => prev + 1);
        setErrorMsg(null);
      } else {
        setErrorMsg(
          data.error ||
            'No se pudo completar la síntesis con IA. Puedes consultar el Resumen Esencial abajo o volver a intentar.'
        );
      }
    } catch (err: any) {
      console.warn('AI endpoint error:', err);
      setErrorMsg(
        'Hubo un problema de conexión al generar la lectura con IA. Puedes consultar el Resumen Esencial o reintentar en un momento.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy =
      viewMode === 'ai' && aiReading
        ? aiReading
        : generateDefaultSynthesis();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeContent =
    viewMode === 'ai' && aiReading
      ? aiReading
      : generateDefaultSynthesis();

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Lectura Integrativa Completa
            </span>
            {aiReading ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Síntesis IA Activa {regenerationCount > 1 ? `(Perspectiva #${regenerationCount})` : ''}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-950 text-stone-400 border border-stone-800 flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" />
                IA Opcional: Requiere 1 Crédito (Saldo: {currentBalance})
              </span>
            )}
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 mt-2">
            Síntesis Biográfica del Alma & Clima de Tránsitos
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Integración de la carta natal, el eje nodal kármico, el septenio antroposófico y los tránsitos celestes para {calculation.birthData.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {aiReading && (
            <div className="flex items-center rounded-lg border border-stone-800 bg-stone-950 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('ai')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  viewMode === 'ai'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                Lectura IA
              </button>
              <button
                type="button"
                onClick={() => setViewMode('essential')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  viewMode === 'essential'
                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                Resumen Esencial
              </button>
            </div>
          )}

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
            {isLoading
              ? 'Sintetizando...'
              : aiReading
              ? 'Regenerar con IA (Nueva Perspectiva)'
              : 'Profundizar con IA (1 Crédito)'}
          </button>
        </div>
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
              Has agotado tus créditos para lecturas con IA. Puedes ver la síntesis esencial incluida abajo o recargar créditos para un informe biográfico ampliado.
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

      {/* Mode Indicator Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-stone-950/60 border border-stone-800/80 rounded-xl text-xs text-stone-400">
        <div className="flex items-center gap-2">
          {viewMode === 'ai' && aiReading ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 font-medium">
                Viendo Lectura Biográfica con IA {regenerationCount > 1 ? `(Perspectiva #${regenerationCount})` : ''}
              </span>
            </>
          ) : (
            <>
              <BookOpen className="w-3.5 h-3.5 text-stone-400" />
              <span>Viendo Resumen Estructural Esencial (Cálculo Nativo)</span>
            </>
          )}
        </div>
        <div className="text-[11px] text-stone-500 hidden sm:block">
          Formato Markdown Enriquecido
        </div>
      </div>

      {/* Reading Text Container with Full Markdown Rendering */}
      <div className="p-6 bg-stone-950 rounded-xl border border-stone-800 text-stone-200 shadow-inner print:bg-white print:text-black print:border-none">
        <MarkdownRenderer content={activeContent} />
      </div>
    </div>
  );
};
