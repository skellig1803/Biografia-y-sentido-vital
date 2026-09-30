import React from 'react';
import { YearOfLifeAnalysis } from '../types';
import { SunMedium, Calendar, Sparkles, Compass, Lightbulb, CheckCircle2 } from 'lucide-react';

interface YearOfLifeCardProps {
  yearOfLife: YearOfLifeAnalysis;
}

export const YearOfLifeCard: React.FC<YearOfLifeCardProps> = ({ yearOfLife }) => {
  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <SunMedium className="w-3.5 h-3.5 text-amber-400" />
              Ciclo Anual de Profección & Retorno Solar
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-stone-800 text-stone-300">
              Casa {yearOfLife.profectionHouse} en {yearOfLife.profectionSign}
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 mt-2">
            Análisis General del Año de Vida Actual ({yearOfLife.currentYearOfLife}° Año)
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Con {yearOfLife.completedYears} años cumplidos, estás transitando tu año {yearOfLife.currentYearOfLife} de vida. Regido por <strong className="text-amber-300">{yearOfLife.lordOfYear}</strong>.
          </p>
        </div>

        <div className="bg-stone-950 px-4 py-2 rounded-xl border border-stone-800 text-right shrink-0">
          <span className="text-[10px] uppercase font-bold text-stone-500 block">Regente del Año</span>
          <span className="text-sm font-serif font-bold text-amber-400">{yearOfLife.lordOfYear}</span>
        </div>
      </div>

      {/* Core Theme Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-stone-900 to-stone-900 border border-amber-500/20 rounded-xl">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
          Tema Central del Año:
        </span>
        <h3 className="font-serif text-base sm:text-lg font-semibold text-stone-100 mb-2">
          {yearOfLife.annualCoreTheme}
        </h3>
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
          {yearOfLife.anthroposophicYearEnergy}
        </p>
      </div>

      {/* Directives and Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Directivas Clave */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-amber-400" />
            Directivas Clave para este Año de Vida
          </h4>
          <ul className="space-y-2 text-xs text-stone-300">
            {yearOfLife.keyDirectives.map((directive, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{directive}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recomendaciones Prácticas */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Recomendaciones Prácticas & Vitales
          </h4>
          <ul className="space-y-2 text-xs text-stone-300">
            {yearOfLife.vitalRecommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
