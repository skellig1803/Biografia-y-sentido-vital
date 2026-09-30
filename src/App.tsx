import React, { useState, useEffect } from 'react';
import { BirthData, NatalChartCalculationResult } from './types';
import { calculateCompleteChart, calculateSwissChartAsync } from './utils/calculator';
import { Header } from './components/Header';
import { BirthDataForm } from './components/BirthDataForm';
import { KeyMetricsBar } from './components/KeyMetricsBar';
import { SeptenioTimeline } from './components/SeptenioTimeline';
import { LunarNodeCompass } from './components/LunarNodeCompass';
import { YearOfLifeCard } from './components/YearOfLifeCard';
import { TransitsPanel } from './components/TransitsPanel';
import { DeepSynthesisCard } from './components/DeepSynthesisCard';
import { PlanetaryTable } from './components/PlanetaryTable';
import {
  TableProperties,
  Compass,
  Clock,
  SunMedium,
  BookOpen,
  Sparkles,
  ShieldCheck,
  MapPin,
  Calendar,
  Globe2,
  ArrowRight,
} from 'lucide-react';

const DEFAULT_BIRTH_DATA: BirthData = {
  name: 'Rudolf Steiner',
  birthDate: '1861-02-27',
  birthTime: '23:15',
  placeName: 'Donji Kraljevec, Croatia',
  latitude: 43.367,
  longitude: 16.650,
  timezoneOffset: 1.11,
};

type ActiveTab = 'overview' | 'septenio' | 'lunarNodes' | 'yearOfLife' | 'transits' | 'synthesis';

