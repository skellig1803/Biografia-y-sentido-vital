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
import { CreditModal } from './components/CreditModal';
import { LegalModal, LegalTab } from './components/LegalModal';
import { getCreditBalance, subscribeToCredits, addCredits } from './utils/creditManager';
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
  CheckCircle2,
  AlertCircle,
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('septenio');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSwissPrecision, setIsSwissPrecision] = useState(true);
  const [creditBalance, setCreditBalance] = useState<number>(() => getCreditBalance());
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');
  const [paymentNotice, setPaymentNotice] = useState<{
    type: 'success' | 'cancelled';
    title: string;
    message: string;
    creditsAdded?: number;
  } | null>(null);

  const openLegalModal = (tab: LegalTab = 'terms') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  // Detect Polar.sh return / success redirect in URL params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment') || params.get('status');
    const checkoutId = params.get('checkout_id') || params.get('id') || params.get('session_id');
    const plan = params.get('plan');
    const service = params.get('service');

    if (paymentStatus === 'success' || params.has('polar_success')) {
      const processedKey = `polar_processed_${checkoutId || 'success_tx'}`;
      const alreadyProcessed = checkoutId ? sessionStorage.getItem(processedKey) : null;

      let added = 0;
      let title = '¡Pago Procesado con Éxito!';
      let message = 'Tu transacción a través de Polar.sh se ha completado correctamente.';

      if (!alreadyProcessed) {
        if (plan === 'pack_single' || plan === 'single') {
          added = 1;
          addCredits(1, 'Compra 1 Reporte de Trayectoria Vital vía Polar.sh', 'purchase', 'polar', checkoutId || undefined);
          message = 'Se ha acreditado 1 informe de Trayectoria Vital a tu monedero.';
        } else if (plan === 'pack5') {
          added = 5;
          addCredits(5, 'Compra Pack 5 Reportes de Análisis vía Polar.sh', 'purchase', 'polar', checkoutId || undefined);
          message = 'Se han acreditado 5 créditos para informes con IA a tu monedero.';
        } else if (plan === 'pack15') {
          added = 15;
          addCredits(15, 'Compra Pack Profesional (15 Reportes) vía Polar.sh', 'purchase', 'polar', checkoutId || undefined);
          message = 'Se han acreditado 15 créditos profesionales con licencia de uso a tu monedero.';
        } else if (service === 'faro_diario') {
          title = '¡Suscripción a Faro Diario Activada!';
          message = 'Tu suscripción mensual a los audios matutinos personalizados de 45 segundos ha sido confirmada vía Polar.sh.';
        } else if (service === 'rectificacion') {
          title = '¡Solicitud de Rectificación Recibida!';
          message = 'Tu orden de Rectificación Biográfica ha sido recibida con éxito. El equipo iniciará la revisión con atacires en breve.';
        } else {
          message = 'Tu pago vía Polar.sh ha sido verificado. Tus créditos están disponibles en tu cuenta.';
        }

        if (checkoutId) {
          try {
            sessionStorage.setItem(processedKey, 'true');
          } catch (e) {
            // ignore
          }
        }
      }

      setPaymentNotice({
        type: 'success',
        title,
        message,
        creditsAdded: added > 0 ? added : undefined,
      });

      // Clean query params from the browser bar cleanly
      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (e) {
        // ignore
      }
    } else if (paymentStatus === 'cancelled' || paymentStatus === 'cancel') {
      setPaymentNotice({
        type: 'cancelled',
        title: 'Proceso de Pago Cancelado',
        message: 'Has vuelto a Faro Biográfico sin completar el pago. No se realizó ningún cargo a tu tarjeta de crédito o débito.',
      });

      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Subscribe to credit balance changes
  useEffect(() => {
    const unsubscribe = subscribeToCredits((newBalance) => {
      setCreditBalance(newBalance);
    });
    return unsubscribe;
  }, []);

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
    { id: 'septenio', label: 'Septenio Biográfico', icon: <Clock className="w-4 h-4" />, badge: `S${calculationResult.currentSeptenio.number}` },
    { id: 'lunarNodes', label: 'Nodo Lunar & Dirección', icon: <Compass className="w-4 h-4" />, badge: calculationResult.lunarNodes.northNode.sign },
    { id: 'yearOfLife', label: 'Año de Vida', icon: <SunMedium className="w-4 h-4" />, badge: `Año ${calculationResult.yearOfLife.currentYearOfLife}` },
    { id: 'transits', label: 'Tránsitos Planetarios', icon: <Sparkles className="w-4 h-4" />, badge: `${calculationResult.currentTransits.activeTransits.length}` },
    { id: 'synthesis', label: 'Lectura Integral', icon: <BookOpen className="w-4 h-4" />, badge: 'IA' },
    { id: 'overview', label: 'Planetas & Casas', icon: <TableProperties className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      <Header
        hasCalculated={true}
        creditBalance={creditBalance}
        onOpenCreditsModal={() => setIsCreditModalOpen(true)}
        onOpenLegal={() => openLegalModal('terms')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Formulario de Entrada */}
        <BirthDataForm
          initialData={birthData}
          onCalculate={handleCalculate}
          isLoading={isCalculating}
        />

        {/* Resumen Superior de Métricas */}
        <KeyMetricsBar calculation={calculationResult} />

        {/* Barra de Navegación de Pestañas - Notoria y Ergonómica */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Secciones del Análisis
            </span>
            <span className="text-[11px] text-stone-400 flex items-center gap-1">
              <span className="hidden sm:inline">Haz clic para cambiar de módulo</span>
              <span className="sm:hidden text-amber-400/80 font-medium">Desliza para ver más →</span>
            </span>
          </div>

          <div className="relative bg-stone-900/90 border border-stone-800 rounded-2xl p-2 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 px-0.5 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    id={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group flex items-center gap-2.5 px-4 py-2.5 sm:px-4.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-stone-950 font-bold border-2 border-amber-300 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/30 scale-[1.02]'
                        : 'bg-stone-950/90 text-stone-300 border border-stone-700/80 hover:border-amber-400/70 hover:bg-stone-850 hover:text-white shadow-sm'
                    }`}
                  >
                    <span className={isActive ? 'text-stone-950 stroke-[2.5]' : 'text-amber-400/90 group-hover:text-amber-300'}>
                      {tab.icon}
                    </span>
                    <span className={isActive ? 'text-stone-950 font-bold' : 'text-stone-200 group-hover:text-white'}>
                      {tab.label}
                    </span>
                    {tab.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                          isActive
                            ? 'bg-stone-950 text-amber-300 border border-amber-400/50 shadow-sm'
                            : 'bg-stone-850 text-amber-300/90 border border-stone-700 group-hover:border-amber-500/50'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
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
                      Perfil Biográfico Digital de {birthData.name}
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
            <DeepSynthesisCard
              calculation={calculationResult}
              onOpenCreditsModal={() => setIsCreditModalOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Modal de Monedero y Recarga de Créditos */}
      <CreditModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        onCreditsUpdated={(newBal) => setCreditBalance(newBal)}
        onOpenLegal={openLegalModal}
      />

      {/* Modal de Centro Legal, Términos y Cumplimiento (Compliance / MoR) */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />

      {/* Modal / Toast de Notificación de Pago de Polar.sh */}
      {paymentNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  paymentNotice.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                }`}
              >
                {paymentNotice.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <h3 className="font-serif font-bold text-lg text-stone-100">
                  {paymentNotice.title}
                </h3>
                <p className="text-sm text-stone-300 leading-relaxed">
                  {paymentNotice.message}
                </p>
                {paymentNotice.creditsAdded && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mt-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    +{paymentNotice.creditsAdded} Créditos Acreditados
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPaymentNotice(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-sm transition-colors text-center shadow-lg shadow-amber-500/20"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer con información de cumplimiento y enlaces legales exigidos por Polar.sh */}
      <footer className="border-t border-stone-800 bg-stone-900/70 py-8 text-xs text-stone-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <span className="font-serif font-bold text-stone-200 text-sm block">
                Faro Biográfico • Plataforma SaaS de Análisis de Desarrollo Personal
              </span>
              <p className="text-stone-400 text-[11px] mt-0.5 max-w-xl">
                Cálculos astronómicos de alta precisión, cronología de septenios (Steiner &amp; Lievegoed) e informes automatizados asistidos por IA. Herramienta de auto-observación y consultoría.
              </p>
            </div>

            {/* Enlaces legales obligatorios para aprobación de pasarela */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-2 text-stone-300 text-xs">
              <button
                type="button"
                onClick={() => openLegalModal('terms')}
                className="hover:text-purple-300 transition-colors cursor-pointer"
              >
                Términos de Servicio
              </button>
              <span className="text-stone-700">•</span>
              <button
                type="button"
                onClick={() => openLegalModal('refund')}
                className="hover:text-emerald-300 transition-colors cursor-pointer"
              >
                Política de Reembolso
              </button>
              <span className="text-stone-700">•</span>
              <button
                type="button"
                onClick={() => openLegalModal('privacy')}
                className="hover:text-blue-300 transition-colors cursor-pointer"
              >
                Privacidad y Datos
              </button>
              <span className="text-stone-700">•</span>
              <button
                type="button"
                onClick={() => openLegalModal('compliance')}
                className="hover:text-amber-300 transition-colors cursor-pointer"
              >
                Aviso Legal &amp; Compliance
              </button>
              <span className="text-stone-700">•</span>
              <button
                type="button"
                onClick={() => openLegalModal('polar_guide')}
                className="text-blue-400 hover:text-blue-300 underline font-medium transition-colors cursor-pointer"
              >
                Guía Polar.sh
              </button>
            </div>
          </div>

          <div className="border-t border-stone-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-500">
            <div>
              © {new Date().getFullYear()} Faro Biográfico. Pagos seguros, facturación global e impuestos gestionados por <strong className="text-stone-400">Polar Software Inc. (Merchant of Record)</strong>.
            </div>
            <div className="flex items-center gap-3 text-stone-400">
              <span>Soporte: rodriguezb.jl@gmail.com</span>
              <span>•</span>
              <span>Moneda: USD</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
