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
  History,
  Trash2,
  X,
  RotateCcw,
} from 'lucide-react';

export interface RecentQuery {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string;
  placeName: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  ianaTimeZone?: string;
  locationSource?: 'local' | 'internet' | 'manual';
  locationStatus?: BirthData['locationStatus'];
  timestamp: number;
}

const RECENT_STORAGE_KEY = 'anthro_recent_queries';

const DEFAULT_SEEDS: RecentQuery[] = [
  {
    id: 'seed-steiner',
    name: 'Rudolf Steiner',
    birthDate: '1861-02-27',
    birthTime: '23:15',
    placeName: 'Donji Kraljevec, Croatia',
    latitude: 43.367,
    longitude: 16.65,
    timezoneOffset: 1.11,
    locationSource: 'local',
    locationStatus: 'verified',
    timestamp: 1672531199000,
  },
  {
    id: 'seed-jung',
    name: 'Carl Gustav Jung',
    birthDate: '1875-07-26',
    birthTime: '19:32',
    placeName: 'Kesswil, Switzerland',
    latitude: 47.6,
    longitude: 9.32,
    timezoneOffset: 1.0,
    locationSource: 'local',
    locationStatus: 'verified',
    timestamp: 1672531198000,
  },
  {
    id: 'seed-einstein',
    name: 'Albert Einstein',
    birthDate: '1879-03-14',
    birthTime: '11:30',
    placeName: 'Ulm, Germany',
    latitude: 48.4,
    longitude: 9.99,
    timezoneOffset: 1.0,
    locationSource: 'local',
    locationStatus: 'verified',
    timestamp: 1672531197000,
  },
];

interface BirthDataFormProps {
  initialData: BirthData;
  onCalculate: (data: BirthData) => void;
  isLoading?: boolean;
}

// Helper to parse date parts (YYYY-MM-DD)
const parseDateParts = (dateStr: string) => {
  const parts = (dateStr || '').split('-');
  if (parts.length === 3) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  return { year: '1990', month: '01', day: '01' };
};