export default function App() {
  const [birthData, setBirthData] = useState<BirthData>(DEFAULT_BIRTH_DATA);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSwissPrecision, setIsSwissPrecision] = useState(true);

  // Initialize with local calculation and update with Swiss Ephemeris
  const [calculationResult, setCalculationResult] = useState<NatalChartCalculationResult>(() => {
    return calculateCompleteChart(DEFAULT_BIRTH_DATA);
  });

  // Calculate high-precision Swiss Ephemeris whenever birthData changes
  useEffect(() => {
    let isMounted = true;
    setIsCalculating(true);

    calculateSwissChartAsync(birthData)
      .then((res) => {
        if (isMounted) {
          setCalculationResult(res);
          setIsSwissPrecision(true);
        }
      })
      .catch((err) => {
        console.warn('Fallback to local calculation:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsCalculating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [birthData]);

  const handleCalculate = (newData: BirthData) => {
    setBirthData(newData);
  };

  const ascendantPlanet = calculationResult.planets.find((p) => p.id === 'ascendant');
  const midheavenPlanet = calculationResult.planets.find((p) => p.id === 'midheaven');

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Planetas & Casas', icon: <TableProperties className="w-4 h-4" /> },
    { id: 'septenio', label: 'Septenio Biográfico', icon: <Clock className="w-4 h-4" />, badge: `S${calculationResult.currentSeptenio.number}` },
    { id: 'lunarNodes', label: 'Nodo Lunar & Dirección', icon: <Compass className="w-4 h-4" />, badge: calculationResult.lunarNodes.northNode.sign },
    { id: 'yearOfLife', label: 'Año de Vida', icon: <SunMedium className="w-4 h-4" />, badge: `Año ${calculationResult.yearOfLife.currentYearOfLife}` },
    { id: 'transits', label: 'Tránsitos Planetarios', icon: <Sparkles className="w-4 h-4" />, badge: `${calculationResult.currentTransits.activeTransits.length}` },
    { id: 'synthesis', label: 'Lectura Integral', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      <Header hasCalculated={true} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Formulario de Entrada */}
        <BirthDataForm
          initialData={birthData}
          onCalculate={handleCalculate}
          isLoading={isCalculating}
        />

        {/* Resumen Superior de Métricas */}
        <KeyMetricsBar calculation={calculationResult} />

        {/* Barra de Navegación de Pestañas */}
        <div className="border-b border-stone-800 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                      isActive ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Banner de Verificación Astronómica con Efemérides Suizas */}
              <div className="bg-gradient-to-r from-stone-900 via-stone-900/90 to-stone-950 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Motor Astronómico: Efemérides Suizas (Swiss Ephemeris)
                      </span>
                      {isCalculating && (
                        <span className="text-xs text-amber-400 animate-pulse">
                          Recalculando efemérides...
                        </span>
                      )}
                    </div>
                    <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-100">
                      Carta Natal Biográfica de {birthData.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-400 max-w-3xl leading-relaxed">
                      Cálculo geocéntrico tropical verificado matemáticamente. Sistema de casas Plácidus, corrección de refracción aparente, tiempo sideral Greenwich y posiciones precisas de los 10 planetas, Quirón, Nodos Lunares, Ascendente y Medio Cielo.
                    </p>
                  </div>

                  {/* Badges de Coordenadas y Tiempo */}
                  <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2 text-xs font-mono shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-300">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>{birthData.birthDate}</span>
                      <span className="text-stone-500">•</span>
                      <span>{birthData.birthTime}</span>
                      <span className="text-amber-400">
                        (UTC{birthData.timezoneOffset >= 0 ? `+${birthData.timezoneOffset}` : birthData.timezoneOffset})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{birthData.placeName}</span>
                      <span className="text-stone-500">•</span>
                      <span>
                        {birthData.latitude.toFixed(2)}°N, {Math.abs(birthData.longitude).toFixed(2)}°{birthData.longitude >= 0 ? 'E' : 'O'}
                      </span>
                    </div>

                    {ascendantPlanet && midheavenPlanet && (
                      <div className="flex items-center gap-2 text-[11px] text-stone-400">
                        <span>
                          AC: <strong className="text-amber-300">{ascendantPlanet.sign} {ascendantPlanet.degreeInSign}°{ascendantPlanet.minuteInSign}&apos;</strong>
                        </span>
                        <span>•</span>
                        <span>
                          MC: <strong className="text-amber-300">{midheavenPlanet.sign} {midheavenPlanet.degreeInSign}°{midheavenPlanet.minuteInSign}&apos;</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Métricas clave resumidas de la persona */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
                  <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800/80">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Sol Natal</span>
                    <div className="font-semibold text-stone-100 flex items-center gap-1.5 mt-0.5">
                      <span className="text-amber-400 font-bold">☉</span>
                      <span>{calculationResult.planets[0]?.sign} {calculationResult.planets[0]?.degreeInSign}°{calculationResult.planets[0]?.minuteInSign}&apos;</span>
                    </div>
                    <span className="text-[11px] text-stone-400 block mt-0.5">Casa {calculationResult.planets[0]?.house}</span>
                  </div>

                  <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800/80">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Luna Natal</span>
                    <div className="font-semibold text-stone-100 flex items-center gap-1.5 mt-0.5">
                      <span className="text-indigo-300 font-bold">☽</span>
                      <span>{calculationResult.planets[1]?.sign} {calculationResult.planets[1]?.degreeInSign}°{calculationResult.planets[1]?.minuteInSign}&apos;</span>
                    </div>
                    <span className="text-[11px] text-stone-400 block mt-0.5">Casa {calculationResult.planets[1]?.house}</span>
                  </div>

                  <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800/80">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Ascendente (AC)</span>
                    <div className="font-semibold text-stone-100 flex items-center gap-1.5 mt-0.5">
                      <span className="text-orange-400 font-bold">AC</span>
                      <span>{ascendantPlanet?.sign} {ascendantPlanet?.degreeInSign}°{ascendantPlanet?.minuteInSign}&apos;</span>
                    </div>
                    <span className="text-[11px] text-stone-400 block mt-0.5">Puerta de encarnación</span>
                  </div>

                  <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800/80">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Nodo Norte (Dharma)</span>
                    <div className="font-semibold text-stone-100 flex items-center gap-1.5 mt-0.5">
                      <span className="text-emerald-400 font-bold">☊</span>
                      <span>{calculationResult.lunarNodes.northNode.sign} {calculationResult.lunarNodes.northNode.degreeInSign}°</span>
                    </div>
                    <span className="text-[11px] text-stone-400 block mt-0.5">Casa {calculationResult.lunarNodes.northNode.house}</span>
                  </div>
                </div>
              </div>

              {/* Catálogo Completo de Posiciones Planetarias, Casas y Aspectario */}
              <PlanetaryTable
                planets={calculationResult.planets}
                houses={calculationResult.houses}
                aspects={calculationResult.aspects}
                birthData={calculationResult.birthData}
              />

              {/* 3 Tarjetas de Síntesis Biográfica y Acceso Rápido */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Septenio Actual */}
                <div className="bg-stone-900/90 border border-stone-800 hover:border-amber-500/40 rounded-2xl p-5 space-y-3 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300">
                        Septenio {calculationResult.currentSeptenio.number}: {calculationResult.currentSeptenio.ageRange}
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        {calculationResult.exactAge.formatted}
                      </span>
                    </div>
                    <h3 className="font-serif text-base font-bold text-stone-100">
                      {calculationResult.currentSeptenio.archetypalTitle}
                    </h3>
                    <p className="text-xs text-stone-400 italic">
                      &ldquo;{calculationResult.currentSeptenio.coreQuestion}&rdquo;
                    </p>
                    <div className="pt-1">
                      <span className="text-[11px] font-semibold text-stone-400 block mb-1">
                        Reto antroposófico:
                      </span>
                      <p className="text-xs text-stone-300 bg-stone-950 p-2.5 rounded-lg border border-stone-800 leading-relaxed">
                        {calculationResult.currentSeptenio.ageSpecificChallenges[0]}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('septenio')}
                    className="w-full mt-3 py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/40 text-xs font-medium text-amber-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Explorar guía del Septenio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Eje Nodal */}
                <div className="bg-stone-900/90 border border-stone-800 hover:border-emerald-500/40 rounded-2xl p-5 space-y-3 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                        ☊ Eje Nodal Evolutivo
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        Karma ↔ Dharma
                      </span>
                    </div>
                    <h3 className="font-serif text-base font-bold text-stone-100">
                      De {calculationResult.lunarNodes.southNode.sign} a {calculationResult.lunarNodes.northNode.sign}
                    </h3>
                    <p className="text-xs text-stone-400">
                      Nodo Norte en Casa {calculationResult.lunarNodes.northNode.house} • Nodo Sur en Casa {calculationResult.lunarNodes.southNode.house}
                    </p>
                    <div className="pt-1">
                      <span className="text-[11px] font-semibold text-stone-400 block mb-1">
                        Dirección del alma:
                      </span>
                      <p className="text-xs text-stone-300 bg-stone-950 p-2.5 rounded-lg border border-stone-800 leading-relaxed">
                        {calculationResult.lunarNodes.northNode.dharmaDirection}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('lunarNodes')}
                    className="w-full mt-3 py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-emerald-500/40 text-xs font-medium text-emerald-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Abrir Brújula Nodal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Año de Vida */}
                <div className="bg-stone-900/90 border border-stone-800 hover:border-purple-500/40 rounded-2xl p-5 space-y-3 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-300">
                        Año {calculationResult.yearOfLife.currentYearOfLife} de Vida
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        Profeción Anual
                      </span>
                    </div>
                    <h3 className="font-serif text-base font-bold text-stone-100">
                      {calculationResult.yearOfLife.annualCoreTheme}
                    </h3>
                    <p className="text-xs text-stone-400">
                      Regente anual: <strong className="text-amber-300">{calculationResult.yearOfLife.lordOfYear}</strong> (Casa {calculationResult.yearOfLife.profectionHouse})
                    </p>
                    <div className="pt-1">
                      <span className="text-[11px] font-semibold text-stone-400 block mb-1">
                        Casa activada {calculationResult.yearOfLife.profectionHouse}:
                      </span>
                      <p className="text-xs text-stone-300 bg-stone-950 p-2.5 rounded-lg border border-stone-800 leading-relaxed">
                        {calculationResult.yearOfLife.activatedHouseTheme}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('yearOfLife')}
                    className="w-full mt-3 py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-purple-500/40 text-xs font-medium text-purple-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Ver análisis anual completo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'septenio' && (
            <SeptenioTimeline
              currentSeptenio={calculationResult.currentSeptenio}
              allSeptenios={calculationResult.allSeptenios}
              exactAgeFormatted={calculationResult.exactAge.formatted}
              exactAgeYears={calculationResult.exactAge.years}
            />
          )}

          {activeTab === 'lunarNodes' && (
            <LunarNodeCompass
              lunarNodes={calculationResult.lunarNodes}
              septenioTitle={calculationResult.currentSeptenio.archetypalTitle}
            />
          )}

          {activeTab === 'yearOfLife' && (
            <YearOfLifeCard yearOfLife={calculationResult.yearOfLife} />
          )}

          {activeTab === 'transits' && (
            <TransitsPanel
              transitDate={calculationResult.currentTransits.transitDate}
              transitPlanets={calculationResult.currentTransits.transitPlanets}
              activeTransits={calculationResult.currentTransits.activeTransits}
            />
          )}

          {activeTab === 'synthesis' && (
            <DeepSynthesisCard calculation={calculationResult} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800 bg-stone-900/50 py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Carta Natal y Biografía Antroposófica • Cálculos astronómicos, eje kármico de Steiner & tránsitos en tiempo real
          </p>
          <div className="flex items-center gap-4 text-stone-400">
            <span>Rudolf Steiner</span>
            <span>•</span>
            <span>Bernard Lievegoed</span>
            <span>•</span>
            <span>Astrología Humanista</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
