import React from 'react';
import { NatalChartCalculationResult } from '../types';
import { Sun, Moon, Compass, Calendar, ShieldAlert, Sparkles } from 'lucide-react';

interface KeyMetricsBarProps {
  calculation: NatalChartCalculationResult;
}

export const KeyMetricsBar: React.FC<KeyMetricsBarProps> = ({ calculation }) => {
  const sun = calculation.planets.find((p) => p.id === 'sun');
  const moon = calculation.planets.find((p) => p.id === 'moon');
  const ascendant = calculation.planets.find((p) => p.id === 'ascendant');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Sol */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
          ☉
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-stone-500 block truncate">Sol Natal</span>
          <span className="text-xs font-semibold text-stone-200 truncate block">
            {sun?.degreeInSign}° {sun?.sign}
          </span>
        </div>
      </div>

      {/* Luna */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-lg">
          ☽
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-stone-500 block truncate">Luna Natal</span>
          <span className="text-xs font-semibold text-stone-200 truncate block">
            {moon?.degreeInSign}° {moon?.sign}
          </span>
        </div>
      </div>

      {/* Ascendente */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-xs">
          AC
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-stone-500 block truncate">Ascendente</span>
          <span className="text-xs font-semibold text-stone-200 truncate block">
            {ascendant?.degreeInSign}° {ascendant?.sign}
          </span>
        </div>
      </div>

      {/* Nodo Norte */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
          ☊
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-stone-500 block truncate">Nodo Norte</span>
          <span className="text-xs font-semibold text-emerald-300 truncate block">
            {calculation.lunarNodes.northNode.sign} (C{calculation.lunarNodes.northNode.house})
          </span>
        </div>
      </div>

      {/* Septenio Actual */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
          S{calculation.currentSeptenio.number}
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-stone-500 block truncate">Septenio Actual</span>
          <span className="text-xs font-semibold text-amber-300 truncate block">
            {calculation.currentSeptenio.ageRange}
          </span>
        </div>
      </div>

      {/* Año de Vida */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs">
          C{calculation.yearOfLife.profectionHouse}
        </div>
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-stone-500 block truncate">Año {calculation.yearOfLife.currentYearOfLife} de Vida</span>
          <span className="text-xs font-semibold text-purple-300 truncate block">
            Regente {calculation.yearOfLife.lordOfYear}
          </span>
        </div>
      </div>
    </div>
  );
};
