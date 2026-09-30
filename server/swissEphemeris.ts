import path from 'path';
import fs from 'fs';
import sweph from 'sweph';
import {
  Aspect,
  BirthData,
  HouseCusp,
  NatalChartCalculationResult,
  PlanetId,
  PlanetPosition,
  TransitAspect,
  ZodiacSign,
} from '../src/types';
import {
  calculateExactAge,
  calculateLunarNodeData,
  calculateSeptenioData,
  calculateYearOfLifeAnalysis,
} from '../src/utils/anthroposophyEngine';
import { HOUSE_THEMES, PLANET_INFO, ZODIAC_SIGNS } from '../src/utils/astrologyEngine';
import { getTransitExplanation } from '../src/utils/transitExplanations';
import { calculateHistoricalTimezoneOffset } from '../src/data/cities';

// Initialize Swiss Ephemeris path
const ephePath = path.resolve(process.cwd(), 'ephe');
if (fs.existsSync(ephePath)) {
  sweph.set_ephe_path(ephePath);
}

// Flags: SEFLG_SPEED (256) calculates speeds for retrograde determination
// SEFLG_SWIEPH (2) uses Swiss Ephemeris files; falls back to Moshier (4)
const SEFLG_SPEED = 256;
const SEFLG_SWIEPH = 2;
const SEFLG_MOSEPH = 4;
const DEFAULT_FLAGS = SEFLG_SPEED | SEFLG_SWIEPH;
const FALLBACK_FLAGS = SEFLG_SPEED | SEFLG_MOSEPH;

// Swiss Ephemeris Celestial Body IDs
const SE_BODIES_BASE: { id: PlanetId; sweId: number; name: string }[] = [
  { id: 'sun', sweId: 0, name: 'Sol' },
  { id: 'moon', sweId: 1, name: 'Luna' },
  { id: 'mercury', sweId: 2, name: 'Mercurio' },
  { id: 'venus', sweId: 3, name: 'Venus' },
  { id: 'mars', sweId: 4, name: 'Marte' },
  { id: 'jupiter', sweId: 5, name: 'Júpiter' },
  { id: 'saturn', sweId: 6, name: 'Saturno' },
  { id: 'uranus', sweId: 7, name: 'Urano' },
  { id: 'neptune', sweId: 8, name: 'Neptuno' },
  { id: 'pluto', sweId: 9, name: 'Plutón' },
  { id: 'northNode', sweId: 11, name: 'Nodo Lunar Norte' }, // SE_TRUE_NODE (11) or SE_MEAN_NODE (10)
  { id: 'chiron', sweId: 15, name: 'Quirón' },
  { id: 'lilith', sweId: 12, name: 'Lilith (Luna Negra)' }, // SE_MEAN_APOG = 12
];

export interface DegToSignResult {
  sign: ZodiacSign;
  degreeInSign: number;
  minuteInSign: number;
  secondInSign: number;
  formatted: string;
  formattedShort: string;
}

/**
 * Convierte longitud eclíptica continua (0-360°) a coordenadas zodiacales exactas.
 * Realiza redondeo astronómico con propagación estricta de acarreo:
 * 29° 59' 59.6" se redondea correctamente a 0° 00' 00" del signo siguiente,
 * eliminando por completo valores inválidos como 30° o 60'.
 */
export function degToSign(degrees: number, roundTo: 'second' | 'minute' = 'second'): DegToSignResult {
  const normDeg = ((degrees % 360) + 360) % 360;
  let totalSeconds = Math.round(normDeg * 3600);

  if (roundTo === 'minute') {
    totalSeconds = Math.round(totalSeconds / 60) * 60;
  }

  // Normalizar segundos totales al círculo completo (1,296,000 segundos de arco en 360°)
  const CIRCLE_SECONDS = 360 * 3600;
  totalSeconds = ((totalSeconds % CIRCLE_SECONDS) + CIRCLE_SECONDS) % CIRCLE_SECONDS;

  const SIGN_SECONDS = 30 * 3600; // 108,000 segundos por signo
  const signIndex = Math.floor(totalSeconds / SIGN_SECONDS);
  const remSeconds = totalSeconds % SIGN_SECONDS;

  const degreeInSign = Math.floor(remSeconds / 3600);
  const minuteInSign = Math.floor((remSeconds % 3600) / 60);
  const secondInSign = remSeconds % 60;

  const sign = ZODIAC_SIGNS[signIndex % 12]?.sign || 'Aries';
  const pad = (n: number) => n.toString().padStart(2, '0');

  return {
    sign,
    degreeInSign,
    minuteInSign,
    secondInSign,
    formatted: `${degreeInSign}° ${pad(minuteInSign)}' ${pad(secondInSign)}" ${sign}`,
    formattedShort: `${degreeInSign}° ${pad(minuteInSign)}' ${sign}`,
  };
}

