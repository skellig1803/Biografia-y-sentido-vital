import React, { useState } from 'react';
import { PlanetPosition, HouseCusp, Aspect, BirthData, ZodiacSign } from '../types';
import {
  Table,
  CheckCircle2,
  Compass,
  Sparkles,
  GitCommit,
  ShieldCheck,
  Search,
  Filter,
  Info,
} from 'lucide-react';

interface PlanetaryTableProps {
  planets: PlanetPosition[];
  houses?: HouseCusp[];
  aspects?: Aspect[];
  birthData?: BirthData;
}

const SIGN_ELEMENTS: Record<ZodiacSign, { element: string; color: string; bg: string }> = {
  Aries: { element: 'Fuego', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  Leo: { element: 'Fuego', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  Sagitario: { element: 'Fuego', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  Tauro: { element: 'Tierra', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Virgo: { element: 'Tierra', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Capricornio: { element: 'Tierra', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  Géminis: { element: 'Aire', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  Libra: { element: 'Aire', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  Acuario: { element: 'Aire', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  Cáncer: { element: 'Agua', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  Escorpio: { element: 'Agua', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  Piscis: { element: 'Agua', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
};

type ViewMode = 'planets' | 'houses' | 'aspects';

export const PlanetaryTable: React.FC<PlanetaryTableProps> = ({
  planets,
  houses = [],
  aspects = [],
  birthData,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('planets');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter planets by category
  const filteredPlanets = planets.filter((planet) => {
    // Search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const matches =
        planet.name.toLowerCase().includes(query) ||
        planet.sign.toLowerCase().includes(query) ||
        planet.meaning.toLowerCase().includes(query);
      if (!matches) return false;
    }

    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'personal') {
      return ['sun', 'moon', 'mercury', 'venus', 'mars'].includes(planet.id);
    }
    if (categoryFilter === 'social') {
      return ['jupiter', 'saturn'].includes(planet.id);
    }
    if (categoryFilter === 'transpersonal') {
      return ['uranus', 'neptune', 'pluto', 'chiron'].includes(planet.id);
    }
    if (categoryFilter === 'axes') {
      return ['ascendant', 'midheaven', 'northNode', 'southNode'].includes(planet.id);
    }
    return true;
  });

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header with Astronomical Guarantee Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg font-bold text-stone-100 flex items-center gap-2">
              <Table className="w-5 h-5 text-amber-400" />
              Catálogo de Posiciones Planetarias & Casas
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Efemérides Suizas Verificadas
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Cálculo astronómico de alta precisión: grados, minutos de arco, casas Plácidus y aspectos natales.
          </p>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('planets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'planets'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Planetas ({planets.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('houses')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'houses'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            12 Casas ({houses.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('aspects')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'aspects'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Aspectario ({aspects.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: PLANETS */}
      {viewMode === 'planets' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'personal', label: 'Personales (☉ ☽ ☿ ♀ ♂)' },
                { id: 'social', label: 'Sociales (♃ ♄)' },
                { id: 'transpersonal', label: 'Transpersonales (♅ ♆ ♇ ⚷)' },
                { id: 'axes', label: 'Ejes & Nodos (AC MC ☊ ☋)' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-stone-800 text-amber-300 border border-amber-500/30'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar planeta o signo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs text-stone-300">
              <thead>
                <tr className="bg-stone-950/80 border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3.5">Cuerpo Celeste</th>
                  <th className="py-3 px-3.5">Signo & Elemento</th>
                  <th className="py-3 px-3.5">Grado Exacto</th>
                  <th className="py-3 px-3.5">Casa (Plácidus)</th>
                  <th className="py-3 px-3.5">Movimiento</th>
                  <th className="py-3 px-3.5">Significado Esencial & Arquetipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-sans">
                {filteredPlanets.map((planet) => {
                  const elemInfo = SIGN_ELEMENTS[planet.sign];
                  return (
                    <tr key={planet.id} className="hover:bg-stone-800/30 transition-colors">
                      <td className="py-3 px-3.5 font-medium text-stone-100">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="text-lg font-bold w-6 text-center shrink-0"
                            style={{ color: planet.color }}
                          >
                            {planet.symbol}
                          </span>
                          <div>
                            <span className="font-semibold text-stone-100 block">{planet.name}</span>
                            <span className="text-[10px] text-stone-500 font-mono">
                              {planet.longitude.toFixed(2)}° eclíptica
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded font-medium bg-stone-950 border border-stone-800 text-stone-200">
                            {planet.sign}
                          </span>
                          {elemInfo && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] border ${elemInfo.bg} ${elemInfo.color}`}
                            >
                              {elemInfo.element}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-stone-200">
                        <span className="font-semibold text-amber-300">
                          {planet.degreeInSign}° {planet.minuteInSign.toString().padStart(2, '0')}&apos;
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded font-semibold text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Casa {planet.house}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        {planet.isRetrograde ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Retrógrado ℞
                          </span>
                        ) : (
                          <span className="text-stone-500 text-[10px]">Directo</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-stone-400 max-w-sm leading-relaxed">
                        {planet.meaning}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: HOUSES */}
      {viewMode === 'houses' && (
        <div className="space-y-4">
          <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800 text-xs text-stone-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              El <strong>Sistema Plácidus</strong> divide el espacio geocéntrico según el tiempo semidiurno y seminocturno de los grados zodiacales. Las 4 esquinas cardinales (Casa 1 / Ascendente, Casa 4 / Fondo del Cielo, Casa 7 / Descendente y Casa 10 / Medio Cielo) constituyen la estructura angular de la biografía.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {houses.map((house) => {
              const isAngle = [1, 4, 7, 10].includes(house.house);
              const angleName =
                house.house === 1
                  ? 'Ascendente (AC)'
                  : house.house === 4
                  ? 'Fondo del Cielo (IC)'
                  : house.house === 7
                  ? 'Descendente (DC)'
                  : house.house === 10
                  ? 'Medio Cielo (MC)'
                  : null;

              const elemInfo = SIGN_ELEMENTS[house.sign];

              return (
                <div
                  key={house.house}
                  className={`p-4 rounded-xl border transition-all ${
                    isAngle
                      ? 'bg-stone-950 border-amber-500/40 shadow-sm'
                      : 'bg-stone-950/70 border-stone-800/80 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-stone-800/70">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          isAngle ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-300'
                        }`}
                      >
                        {house.house}
                      </span>
                      <span className="font-serif font-bold text-stone-100 text-sm">
                        Casa {house.house}
                      </span>
                    </div>
                    {angleName && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {angleName}
                      </span>
                    )}
                  </div>

                  <div className="pt-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400">Cúspide:</span>
                      <span className="font-mono font-semibold text-amber-300">
                        {house.degreeInSign}° {house.minuteInSign.toString().padStart(2, '0')}&apos; {house.sign}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-400">Elemento:</span>
                      {elemInfo && (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] border ${elemInfo.bg} ${elemInfo.color}`}>
                          {elemInfo.element}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-stone-400 pt-1 border-t border-stone-800/50 leading-relaxed">
                      {house.theme}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: ASPECTS */}
      {viewMode === 'aspects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>
              Total de aspectos mayores calculados: <strong>{aspects.length}</strong>
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Armónicos (Trígono / Sextil)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Dinámicos (Cuadratura / Oposición)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Conjunción
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-left text-xs text-stone-300">
              <thead>
                <tr className="bg-stone-950/80 border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3.5">Planetas en Relación</th>
                  <th className="py-3 px-3.5">Tipo de Aspecto</th>
                  <th className="py-3 px-3.5">Ángulo Exacto & Orbe</th>
                  <th className="py-3 px-3.5">Naturaleza</th>
                  <th className="py-3 px-3.5">Interpretación Esencial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-sans">
                {aspects.map((asp) => {
                  const isHarmonious = asp.nature === 'harmonious';
                  const isChallenging = asp.nature === 'challenging';
                  return (
                    <tr key={asp.id} className="hover:bg-stone-800/30 transition-colors">
                      <td className="py-3 px-3.5 font-medium text-stone-100">
                        <div className="flex items-center gap-2">
                          <span style={{ color: asp.planet1.color }} className="font-bold">
                            {asp.planet1.symbol} {asp.planet1.name}
                          </span>
                          <span className="text-stone-500 font-serif">↔</span>
                          <span style={{ color: asp.planet2.color }} className="font-bold">
                            {asp.planet2.symbol} {asp.planet2.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                          <span className="text-sm">{asp.symbol}</span>
                          {asp.name} ({asp.angle}°)
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-stone-300">
                        <span>{asp.exactAngle.toFixed(2)}°</span>
                        <span className="text-stone-500 text-[10px] block">
                          Orbe: {asp.orb.toFixed(2)}°
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        {isHarmonious && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Armónico
                          </span>
                        )}
                        {isChallenging && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Desafiante / Crecimiento
                          </span>
                        )}
                        {!isHarmonious && !isChallenging && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Síntesis Potente
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-stone-400 max-w-sm leading-relaxed">
                        {asp.interpretation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