// Helper to parse time parts (HH:MM)
const parseTimeParts = (timeStr: string) => {
  const parts = (timeStr || '').split(':');
  if (parts.length >= 2) {
    return { hour: parts[0], minute: parts[1] };
  }
  return { hour: '12', minute: '00' };
};

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

  // Segmented date state for reliable instant mobile keyboard input
  const initialDateParts = parseDateParts(initialData.birthDate);
  const initialTimeParts = parseTimeParts(initialData.birthTime);

  const [birthDay, setBirthDay] = useState(initialDateParts.day);
  const [birthMonth, setBirthMonth] = useState(initialDateParts.month);
  const [birthYear, setBirthYear] = useState(initialDateParts.year);

  const [birthHour, setBirthHour] = useState(initialTimeParts.hour);
  const [birthMinute, setBirthMinute] = useState(initialTimeParts.minute);

  // Input refs for automatic auto-focus advance
  const monthInputRef = useRef<HTMLInputElement>(null);
  const yearInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);
  const nativeDateInputRef = useRef<HTMLInputElement>(null);
  const nativeTimeInputRef = useRef<HTMLInputElement>(null);

  // Sync date parts with formData and recalculate timezone offset
  const syncBirthDate = (yStr: string, mStr: string, dStr: string) => {
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);

    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const formattedDate = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let newOffset = formData.timezoneOffset;
      if (activeIanaTimeZone && formData.locationSource !== 'manual') {
        newOffset = calculateHistoricalTimezoneOffset(
          activeIanaTimeZone,
          formattedDate,
          formData.birthTime,
          formData.timezoneOffset
        );
      }
      setFormData((prev) => ({
        ...prev,
        birthDate: formattedDate,
        timezoneOffset: newOffset,
        ianaTimeZone: activeIanaTimeZone,
      }));
    }
  };

  const handleDayChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    setBirthDay(clean);
    syncBirthDate(birthYear, birthMonth, clean);
    if (clean.length === 2 && monthInputRef.current) {
      monthInputRef.current.focus();
    }
  };

  const handleMonthChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    setBirthMonth(clean);
    syncBirthDate(birthYear, clean, birthDay);
    if (clean.length === 2 && yearInputRef.current) {
      yearInputRef.current.focus();
    }
  };

  const handleYearChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setBirthYear(clean);
    syncBirthDate(clean, birthMonth, birthDay);
  };

  // Sync time parts with formData and recalculate timezone offset
  const syncBirthTime = (hStr: string, minStr: string) => {
    const h = parseInt(hStr, 10);
    const min = parseInt(minStr, 10);

    if (!isNaN(h) && !isNaN(min) && h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      const formattedTime = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      let newOffset = formData.timezoneOffset;
      if (activeIanaTimeZone && formData.locationSource !== 'manual') {
        newOffset = calculateHistoricalTimezoneOffset(
          activeIanaTimeZone,
          formData.birthDate,
          formattedTime,
          formData.timezoneOffset
        );
      }
      setFormData((prev) => ({
        ...prev,
        birthTime: formattedTime,
        timezoneOffset: newOffset,
        ianaTimeZone: activeIanaTimeZone,
      }));
    }
  };

  const handleHourChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    setBirthHour(clean);
    syncBirthTime(clean, birthMinute);
    if (clean.length === 2 && minuteInputRef.current) {
      minuteInputRef.current.focus();
    }
  };

  const handleMinuteChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    setBirthMinute(clean);
    syncBirthTime(birthHour, clean);
  };

  const handleNativeDateChange = (dateVal: string) => {
    if (!dateVal) return;
    const { year, month, day } = parseDateParts(dateVal);
    setBirthDay(day);
    setBirthMonth(month);
    setBirthYear(year);
    syncBirthDate(year, month, day);
  };

  const handleNativeTimeChange = (timeVal: string) => {
    if (!timeVal) return;
    const { hour, minute } = parseTimeParts(timeVal);
    setBirthHour(hour);
    setBirthMinute(minute);
    syncBirthTime(hour, minute);
  };

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

  // Recent queries history from localStorage
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error loading recent queries:', e);
    }
    return DEFAULT_SEEDS;
  });

  const saveToRecentQueries = (data: BirthData) => {
    if (!data.name || !data.name.trim()) return;

    setRecentQueries((prev) => {
      const trimmedName = data.name.trim().toLowerCase();
      const filtered = prev.filter(
        (q) =>
          !(
            q.name.trim().toLowerCase() === trimmedName &&
            q.birthDate === data.birthDate
          )
      );

      const newItem: RecentQuery = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: data.name.trim(),
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        placeName: data.placeName,
        latitude: data.latitude,
        longitude: data.longitude,
        timezoneOffset: data.timezoneOffset,
        ianaTimeZone: data.ianaTimeZone,
        locationSource: data.locationSource,
        locationStatus: data.locationStatus,
        timestamp: Date.now(),
      };

      const updated = [newItem, ...filtered].slice(0, 12);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Could not save recent query:', err);
      }
      return updated;
    });
  };

  const handleSelectRecent = (item: RecentQuery) => {
    const updated: BirthData = {
      name: item.name,
      birthDate: item.birthDate,
      birthTime: item.birthTime,
      placeName: item.placeName,
      latitude: item.latitude,
      longitude: item.longitude,
      timezoneOffset: item.timezoneOffset,
      ianaTimeZone: item.ianaTimeZone,
      locationSource: item.locationSource || 'local',
      locationStatus: 'verified',
    };

    setFormData(updated);

    const partsDate = parseDateParts(item.birthDate);
    setBirthDay(partsDate.day);
    setBirthMonth(partsDate.month);
    setBirthYear(partsDate.year);

    const partsTime = parseTimeParts(item.birthTime);
    setBirthHour(partsTime.hour);
    setBirthMinute(partsTime.minute);

    setLocationSource(item.locationSource || 'local');
    setLocationError(null);
    setLocationNotice({
      type: item.locationSource === 'internet' ? 'internet' : 'local',
      text: `Consulta cargada: ${item.name}`,
      details: `${item.placeName} (Lat: ${item.latitude.toFixed(2)}°, Lon: ${item.longitude.toFixed(2)}°, UTC ${item.timezoneOffset >= 0 ? '+' : ''}${item.timezoneOffset}h)`,
    });

    saveToRecentQueries(updated);
    onCalculate(updated);
  };

  const handleDeleteRecent = (id: string) => {
    setRecentQueries((prev) => {
      const updated = prev.filter((q) => q.id !== id);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving updated recents:', e);
      }
      return updated;
    });
  };

  const handleClearRecent = () => {
    setRecentQueries([]);
    try {
      localStorage.removeItem(RECENT_STORAGE_KEY);
    } catch (e) {
      console.warn('Error clearing recent queries:', e);
    }
  };

  // Synchronize when initialData changes from external presets (e.g. example buttons)
  useEffect(() => {
    setFormData({
      ...initialData,
      locationSource: 'local',
      locationStatus: 'verified',
    });

    const partsDate = parseDateParts(initialData.birthDate);
    setBirthDay(partsDate.day);
    setBirthMonth(partsDate.month);
    setBirthYear(partsDate.year);

    const partsTime = parseTimeParts(initialData.birthTime);
    setBirthHour(partsTime.hour);
    setBirthMinute(partsTime.minute);

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
          `No se encontró la ubicación "${trimmed}" ni en la base de datos local ni en Internet. Para evitar cálculos erróneos en el perfil biográfico, ingresa una ciudad más cercana o ajusta las coordenadas manualmente.`
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

      saveToRecentQueries(finalData);
      onCalculate(finalData);
      return;
    }

    saveToRecentQueries(formData);
    onCalculate(formData);
  };

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="mb-5">
        <h2 className="font-serif text-xl sm:text-2xl font-semibold text-stone-100 flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Ingreso de Datos de Nacimiento
        </h2>
        <p className="text-sm text-stone-400 mt-1">
          La fecha, hora exacta y coordenadas geográficas verificadas garantizan el cálculo astronómico exacto de tu Ascendente, casas Plácidus, eje nodal y septenio antroposófico.
        </p>
      </div>

      {/* Consultas Recientes */}
      {recentQueries.length > 0 && (
        <div className="mb-6 p-3.5 bg-stone-950/80 border border-stone-800/90 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                Consultas Recientes
              </span>
              <span className="text-[11px] text-stone-500 hidden sm:inline">
                • Haz clic en una persona para cargar y calcular su carta al instante
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearRecent}
              className="text-[11px] text-stone-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Limpiar lista de consultas recientes"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Limpiar historial</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-stone-800">
            {recentQueries.map((item) => {
              const isActive =
                formData.name.trim().toLowerCase() === item.name.trim().toLowerCase() &&
                formData.birthDate === item.birthDate;

              return (
                <div
                  key={item.id}
                  className={`group relative shrink-0 flex items-center rounded-xl border text-xs transition-all ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-sm ring-1 ring-amber-500/30'
                      : 'bg-stone-900/90 hover:bg-stone-850 border-stone-800/90 text-stone-300 hover:border-stone-700 hover:text-stone-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectRecent(item)}
                    className="pl-3 pr-2 py-2 flex items-center gap-2.5 text-left cursor-pointer"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 text-stone-400 group-hover:text-amber-300'
                      }`}
                    >
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-1.5">
                        <span className="truncate max-w-[130px] sm:max-w-[160px] font-semibold text-stone-200 group-hover:text-amber-200">
                          {item.name}
                        </span>
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/30 text-amber-200 rounded font-normal">
                            Activo
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate max-w-[170px]">
                        {item.birthDate} • {item.placeName.split(',')[0]}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRecent(item.id);
                    }}
                    className="p-1.5 mr-1 text-stone-500 hover:text-rose-400 opacity-60 hover:opacity-100 transition-opacity rounded cursor-pointer"
                    title="Eliminar de recientes"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

          {/* Fecha de Nacimiento con entrada numérica directa para celular */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
                Fecha de Nacimiento
              </label>
              <button
                type="button"
                onClick={() => {
                  try {
                    nativeDateInputRef.current?.showPicker?.();
                  } catch (e) {
                    nativeDateInputRef.current?.focus();
                  }
                }}
                className="text-[11px] text-amber-400/90 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Abrir selector de calendario del sistema"
              >
                <Calendar className="w-3 h-3" />
                <span>Calendario</span>
              </button>
            </div>

            {/* Segmented inputs: DD / MM / AAAA */}
            <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-xl p-1.5 focus-within:border-amber-500/60 focus-within:ring-1 focus-within:ring-amber-500/60 transition-all">
              <div className="pl-1.5 text-stone-500 shrink-0">
                <Calendar className="w-4 h-4 text-amber-400" />
              </div>

              {/* Día */}
              <div className="relative flex-1 min-w-0">
                <input
                  id="input-birth-day"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={birthDay}
                  onChange={(e) => handleDayChange(e.target.value)}
                  placeholder="DD"
                  className="w-full text-center py-1.5 bg-stone-900/80 border border-stone-700/60 rounded-lg text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:bg-stone-900 text-sm font-mono"
                  title="Día de nacimiento (01-31)"
                />
                <span className="text-[9px] text-stone-500 block text-center mt-0.5">Día</span>
              </div>

              <span className="text-stone-600 font-bold text-sm">/</span>

              {/* Mes */}
              <div className="relative flex-1 min-w-0">
                <input
                  ref={monthInputRef}
                  id="input-birth-month"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={birthMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  placeholder="MM"
                  className="w-full text-center py-1.5 bg-stone-900/80 border border-stone-700/60 rounded-lg text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:bg-stone-900 text-sm font-mono"
                  title="Mes de nacimiento (01-12)"
                />
                <span className="text-[9px] text-stone-500 block text-center mt-0.5">Mes</span>
              </div>

              <span className="text-stone-600 font-bold text-sm">/</span>

              {/* Año */}
              <div className="relative flex-[1.4] min-w-0">
                <input
                  ref={yearInputRef}
                  id="input-birth-year"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={birthYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  placeholder="AAAA"
                  className="w-full text-center py-1.5 bg-stone-900/80 border border-stone-700/60 rounded-lg text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:bg-stone-900 text-sm font-mono"
                  title="Año de nacimiento de 4 dígitos (ej. 1985 o 1861)"
                />
                <span className="text-[9px] text-stone-500 block text-center mt-0.5">Año</span>
              </div>

              {/* Hidden native date input */}
              <input
                ref={nativeDateInputRef}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                value={formData.birthDate}
                onChange={(e) => handleNativeDateChange(e.target.value)}
                className="sr-only"
              />
            </div>
          </div>

          {/* Hora Exacta de Nacimiento con entrada numérica directa */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300">
                Hora Exacta (24h)
              </label>
              <button
                type="button"
                onClick={() => {
                  try {
                    nativeTimeInputRef.current?.showPicker?.();
                  } catch (e) {
                    nativeTimeInputRef.current?.focus();
                  }
                }}
                className="text-[11px] text-amber-400/90 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Abrir selector de reloj del sistema"
              >
                <Clock className="w-3 h-3" />
                <span>Reloj</span>
              </button>
            </div>

            {/* Segmented inputs: HH : MM */}
            <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-xl p-1.5 focus-within:border-amber-500/60 focus-within:ring-1 focus-within:ring-amber-500/60 transition-all">
              <div className="pl-1.5 text-stone-500 shrink-0">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>

              {/* Hora */}
              <div className="relative flex-1 min-w-0">
                <input
                  id="input-birth-hour"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={birthHour}
                  onChange={(e) => handleHourChange(e.target.value)}
                  placeholder="HH"
                  className="w-full text-center py-1.5 bg-stone-900/80 border border-stone-700/60 rounded-lg text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:bg-stone-900 text-sm font-mono"
                  title="Hora (00 a 23)"
                />
                <span className="text-[9px] text-stone-500 block text-center mt-0.5">Hora (00-23)</span>
              </div>

              <span className="text-stone-600 font-bold text-sm">:</span>

              {/* Minuto */}
              <div className="relative flex-1 min-w-0">
                <input
                  ref={minuteInputRef}
                  id="input-birth-minute"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={birthMinute}
                  onChange={(e) => handleMinuteChange(e.target.value)}
                  placeholder="MM"
                  className="w-full text-center py-1.5 bg-stone-900/80 border border-stone-700/60 rounded-lg text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:bg-stone-900 text-sm font-mono"
                  title="Minuto (00 a 59)"
                />
                <span className="text-[9px] text-stone-500 block text-center mt-0.5">Min (00-59)</span>
              </div>

              {/* Hidden native time input */}
              <input
                ref={nativeTimeInputRef}
                type="time"
                tabIndex={-1}
                aria-hidden="true"
                value={formData.birthTime}
                onChange={(e) => handleNativeTimeChange(e.target.value)}
                className="sr-only"
              />
            </div>
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
            <div />
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
                <span>Calculando perfil y septenios...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-stone-950" />
                <span>Calcular Perfil Biográfico y Cronología Vital</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

