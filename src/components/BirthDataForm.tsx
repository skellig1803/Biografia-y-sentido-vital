import React, { useState, useEffect, useRef } from 'react';
import { BirthData } from '../types';
import { POPULAR_CITIES, CityInfo, calculateHistoricalTimezoneOffset } from '../data/cities';
import {
  searchLocalDatabase,
  searchInternetLocation,
  resolveLocationWithFallback,
} from '../utils/locationService';
import {
  User,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  SlidersHorizontal,
  CheckCircle2,
  Search,
  Globe,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react';

interface BirthDataFormProps {
  initialData: BirthData;
  onCalculate: (data: BirthData) => void;
  isLoading?: boolean;
}

export const BirthDataForm: React.FC<BirthDataFormProps> = ({
  initialData,
  onCalculate,
  isLoading = false,
}) => {
  const [activeIanaTimeZone, setActiveIanaTimeZone] = useState<string>('Europe/Madrid');
  const [formData, setFormData] = useState<BirthData>(() => ({
    ...initialData,
    locationSource: initialData.locationSource || 'local',
    locationStatus: 'verified',
  }));
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  // Location resolution states
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [locationSource, setLocationSource] = useState<'local' | 'internet' | 'manual'>(
    initialData.locationSource || 'local'
  );
  const [locationMessage, setLocationMessage] = useState<string | null>(
    `Ubicación inicial confirmada: ${initialData.placeName}`
  );
  const [locationNotice, setLocationNotice] = useState<{
    type: 'local' | 'internet' | 'warning' | 'error';
    text: string;
    details?: string;
  } | null>({
    type: 'local',
    text: 'Ubicación confirmada en la base de datos local.',
    details: `${initialData.placeName} (UTC ${initialData.timezoneOffset >= 0 ? '+' : ''}${initialData.timezoneOffset}h)`,
  });
  const [locationError, setLocationError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize when initialData changes from external presets (e.g. example buttons)
  useEffect(() => {
    setFormData({
      ...initialData,
      locationSource: 'local',
      locationStatus: 'verified',
    });
    setLocationSource('local');
    setLocationError(null);
    setLocationNotice({
      type: 'local',
      text: 'Ubicación confirmada en la base de datos local.',
      details: `${initialData.placeName} (Lat: ${initialData.latitude.toFixed(2)}°, Lon: ${initialData.longitude.toFixed(2)}°, UTC ${initialData.timezoneOffset >= 0 ? '+' : ''}${initialData.timezoneOffset}h)`,
    });
  }, [initialData]);

  // Execute explicit online search
  const performOnlineSearch = async (placeQuery: string) => {
    const trimmed = placeQuery.trim();
    if (trimmed.length < 2) return;

    setIsSearchingOnline(true);
    setLocationError(null);
    setLocationNotice({
      type: 'warning',
      text: `La ubicación "${trimmed}" no se encontró en la base de datos local.`,
      details: 'Buscando automáticamente en Internet (OpenStreetMap & huso horario)...',
    });

    try {
      const internetRes = await searchInternetLocation(trimmed);
      if (internetRes.success) {
        const iana = internetRes.ianaTimeZone || internetRes.timezoneName || '';
        const dynamicOffset = iana
          ? calculateHistoricalTimezoneOffset(iana, formData.birthDate, formData.birthTime, internetRes.timezoneOffset)
          : internetRes.timezoneOffset;
        if (iana) setActiveIanaTimeZone(iana);

        setFormData((prev) => ({
          ...prev,
          placeName: trimmed,
          resolvedPlaceName: internetRes.name,
          latitude: internetRes.lat,
          longitude: internetRes.lng,
          timezoneOffset: dynamicOffset,
          ianaTimeZone: iana,
          locationSource: 'internet',
          locationStatus: 'verified',
        }));
        setLocationSource('internet');
        setLocationError(null);
        const isDst = dynamicOffset !== internetRes.timezoneOffset;
        setLocationNotice({
          type: 'internet',
          text: 'Ubicación encontrada en Internet (no estaba en la base de datos local).',
          details: `${internetRes.name} • Coordenadas: ${internetRes.lat.toFixed(4)}°, ${internetRes.lng.toFixed(4)}° • Huso horario astronómico: UTC ${dynamicOffset >= 0 ? '+' : ''}${dynamicOffset}h (${iana || 'detectado'})${isDst ? ' (Horario estacional / DST verificado)' : ''}.`,
        });
      } else {
        setLocationError(
          `No se encontró la ubicación "${trimmed}" ni en la base de datos local ni en Internet. Para evitar cálculos erróneos en la carta natal, ingresa una ciudad más cercana o ajusta las coordenadas manualmente.`
        );
        setLocationNotice({
          type: 'error',
          text: 'Error de localización: no se encontró en base de datos local ni en Internet.',
          details: internetRes.error || 'Verifica el nombre o abre "Ajustar latitud / zona horaria" para ingresar las coordenadas manualmente.',
        });
        setFormData((prev) => ({
          ...prev,
          locationStatus: 'error',
        }));
        // Automatically reveal coordinate inputs so the user isn't stuck
        setShowCoordinates(true);
      }
    } catch (err: any) {
      setLocationError(`Error al consultar Internet: ${err?.message || 'Error de red'}`);
      setLocationNotice({
        type: 'error',
        text: 'Error al buscar en Internet.',
        details: 'Por favor ingresa las coordenadas manualmente.',
      });
      setShowCoordinates(true);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Handle selection from local suggestions or dropdown
  const handleCitySelect = (city: CityInfo) => {
    const fullName = `${city.name}, ${city.country}`;
    const iana = city.ianaTimeZone || '';
    const dynamicOffset = iana
      ? calculateHistoricalTimezoneOffset(iana, formData.birthDate, formData.birthTime, city.timezoneOffset)
      : city.timezoneOffset;
    if (iana) setActiveIanaTimeZone(iana);

    setFormData((prev) => ({
      ...prev,
      placeName: fullName,
      resolvedPlaceName: fullName,
      latitude: city.lat,
      longitude: city.lng,
      timezoneOffset: dynamicOffset,
      ianaTimeZone: iana,
      locationSource: 'local',
      locationStatus: 'verified',
    }));
    setLocationSource('local');
    setLocationError(null);
    const isDst = dynamicOffset !== city.timezoneOffset;
    setLocationNotice({
      type: 'local',
      text: 'Ubicación y huso horario astronómico confirmados.',
      details: `${fullName} • Lat: ${city.lat.toFixed(2)}°, Lon: ${city.lng.toFixed(2)}° • UTC ${dynamicOffset >= 0 ? '+' : ''}${dynamicOffset}h${isDst ? ' (Horario estacional / DST verificado para la fecha)' : ''}`,
    });
    setCitySearch('');
  };

  // Handle user typing in the place input field
  const handlePlaceInputChange = (val: string) => {
    setCitySearch(val);
    setFormData((prev) => ({
      ...prev,
      placeName: val,
    }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length < 2) {
      setLocationNotice(null);
      setLocationError(null);
      return;
    }

    // 1. Check local database first
    const localMatch = searchLocalDatabase(trimmed);
    if (localMatch) {
      const fullName = `${localMatch.name}, ${localMatch.country}`;
      const iana = localMatch.ianaTimeZone || '';
      const dynamicOffset = iana
        ? calculateHistoricalTimezoneOffset(iana, formData.birthDate, formData.birthTime, localMatch.timezoneOffset)
        : localMatch.timezoneOffset;
      if (iana) setActiveIanaTimeZone(iana);

      setFormData((prev) => ({
        ...prev,
        latitude: localMatch.lat,
        longitude: localMatch.lng,
        timezoneOffset: dynamicOffset,
        ianaTimeZone: iana,
        locationSource: 'local',
        resolvedPlaceName: fullName,
        locationStatus: 'verified',
      }));
      setLocationSource('local');
      setLocationError(null);
      setLocationNotice({
        type: 'local',
        text: 'Ubicación y huso horario astronómico confirmados.',
        details: `${fullName} (UTC ${dynamicOffset >= 0 ? '+' : ''}${dynamicOffset}h)`,
      });
    } else {
      // 2. Not in local database: show warning and debounce search on the Internet
      setLocationNotice({
        type: 'warning',
        text: `La ubicación "${trimmed}" no se encuentra en la base de datos local.`,
        details: 'Se buscará automáticamente en Internet en breve...',
      });
      setLocationError(null);

      // Debounce auto-search on internet (800ms)
      debounceTimerRef.current = setTimeout(() => {
        performOnlineSearch(trimmed);
      }, 800);
    }
  };

  const handleManualCoordChange = (field: 'latitude' | 'longitude' | 'timezoneOffset', value: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      locationSource: 'manual',
      locationStatus: 'verified',
    }));
    setLocationSource('manual');
    setLocationError(null);
    setLocationNotice({
      type: 'local',
      text: 'Coordenadas configuradas manualmente por el usuario.',
      details: `Lat: ${field === 'latitude' ? value : formData.latitude}°, Lon: ${field === 'longitude' ? value : formData.longitude}°, UTC ${field === 'timezoneOffset' ? value : formData.timezoneOffset}h`,
    });
  };

  const filteredCities = POPULAR_CITIES.filter((c) =>
    `${c.name} ${c.country}`.toLowerCase().includes(citySearch.toLowerCase())
  ).slice(0, 8);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission if location is actively errored or unresolved
    if (formData.locationStatus === 'error' || locationError) {
      setShowCoordinates(true);
      return;
    }

    // If place hasn't been verified yet (e.g. user typed and submitted instantly)
    if (formData.locationSource !== 'local' && formData.locationSource !== 'manual' && formData.locationSource !== 'internet') {
      setIsSearchingOnline(true);
      const resolution = await resolveLocationWithFallback(formData.placeName);
      setIsSearchingOnline(false);

      if (!resolution.found) {
        setLocationError(
          resolution.error ||
            `No se encontró la ubicación "${formData.placeName}". Por favor ingresa las coordenadas manualmente para evitar cálculos erróneos.`
        );
        setShowCoordinates(true);
        return;
      }

      const finalData: BirthData = {
        ...formData,
        resolvedPlaceName: resolution.resolvedName,
        latitude: resolution.latitude,
        longitude: resolution.longitude,
        timezoneOffset: resolution.timezoneOffset,
        locationSource: resolution.source || 'internet',
        locationStatus: 'verified',
      };

      if (resolution.source === 'internet') {
        setLocationNotice({
          type: 'internet',
          text: 'Ubicación encontrada en Internet (no estaba en la base de datos local).',
          details: `${resolution.resolvedName} • Coordenadas y huso horario sincronizados.`,
        });
      }

      onCalculate(finalData);
      return;
    }

    onCalculate(formData);
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="mb-6">
        <h2 className="font-serif text-xl sm:text-2xl font-semibold text-stone-100 flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Ingreso de Datos de Nacimiento
        </h2>
        <p className="text-sm text-stone-400 mt-1">
          La fecha, hora exacta y coordenadas geográficas verificadas garantizan el cálculo astronómico exacto de tu Ascendente, casas Plácidus, eje nodal y septenio antroposófico.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <label htmlFor="input-name" className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
              Nombre Completo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="input-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Sofía Martínez"
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 text-sm transition-all"
              />
            </div>
          </div>

          {/* Fecha de Nacimiento */}
          <div className="space-y-1.5">
            <label htmlFor="input-birthdate" className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
              Fecha de Nacimiento
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="input-birthdate"
                type="date"
                required
                value={formData.birthDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  let newOffset = formData.timezoneOffset;
                  if (activeIanaTimeZone && formData.locationSource !== 'manual') {
                    newOffset = calculateHistoricalTimezoneOffset(
                      activeIanaTimeZone,
                      newDate,
                      formData.birthTime,
                      formData.timezoneOffset
                    );
                  }
                  setFormData({ ...formData, birthDate: newDate, timezoneOffset: newOffset, ianaTimeZone: activeIanaTimeZone });
                }}
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 text-sm transition-all"
              />
            </div>
          </div>

          {/* Hora Exacta de Nacimiento */}
          <div className="space-y-1.5">
            <label htmlFor="input-birthtime" className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
              Hora Exacta (24h)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Clock className="w-4 h-4" />
              </div>
              <input
                id="input-birthtime"
                type="time"
                required
                value={formData.birthTime}
                onChange={(e) => {
                  const newTime = e.target.value;
                  let newOffset = formData.timezoneOffset;
                  if (activeIanaTimeZone && formData.locationSource !== 'manual') {
                    newOffset = calculateHistoricalTimezoneOffset(
                      activeIanaTimeZone,
                      formData.birthDate,
                      newTime,
                      formData.timezoneOffset
                    );
                  }
                  setFormData({ ...formData, birthTime: newTime, timezoneOffset: newOffset, ianaTimeZone: activeIanaTimeZone });
                }}
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 text-sm transition-all"
              />
            </div>
            <p className="text-[11px] text-stone-500">
              La hora exacta determina el Ascendente y la distribución de las 12 casas Plácidus.
            </p>
          </div>
        </div>

        {/* Lugar de Nacimiento */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label htmlFor="input-place" className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
              Lugar de Nacimiento (Ciudad y País)
            </label>
            <button
              type="button"
              id="btn-toggle-coordinates"
              onClick={() => setShowCoordinates(!showCoordinates)}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {showCoordinates ? 'Ocultar coordenadas' : 'Ajustar latitud / zona horaria manualmente'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
            <div className="relative md:col-span-8">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                id="input-place"
                type="text"
                required
                value={formData.placeName}
                onChange={(e) => handlePlaceInputChange(e.target.value)}
                onBlur={() => {
                  if (formData.placeName && !searchLocalDatabase(formData.placeName) && locationSource !== 'internet' && locationSource !== 'manual') {
                    performOnlineSearch(formData.placeName);
                  }
                }}
                placeholder="Ej. Cuenca, Ecuador / Puyo / Madrid / Kioto..."
                className={`w-full pl-10 pr-10 py-2.5 bg-stone-950 border rounded-xl text-stone-100 placeholder-stone-600 focus:outline-none text-sm transition-all ${
                  locationError
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-stone-800 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60'
                }`}
              />
              {isSearchingOnline && (
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-amber-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>

            {/* Manual Internet Search Trigger Button */}
            <div className="md:col-span-4 flex items-center gap-2">
              <button
                type="button"
                id="btn-search-online"
                onClick={() => performOnlineSearch(formData.placeName)}
                disabled={isSearchingOnline || !formData.placeName.trim()}
                className="w-full py-2.5 px-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-amber-300 border border-stone-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSearchingOnline ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Buscando en Internet...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>Buscar en Internet</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick city presets chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-[11px] text-stone-500">Base local rápida:</span>
            {['Cuenca', 'Quito', 'Madrid', 'Ciudad de México', 'Buenos Aires', 'Bogotá', 'Lima', 'Santiago'].map((cityName) => {
              const match = POPULAR_CITIES.find((c) => c.name === cityName);
              if (!match) return null;
              return (
                <button
                  key={cityName}
                  type="button"
                  onClick={() => handleCitySelect(match)}
                  className="text-xs px-2.5 py-1 bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-amber-300 rounded-lg border border-stone-700/60 transition-colors cursor-pointer"
                >
                  {cityName}
                </button>
              );
            })}
          </div>

          {/* Explicit Communication Banners (Local vs Internet vs Error) */}
          {locationNotice && !locationError && (
            <div
              className={`p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                locationNotice.type === 'internet'
                  ? 'bg-blue-950/40 border-blue-800/50 text-blue-200'
                  : locationNotice.type === 'warning'
                  ? 'bg-amber-950/40 border-amber-800/50 text-amber-200'
                  : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {locationNotice.type === 'internet' ? (
                  <Globe className="w-4 h-4 text-blue-400" />
                ) : locationNotice.type === 'warning' ? (
                  <Info className="w-4 h-4 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="font-medium">{locationNotice.text}</p>
                {locationNotice.details && (
                  <p className="text-[11px] opacity-80 leading-relaxed font-mono">
                    {locationNotice.details}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Prominent Error Notice when location is not found */}
          {locationError && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-300">
                  Ubicación no encontrada (Cálculo protegido)
                </p>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                  {locationError}
                </p>
                <p className="text-[11px] text-rose-300/80">
                  Para evitar generar cartas natales con datos errados, debes seleccionar una ciudad válida o ingresar las coordenadas y zona horaria abajo.
                </p>
              </div>
            </div>
          )}

          {/* Active coordinates preview bar */}
          <div className="flex flex-wrap items-center gap-2.5 px-3 py-2 bg-stone-950/70 border border-stone-800/80 rounded-xl text-xs">
            <span className="text-stone-400 flex items-center gap-1 font-mono">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              {formData.latitude >= 0 ? `${formData.latitude.toFixed(4)}°N` : `${Math.abs(formData.latitude).toFixed(4)}°S`}, {' '}
              {formData.longitude >= 0 ? `${formData.longitude.toFixed(4)}°E` : `${Math.abs(formData.longitude).toFixed(4)}°W`}
            </span>
            <span className="text-stone-600">•</span>
            <span className="text-amber-300 font-mono bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
              Huso horario: UTC{formData.timezoneOffset >= 0 ? `+${formData.timezoneOffset}` : formData.timezoneOffset}h
            </span>
            <span className="text-stone-600">•</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded border font-medium ${
                locationSource === 'internet'
                  ? 'bg-blue-950/60 text-blue-300 border-blue-800/40'
                  : locationSource === 'manual'
                  ? 'bg-purple-950/60 text-purple-300 border-purple-800/40'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
              }`}
            >
              {locationSource === 'internet'
                ? '🌐 Origen: Internet (OpenStreetMap)'
                : locationSource === 'manual'
                ? '✏️ Origen: Manual'
                : '💾 Origen: Base de datos local'}
            </span>
          </div>

          {/* Autocomplete dropdown if typing */}
          {citySearch.length >= 2 && filteredCities.length > 0 && (
            <div className="mt-1.5 p-2 bg-stone-950 border border-stone-800 rounded-xl max-h-40 overflow-y-auto z-20">
              <p className="text-[11px] text-stone-500 px-2 py-1">Coincidencias en base de datos local:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {filteredCities.map((city) => (
                  <button
                    key={`${city.name}-${city.country}`}
                    type="button"
                    onClick={() => {
                      handleCitySelect(city);
                      setCitySearch('');
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-800/70 hover:text-amber-300 rounded-lg flex items-center justify-between cursor-pointer"
                  >
                    <span>{city.name}, {city.country}</span>
                    <span className="text-[10px] text-stone-500">UTC {city.timezoneOffset >= 0 ? `+${city.timezoneOffset}` : city.timezoneOffset}h</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional manual coordinate fine-tuning */}
          {showCoordinates && (
            <div className="mt-3 p-4 bg-stone-950/90 border border-amber-900/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Ajuste manual de coordenadas geográficas
                </span>
                <span className="text-[11px] text-stone-400">
                  Usa valores decimales (Sur y Oeste en negativo)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <label className="text-stone-300 block mb-1">Latitud (grados decimales)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => handleManualCoordChange('latitude', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-stone-900 border border-stone-700 rounded text-stone-100 font-mono"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">Ej: -2.9001 (Ecuador) o 40.4168 (Madrid)</span>
                </div>
                <div>
                  <label className="text-stone-300 block mb-1">Longitud (grados decimales)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => handleManualCoordChange('longitude', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-stone-900 border border-stone-700 rounded text-stone-100 font-mono"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">Ej: -79.0059 (Ecuador) o -3.7038 (Madrid)</span>
                </div>
                <div>
                  <label className="text-stone-300 block mb-1">Huso Horario (UTC Offset horas)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.timezoneOffset}
                    onChange={(e) => handleManualCoordChange('timezoneOffset', parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-stone-900 border border-stone-700 rounded text-stone-100 font-mono"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">Ej: -5 (Ecuador/Bogotá/Lima), -3 (Argentina)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          {locationError ? (
            <p className="text-xs text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Corrige la ubicación o ingresa las coordenadas para habilitar el cálculo.
            </p>
          ) : (
            <div className="text-xs text-stone-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Coordenadas y huso horario listos para cálculo astronómico.</span>
            </div>
          )}

          <button
            type="submit"
            id="btn-calculate"
            disabled={isLoading || isSearchingOnline || Boolean(locationError)}
            className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold rounded-xl text-sm shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearchingOnline ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                <span>Buscando ubicación...</span>
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                <span>Calculando carta y septenio...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-stone-950" />
                <span>Calcular Carta Natal y Biografía Antroposófica</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

