import React, { useState } from 'react';
import { PlanetPosition, TransitAspect } from '../types';
import { Orbit, Sparkles, AlertTriangle, CheckCircle, Calendar, Lightbulb, MapPin } from 'lucide-react';
import { getTransitExplanation } from '../utils/transitExplanations';

interface TransitsPanelProps {
  transitDate: string;
  transitPlanets: PlanetPosition[];
  activeTransits: TransitAspect[];
}

export const TransitsPanel: React.FC<TransitsPanelProps> = ({
  transitDate,
  transitPlanets,
  activeTransits,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'major' | 'challenging' | 'harmonious'>('major');

  const filteredTransits = activeTransits.filter((t) => {
    if (filterType === 'major') return t.isMajor;
    if (filterType === 'challenging') return t.nature === 'challenging';
    if (filterType === 'harmonious') return t.nature === 'harmonious';
    return true;
  });

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Orbit className="w-3.5 h-3.5 text-amber-400" />
              Reloj Cósmico en Tiempo Real
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-stone-800 text-stone-300 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-stone-400" />
              {transitDate}
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 mt-2">
            Visualización de Tránsitos Planetarios Activos
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Los planetas actuales en el firmamento activan puntos sensibles de tu carta natal, sincronizándose con los hitos del septenio.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setFilterType('major')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              filterType === 'major'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Tránsitos Mayores ({activeTransits.filter((t) => t.isMajor).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Todos ({activeTransits.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('challenging')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              filterType === 'challenging'
                ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Tensión evolutiva
          </button>
          <button
            type="button"
            onClick={() => setFilterType('harmonious')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              filterType === 'harmonious'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Flujo armónico
          </button>
        </div>
      </div>

      {/* Mini Sky Weather Strip */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          Posiciones Planetarias Actuales en el Cielo:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {transitPlanets
            .filter((p) => !['ascendant', 'midheaven', 'southNode'].includes(p.id))
            .map((planet) => (
              <div
                key={planet.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-950 border border-stone-800 rounded-xl shrink-0 text-xs text-stone-300"
              >
                <span className="text-sm font-bold text-amber-400">{planet.symbol}</span>
                <span className="text-stone-200 font-medium">{planet.name}:</span>
                <span className="text-stone-400">
                  {planet.degreeInSign}° {planet.sign}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Active Transits Cards */}
      <div className="space-y-3.5">
        {filteredTransits.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400 bg-stone-950 rounded-xl border border-stone-800">
            No se encontraron tránsitos con el filtro seleccionado.
          </div>
        ) : (
          filteredTransits.map((transit) => {
            const isTense = transit.nature === 'challenging';
            const isHarmonious = transit.nature === 'harmonious';

            const rawTransitPlanetName = transit.transitPlanet.name.replace(' en Tránsito', '');

            // Fallback or full details
            const explanationData =
              transit.simpleExplanation && transit.practicalTip && transit.activatedHouseArea
                ? {
                    simpleExplanation: transit.simpleExplanation,
                    practicalTip: transit.practicalTip,
                    activatedHouseArea: transit.activatedHouseArea,
                  }
                : getTransitExplanation({
                    transitPlanetId: transit.transitPlanet.id,
                    transitPlanetName: rawTransitPlanetName,
                    transitSign: transit.transitPlanet.sign,
                    natalPlanetId: transit.natalPlanet.id,
                    natalPlanetName: transit.natalPlanet.name,
                    natalSign: transit.natalPlanet.sign,
                    natalHouse: transit.natalPlanet.house,
                    aspectType: transit.aspectType,
                    nature: transit.nature,
                    aspectName:
                      transit.aspectType === 'conjunction'
                        ? 'Conjunción'
                        : transit.aspectType === 'trine'
                        ? 'Trígono'
                        : transit.aspectType === 'square'
                        ? 'Cuadratura'
                        : transit.aspectType === 'opposition'
                        ? 'Oposición'
                        : 'Sextil',
                  });

            return (
              <div
                key={transit.id}
                className="p-4 sm:p-5 bg-stone-950/90 border border-stone-800 hover:border-stone-700 rounded-xl transition-all space-y-3.5"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-indigo-500/10 border border-stone-700 flex items-center justify-center text-amber-400 font-bold text-lg shadow-inner">
                      {transit.transitPlanet.symbol}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm sm:text-base text-stone-100 flex flex-wrap items-center gap-2">
                        <span>{transit.name}</span>
                        {transit.isMajor && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Tránsito Mayor
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                        <span className="text-amber-300 font-medium">
                          {transit.transitPlanet.symbol} {rawTransitPlanetName} en {transit.transitPlanet.sign} ({transit.transitPlanet.degreeInSign}°)
                        </span>
                        <span className="text-stone-500">activando a</span>
                        <span className="text-stone-200 font-medium">
                          {transit.natalPlanet.symbol} {transit.natalPlanet.name} natal en {transit.natalPlanet.sign} (Casa {transit.natalPlanet.house})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                        isTense
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          : isHarmonious
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {isTense ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      {isTense ? 'Tensión evolutiva' : isHarmonious ? 'Flujo armónico' : 'Aspecto activo'} • Orbe {transit.orb}°
                    </span>
                  </div>
                </div>

                {/* Explicación Sencilla y Corta */}
                <div className="bg-stone-900/80 p-3.5 rounded-xl border border-stone-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>¿Qué significa este tránsito? (Explicación sencilla)</span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-stone-200 leading-relaxed">
                    {explanationData.simpleExplanation}
                  </p>
                </div>

                {/* Grid con Casa activada y Consejo práctico */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-0.5">
                  <div className="flex items-start gap-2 bg-stone-900/40 p-2.5 rounded-lg border border-stone-800/80 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[11px] font-semibold text-indigo-300 block">
                        Área de vida activada:
                      </span>
                      <span className="text-stone-300 text-[11px] leading-relaxed">
                        {explanationData.activatedHouseArea}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-stone-900/40 p-2.5 rounded-lg border border-stone-800/80 text-xs">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[11px] font-semibold text-amber-300 block">
                        Recomendación práctica:
                      </span>
                      <span className="text-stone-300 text-[11px] leading-relaxed">
                        {explanationData.practicalTip}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