function getHouseNumber(longitude: number, cuspLongitudes: number[]): number {
  const normLon = ((longitude % 360) + 360) % 360;
  for (let i = 0; i < 12; i++) {
    const c1 = cuspLongitudes[i];
    const c2 = cuspLongitudes[(i + 1) % 12];
    const span = ((c2 - c1) % 360 + 360) % 360;
    const dist = ((normLon - c1) % 360 + 360) % 360;
    if (dist >= 0 && dist < span) {
      return i + 1;
    }
  }
  return 1;
}

export function computeSwissEphemerisChart(birthData: BirthData): NatalChartCalculationResult {
  const [bYear, bMonth, bDay] = birthData.birthDate.split('-').map(Number);
  const [bHour, bMin] = birthData.birthTime.split(':').map(Number);
  let tz = Number(birthData.timezoneOffset);

  // Use historical IANA timezone calculation if provided or infer from coordinates/popular cities
  if (birthData.ianaTimeZone) {
    tz = calculateHistoricalTimezoneOffset(
      birthData.ianaTimeZone,
      birthData.birthDate,
      birthData.birthTime,
      tz
    );
  }

  const latitude = Number(birthData.latitude);
  const longitude = Number(birthData.longitude);

  // Convert local birth time to UTC
  // Local Time - timezoneOffset = UTC Time
  const localMs = Date.UTC(bYear, bMonth - 1, bDay, bHour || 12, bMin || 0);
  const utcDate = new Date(localMs - tz * 3600 * 1000);

  const utcYear = utcDate.getUTCFullYear();
  const utcMonth = utcDate.getUTCMonth() + 1;
  const utcDay = utcDate.getUTCDate();
  const utcDecimalHour =
    utcDate.getUTCHours() +
    utcDate.getUTCMinutes() / 60 +
    utcDate.getUTCSeconds() / 3600 +
    utcDate.getUTCMilliseconds() / 3600000;

  // Calculate Julian Day in UT (1 = Gregorian calendar)
  const jdUt = sweph.julday(utcYear, utcMonth, utcDay, utcDecimalHour, 1);

  // Calculate Placidus Houses ('P' = Placidus)
  let housesResult = sweph.houses(jdUt, latitude, longitude, 'P');
  if (housesResult.flag < 0 || !housesResult.data?.houses) {
    // Polar latitude or Placidus mathematical singularity fallback to Equal ('E')
    housesResult = sweph.houses(jdUt, latitude, longitude, 'E');
  }
  const cuspLongitudes: number[] = housesResult.data?.houses || [];
  const ascendantLon = housesResult.data?.points?.[0] ?? 0;
  const midheavenLon = housesResult.data?.points?.[1] ?? 0;

  // Build HouseCusp list with exact rounding & carry-over
  const houses: HouseCusp[] = cuspLongitudes.map((cuspLon, idx) => {
    const houseNum = idx + 1;
    const details = degToSign(cuspLon);
    return {
      house: houseNum,
      longitude: cuspLon,
      sign: details.sign,
      degreeInSign: details.degreeInSign,
      minuteInSign: details.minuteInSign,
      secondInSign: details.secondInSign,
      formatted: details.formatted,
      theme: HOUSE_THEMES[houseNum] || '',
    };
  });

  // Calculate Planets with selected Lunar Node mode (True Node 11 vs Mean Node 10)
  const nodeSweId = birthData.nodeType === 'true' ? 11 : 10;
  const SE_BODIES = SE_BODIES_BASE.map((item) =>
    item.id === 'northNode'
      ? {
          ...item,
          sweId: nodeSweId,
          name: birthData.nodeType === 'true' ? 'Nodo Lunar Verdadero' : 'Nodo Lunar Medio',
        }
      : item
  );

  const planets: PlanetPosition[] = [];

  for (const item of SE_BODIES) {
    let calc = sweph.calc_ut(jdUt, item.sweId, DEFAULT_FLAGS);
    if (calc.flag < 0 || calc.error) {
      // Fallback to Moshier
      calc = sweph.calc_ut(jdUt, item.sweId, FALLBACK_FLAGS);
    }

    const lon = ((calc.data[0] % 360) + 360) % 360;
    const speed = calc.data[3];
    const isRetro = speed < 0;
    const details = degToSign(lon);
    const house = getHouseNumber(lon, cuspLongitudes);
    const info = PLANET_INFO[item.id];

    planets.push({
      id: item.id,
      name: info?.name || item.name,
      symbol: info?.symbol || '✦',
      longitude: lon,
      sign: details.sign,
      degreeInSign: details.degreeInSign,
      minuteInSign: details.minuteInSign,
      secondInSign: details.secondInSign,
      formatted: details.formatted,
      house,
      isRetrograde: isRetro,
      color: info?.color || '#f59e0b',
      meaning: info?.defaultMeaning || '',
    });
  }

  // South Node is directly opposite the North Node
  const northNode = planets.find((p) => p.id === 'northNode') || planets[0];
  const southNodeLon = ((northNode.longitude + 180) % 360 + 360) % 360;
  const southNodeSign = degToSign(southNodeLon);
  const southNodeHouse = getHouseNumber(southNodeLon, cuspLongitudes);
  const southInfo = PLANET_INFO.southNode;

  planets.push({
    id: 'southNode',
    name: southInfo.name,
    symbol: southInfo.symbol,
    longitude: southNodeLon,
    sign: southNodeSign.sign,
    degreeInSign: southNodeSign.degreeInSign,
    minuteInSign: southNodeSign.minuteInSign,
    secondInSign: southNodeSign.secondInSign,
    formatted: southNodeSign.formatted,
    house: southNodeHouse,
    isRetrograde: northNode.isRetrograde,
    color: southInfo.color,
    meaning: southInfo.defaultMeaning,
  });

  // Ascendant as virtual planet
  const ascSign = degToSign(ascendantLon);
  const ascInfo = PLANET_INFO.ascendant;
  planets.push({
    id: 'ascendant',
    name: ascInfo.name,
    symbol: ascInfo.symbol,
    longitude: ascendantLon,
    sign: ascSign.sign,
    degreeInSign: ascSign.degreeInSign,
    minuteInSign: ascSign.minuteInSign,
    secondInSign: ascSign.secondInSign,
    formatted: ascSign.formatted,
    house: 1,
    color: ascInfo.color,
    meaning: ascInfo.defaultMeaning,
  });

  // Midheaven as virtual planet
  const mcSign = degToSign(midheavenLon);
  const mcInfo = PLANET_INFO.midheaven;
  planets.push({
    id: 'midheaven',
    name: mcInfo.name,
    symbol: mcInfo.symbol,
    longitude: midheavenLon,
    sign: mcSign.sign,
    degreeInSign: mcSign.degreeInSign,
    minuteInSign: mcSign.minuteInSign,
    secondInSign: mcSign.secondInSign,
    formatted: mcSign.formatted,
    house: 10,
    color: mcInfo.color,
    meaning: mcInfo.defaultMeaning,
  });

  // Calculate Aspects between Planets
  const aspects: Aspect[] = [];
  const aspectDefs = [
    { type: 'conjunction' as const, name: 'Conjunción', symbol: '☌', angle: 0, orb: 8, nature: 'neutral' as const, color: '#f59e0b', meaning: 'Fusión energética profunda, intensificación y manifestación unificada.' },
    { type: 'opposition' as const, name: 'Oposición', symbol: '☍', angle: 180, orb: 8, nature: 'challenging' as const, color: '#ef4444', meaning: 'Polaridad activa, tensión consciente que busca integración y equilibrio.' },
    { type: 'trine' as const, name: 'Trígono', symbol: '△', angle: 120, orb: 7, nature: 'harmonious' as const, color: '#22c55e', meaning: 'Fluidez armónica natural, dones innatos y gracia elemental compartida.' },
    { type: 'square' as const, name: 'Cuadratura', symbol: '□', angle: 90, orb: 7, nature: 'challenging' as const, color: '#f97316', meaning: 'Fricción constructiva, crisis de acción que despierta maestría y voluntad.' },
    { type: 'sextile' as const, name: 'Sextil', symbol: '⚹', angle: 60, orb: 5, nature: 'harmonious' as const, color: '#38bdf8', meaning: 'Oportunidad estimulante, puentes mentales de colaboración y apertura.' },
  ];

  const corePlanetsForAspects = planets.filter((p) => p.id !== 'ascendant' && p.id !== 'midheaven');

  for (let i = 0; i < corePlanetsForAspects.length; i++) {
    for (let j = i + 1; j < corePlanetsForAspects.length; j++) {
      const p1 = corePlanetsForAspects[i];
      const p2 = corePlanetsForAspects[j];

      const diff = Math.abs(p1.longitude - p2.longitude);
      const angle = diff > 180 ? 360 - diff : diff;

      for (const asp of aspectDefs) {
        const orb = Math.abs(angle - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({
            id: `${p1.id}-${p2.id}-${asp.type}`,
            planet1: p1,
            planet2: p2,
            type: asp.type,
            name: asp.name,
            symbol: asp.symbol,
            angle: asp.angle,
            exactAngle: angle,
            orb: Number(orb.toFixed(2)),
            nature: asp.nature,
            color: asp.color,
            interpretation: `${p1.name} en ${asp.name} con ${p2.name} (orbe ${orb.toFixed(1)}°): ${asp.meaning}`,
          });
          break;
        }
      }
    }
  }

  // Calculate Current Celestial Transits with Swiss Ephemeris
  const now = new Date();
  const nowJdUt = sweph.julday(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate(),
    now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600,
    1
  );

  const transitPlanets: PlanetPosition[] = [];
  for (const item of SE_BODIES) {
    let calc = sweph.calc_ut(nowJdUt, item.sweId, DEFAULT_FLAGS);
    if (calc.flag < 0 || calc.error) {
      calc = sweph.calc_ut(nowJdUt, item.sweId, FALLBACK_FLAGS);
    }

    const lon = ((calc.data[0] % 360) + 360) % 360;
    const speed = calc.data[3];
    const isRetro = speed < 0;
    const details = degToSign(lon);
    const house = getHouseNumber(lon, cuspLongitudes);
    const info = PLANET_INFO[item.id];

    transitPlanets.push({
      id: item.id,
      name: `${info?.name || item.name} en Tránsito`,
      symbol: info?.symbol || '✦',
      longitude: lon,
      sign: details.sign,
      degreeInSign: details.degreeInSign,
      minuteInSign: details.minuteInSign,
      secondInSign: details.secondInSign,
      formatted: details.formatted,
      house,
      isRetrograde: isRetro,
      color: '#fbbf24',
      meaning: `Posición celeste actual en ${details.sign} ${details.degreeInSign}° (Casa ${house} natal).`,
    });
  }

  // Active Transits to Natal Planets
  const activeTransits: TransitAspect[] = [];
  for (const tPlanet of transitPlanets) {
    for (const nPlanet of planets) {
      if (nPlanet.id === 'ascendant' || nPlanet.id === 'midheaven') continue;

      const diff = Math.abs(tPlanet.longitude - nPlanet.longitude);
      const angle = diff > 180 ? 360 - diff : diff;

      for (const asp of aspectDefs) {
        // Tighter orb for transits (3.5°)
        const orb = Math.abs(angle - asp.angle);
        if (orb <= 3.5) {
          const isMajor = ['saturn', 'uranus', 'neptune', 'pluto'].includes(tPlanet.id);
          const rawName = tPlanet.name.replace(' en Tránsito', '');
          const impact =
            asp.nature === 'harmonious'
              ? `Canaliza esta ventana de fluidez cósmica para impulsar iniciativas vinculadas a ${nPlanet.name} en Casa ${nPlanet.house}.`
              : `Momento de maduración consciente; integra las lecciones de ${rawName} observando las dinámicas de ${nPlanet.name} en Casa ${nPlanet.house}.`;

          const details = getTransitExplanation({
            transitPlanetId: tPlanet.id,
            transitPlanetName: rawName,
            transitSign: tPlanet.sign,
            natalPlanetId: nPlanet.id,
            natalPlanetName: nPlanet.name,
            natalSign: nPlanet.sign,
            natalHouse: nPlanet.house,
            aspectType: asp.type,
            nature: asp.nature,
            aspectName: asp.name,
          });

          activeTransits.push({
            id: `tr-${tPlanet.id}-${nPlanet.id}-${asp.type}`,
            transitPlanet: tPlanet,
            natalPlanet: nPlanet,
            aspectType: asp.type,
            name: `${rawName} en tránsito ${asp.name} a ${nPlanet.name} natal`,
            angle: asp.angle,
            orb: Number(orb.toFixed(2)),
            nature: asp.nature,
            isMajor,
            transitTheme: `${rawName} en ${tPlanet.sign} activando ${nPlanet.name} en ${nPlanet.sign}`,
            biographicalImpact: impact,
            simpleExplanation: details.simpleExplanation,
            practicalTip: details.practicalTip,
            activatedHouseArea: details.activatedHouseArea,
          });
          break;
        }
      }
    }
  }

  // Anthroposophical biographic engines
  const exactAge = calculateExactAge(birthData.birthDate, birthData.birthTime);
  const southNodeRef = planets.find((p) => p.id === 'southNode') || northNode;
  const lunarNodes = calculateLunarNodeData(
    northNode,
    southNodeRef,
    exactAge.years + exactAge.months / 12
  );
  const { currentSeptenio, allSeptenios } = calculateSeptenioData(exactAge.years, exactAge.months);
  const ascendantRef = planets.find((p) => p.id === 'ascendant') || planets[0];
  const yearOfLife = calculateYearOfLifeAnalysis(exactAge.years, ascendantRef.sign, planets, houses);

  return {
    birthData,
    calculatedAt: new Date().toISOString(),
    exactAge,
    planets,
    houses,
    aspects,
    lunarNodes,
    currentSeptenio,
    allSeptenios,
    yearOfLife,
    currentTransits: {
      transitDate: now.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      transitPlanets,
      activeTransits,
    },
  };
}
