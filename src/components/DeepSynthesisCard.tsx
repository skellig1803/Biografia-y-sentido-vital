import React, { useState } from 'react';
import { NatalChartCalculationResult } from '../types';
import { Sparkles, BookOpen, Copy, Check, Printer, RefreshCw } from 'lucide-react';

interface DeepSynthesisCardProps {
  calculation: NatalChartCalculationResult;
}

export const DeepSynthesisCard: React.FC<DeepSynthesisCardProps> = ({ calculation }) => {
  const [aiReading, setAiReading] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sun = calculation.planets.find((p) => p.id === 'sun');
  const moon = calculation.planets.find((p) => p.id === 'moon');
  const ascendant = calculation.planets.find((p) => p.id === 'ascendant');

  const generateDefaultSynthesis = () => {
    return `### 1. La Esencia Biográfica y el Reto del Septenio Presente
Te encuentras transitando el **${calculation.currentSeptenio.number}° Septenio (${calculation.currentSeptenio.ageRange})**, titulado *"**${calculation.currentSeptenio.archetypalTitle}**"*, perteneciente a la fase de **${calculation.currentSeptenio.phase}** y gobernado por la esfera de **${calculation.currentSeptenio.planetarySphere}**. 

Con **${calculation.exactAge.formatted}**, tu ser interior confronta la pregunta arquetípica: *"${calculation.currentSeptenio.coreQuestion}"*. A esta edad precisa, el organismo ya no sostiene automáticamente las fuerzas juveniles sin esfuerzo consciente; la antroposofía enseña que la verdadera individualidad del Yo debe tomar el timón de la existencia. Tu principal desafío consiste en soltar las máscaras y mandatos sociales que ya no te pertenecen para cultivar una autenticidad radical.

---

### 2. La Brújula del Alma: El Eje de los Nodos Lunares
Tu **Nodo Norte en ${calculation.lunarNodes.northNode.sign} (Casa ${calculation.lunarNodes.northNode.house})** marca con nitidez la brújula evolutiva de tu encarnación:
- **La Dirección a Tomar:** ${calculation.lunarNodes.northNode.dharmaDirection}
- **La Lección del Alma:** ${calculation.lunarNodes.northNode.soulLesson}
- **La Trampa a Trascender:** Con tu **Nodo Sur en ${calculation.lunarNodes.southNode.sign} (Casa ${calculation.lunarNodes.southNode.house})**, tiendes a refugiarte inconscientemente en: *${calculation.lunarNodes.southNode.comfortZoneTrap}*. Aunque posees dones innatos en este signo, usarlos como refugio estanca tu crecimiento. El cosmos te exige avanzar con coraje hacia la energía de ${calculation.lunarNodes.northNode.sign}.

---

### 3. El Clima Vital del Año de Vida Actual
Con ${calculation.yearOfLife.completedYears} años cumplidos, estás viviendo tu **año ${calculation.yearOfLife.currentYearOfLife} de vida**, el cual activa la **Casa ${calculation.yearOfLife.profectionHouse} astrológica en ${calculation.yearOfLife.profectionSign}**, regido este año por el planeta **${calculation.yearOfLife.lordOfYear}**.
- **Tema Central Anual:** ${calculation.yearOfLife.annualCoreTheme}
- **Directriz de Oro:** ${calculation.yearOfLife.keyDirectives[0]}

---

### 4. Alquimia de los Tránsitos: Mensaje del Cielo
El firmamento actual cuenta con tránsitos clave impactando tu carta natal. Destacan:
${calculation.currentTransits.activeTransits.slice(0, 3).map((t) => `- **${t.name}**: ${t.simpleExplanation || t.biographicalImpact}`).join('\n')}

**Consejo Integrador:** Abraza el ritmo sagrado de tu biografía. Las crisis no son desvíos en el camino, sino los dolores de parto de un Yo más despierto, libre y compasivo.`;
  };

  const handleFetchAiReading = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: calculation.birthData.name,
          birthDate: calculation.birthData.birthDate,
          birthTime: calculation.birthData.birthTime,
          placeName: calculation.birthData.placeName,
          exactAgeFormatted: calculation.exactAge.formatted,
          currentSeptenio: calculation.currentSeptenio,
          lunarNodes: calculation.lunarNodes,
          yearOfLife: calculation.yearOfLife,
          sunSign: sun?.sign || 'Aries',
          moonSign: moon?.sign || 'Tauro',
          ascendantSign: ascendant?.sign || 'Géminis',
          activeTransits: calculation.currentTransits.activeTransits,
        }),
      });

      const data = await response.json();
      if (data.success && data.reading) {
        setAiReading(data.reading);
      } else {
        // Fallback to built-in deep synthesis
        setAiReading(generateDefaultSynthesis());
      }
    } catch (err: any) {
      console.warn('AI endpoint fallback:', err);
      setAiReading(generateDefaultSynthesis());
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = aiReading || generateDefaultSynthesis();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentContent = aiReading || generateDefaultSynthesis();

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Lectura Integrativa Completa
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 mt-2">
            Síntesis Biográfica del Alma & Clima de Tránsitos
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Integración de la carta natal, el eje nodal kármico, el septenio antroposófico y los tránsitos celestes para {calculation.birthData.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            {isLoading ? 'Sintetizando...' : 'Profundizar con IA'}
          </button>
        </div>
      </div>

      {/* Reading Text Container */}
      <div className="p-6 bg-stone-950 rounded-xl border border-stone-800 text-stone-200 text-sm leading-relaxed space-y-4 font-sans print:bg-white print:text-black print:border-none">
        {currentContent.split('\n\n').map((paragraph, index) => {
          if (paragraph.startsWith('### ')) {
            return (
              <h3
                key={index}
                className="font-serif text-base sm:text-lg font-bold text-amber-300 pt-3 first:pt-0 pb-1 border-b border-stone-800"
              >
                {paragraph.replace('### ', '')}
              </h3>
            );
          }
          if (paragraph.trim() === '---') {
            return <hr key={index} className="border-stone-800 my-4" />;
          }
          return (
            <p key={index} className="text-stone-300 leading-relaxed">
              {paragraph}
            </p>
          );
        })}
      </div>
    </div>
  );
};
