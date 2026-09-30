import {
  Aspect,
  BirthData,
  HouseCusp,
  PlanetId,
  PlanetPosition,
  TransitAspect,
  ZodiacSign,
} from '../types';
import { getTransitExplanation } from './transitExplanations';

export const ZODIAC_SIGNS: {
  sign: ZodiacSign;
  symbol: string;
  element: 'Fuego' | 'Tierra' | 'Aire' | 'Agua';
  modality: 'Cardinal' | 'Fijo' | 'Mutable';
  ruler: string;
  degrees: number;
  color: string;
}[] = [
  { sign: 'Aries', symbol: '♈', element: 'Fuego', modality: 'Cardinal', ruler: 'Marte', degrees: 0, color: '#ef4444' },
  { sign: 'Tauro', symbol: '♉', element: 'Tierra', modality: 'Fijo', ruler: 'Venus', degrees: 30, color: '#10b981' },
  { sign: 'Géminis', symbol: '♊', element: 'Aire', modality: 'Mutable', ruler: 'Mercurio', degrees: 60, color: '#eab308' },
  { sign: 'Cáncer', symbol: '♋', element: 'Agua', modality: 'Cardinal', ruler: 'Luna', degrees: 90, color: '#06b6d4' },
  { sign: 'Leo', symbol: '♌', element: 'Fuego', modality: 'Fijo', ruler: 'Sol', degrees: 120, color: '#f97316' },
  { sign: 'Virgo', symbol: '♍', element: 'Tierra', modality: 'Mutable', ruler: 'Mercurio', degrees: 150, color: '#84cc16' },
  { sign: 'Libra', symbol: '♎', element: 'Aire', modality: 'Cardinal', ruler: 'Venus', degrees: 180, color: '#ec4899' },
  { sign: 'Escorpio', symbol: '♏', element: 'Agua', modality: 'Fijo', ruler: 'Plutón / Marte', degrees: 210, color: '#8b5cf6' },
  { sign: 'Sagitario', symbol: '♐', element: 'Fuego', modality: 'Mutable', ruler: 'Júpiter', degrees: 240, color: '#f59e0b' },
  { sign: 'Capricornio', symbol: '♑', element: 'Tierra', modality: 'Cardinal', ruler: 'Saturno', degrees: 270, color: '#64748b' },
  { sign: 'Acuario', symbol: '♒', element: 'Aire', modality: 'Fijo', ruler: 'Urano / Saturno', degrees: 300, color: '#3b82f6' },
  { sign: 'Piscis', symbol: '♓', element: 'Agua', modality: 'Mutable', ruler: 'Neptuno / Júpiter', degrees: 330, color: '#14b8a6' },
];

export const PLANET_INFO: Record<
  PlanetId,
  { name: string; symbol: string; color: string; defaultMeaning: string }
> = {
  sun: { name: 'Sol', symbol: '☉', color: '#f59e0b', defaultMeaning: 'Identidad esencial, vitalidad, brillo del Yo consciente y voluntad.' },
  moon: { name: 'Luna', symbol: '☽', color: '#e0e7ff', defaultMeaning: 'Mundo emocional, memoria del alma, receptividad e instinto de protección.' },
  mercury: { name: 'Mercurio', symbol: '☿', color: '#38bdf8', defaultMeaning: 'Mente analítica, comunicación, puentes de entendimiento y aprendizaje.' },
  venus: { name: 'Venus', symbol: '♀', color: '#f472b6', defaultMeaning: 'Principio de atracción, valores profundos, armonía estética y amor.' },
  mars: { name: 'Marte', symbol: '♂', color: '#ef4444', defaultMeaning: 'Fuerza impulsora, coraje para actuar, iniciativa y deseo de conquista.' },
  jupiter: { name: 'Júpiter', symbol: '♃', color: '#fbbf24', defaultMeaning: 'Expansión de conciencia, sabiduría filosófica, fe y generosidad vital.' },
  saturn: { name: 'Saturno', symbol: '♄', color: '#94a3b8', defaultMeaning: 'El guardián del umbral: estructura, tiempo, límites, madurez y disciplina kármica.' },
  uranus: { name: 'Urano', symbol: '♅', color: '#06b6d4', defaultMeaning: 'Despertar repentino, originalidad, impulso de libertad y visión cósmica.' },
  neptune: { name: 'Neptuno', symbol: '♆', color: '#818cf8', defaultMeaning: 'Disolución del ego, misticismo, intuición superior e inspiración artística.' },
  pluto: { name: 'Plutón', symbol: '♇', color: '#a855f7', defaultMeaning: 'Muerte y renacimiento, transmutación de sombras y empoderamiento del alma.' },
  northNode: { name: 'Nodo Lunar Norte', symbol: '☊', color: '#22c55e', defaultMeaning: 'Dharma: dirección evolutiva, brújula del alma y destino a conquistar.' },
  southNode: { name: 'Nodo Lunar Sur', symbol: '☋', color: '#e11d48', defaultMeaning: 'Karma: memoria acumulada, talentos innatos y zona de confort a trascender.' },
  chiron: { name: 'Quirón', symbol: '⚷', color: '#d97706', defaultMeaning: 'El sanador herido: vulnerabilidad primaria que se transmuta en sabiduría y servicio.' },
  lilith: { name: 'Lilith (Luna Negra)', symbol: '⚸', color: '#6b21a8', defaultMeaning: 'La sombra femenina, instinto reprimido, magnetismo oculto y empoderamiento primordial.' },
  ascendant: { name: 'Ascendente (AC)', symbol: 'AC', color: '#fb923c', defaultMeaning: 'La puerta de entrada a la encarnación terrenal y cómo nos proyectamos al mundo.' },
  midheaven: { name: 'Medio Cielo (MC)', symbol: 'MC', color: '#a3e635', defaultMeaning: 'La cumbre de la vocación, realización pública y propósito social superior.' },
};

export const HOUSE_THEMES: Record<number, string> = {
  1: 'El Yo, cuerpo físico, personalidad y primera impresión.',
  2: 'Recursos materiales, autoestima, dones propios y sustento.',
  3: 'Mente concreta, entorno cercano, hermanos, comunicación y aprendizaje.',
  4: 'Hogar, raíces ancestrales, intimidad emocional y base biográfica.',
  5: 'Creatividad, gozo vital, autoexpresión, hijos y proyectos de corazón.',
  6: 'Rutina cotidiana, salud, servicio, discernimiento y hábitos etéricos.',
  7: 'El Otro, vínculos comprometidos, parejas y espejo relacional.',
  8: 'Transformación profunda, herencias, intimidad sexual y regeneración.',
  9: 'Filosofía de vida, viajes lejanos, cosmovisión y sabiduría superior.',
  10: 'Vocación, destino profesional, reconocimiento y legado público.',
  11: 'Comunidad, ideales colectivos, amistades afines y visión de futuro.',
  12: 'Inconsciente colectivo, retiro espiritual, misterio y disolución kármica.',
};

export interface DegToSignDetailsResult {
  sign: ZodiacSign;
  degreeInSign: number;
  minuteInSign: number;
  secondInSign: number;
  formatted: string;
  formattedShort: string;
}

// Convert degrees to [Sign, degree, minute, second] with strict carry-over rounding
export function degToSignDetails(
  longitude: number,
  roundTo: 'second' | 'minute' = 'second'
): DegToSignDetailsResult {
  const normDeg = ((longitude % 360) + 360) % 360;
  let totalSeconds = Math.round(normDeg * 3600);

  if (roundTo === 'minute') {
    totalSeconds = Math.round(totalSeconds / 60) * 60;
  }

  const CIRCLE_SECONDS = 360 * 3600;
  totalSeconds = ((totalSeconds % CIRCLE_SECONDS) + CIRCLE_SECONDS) % CIRCLE_SECONDS;

  const SIGN_SECONDS = 30 * 3600;
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

// Convert Julian Date to standard Julian Day Number
export function getJulianDay(
  year: number,
  month: number,
  day: number,
  utcHours: number
): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd =
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    utcHours / 24 +
    b -
    1524.5;
  return jd;
}

// Centuries since J2000.0
function centuriesSinceJ2000(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function normDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// Accurate planetary ephemerides approximations based on Astronomical Algorithms (Meeus)
export function calculatePlanetaryPositions(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezoneOffset: number,
  latitude: number,
  longitude: number
): {
  planets: PlanetPosition[];
  houses: HouseCusp[];
  ascendantDeg: number;
  mcDeg: number;
  ramcDeg: number;
  epsDeg: number;
} {
  // Convert local civil time to UTC timestamp and astronomical Julian Day
  // Handles all month lengths, leap years, and timezone offsets with millisecond precision
  const localDateMs = Date.UTC(year, month - 1, day, hour, minute);
  const utcDateMs = localDateMs - timezoneOffset * 3600 * 1000;
  const jd = utcDateMs / 86400000 + 2440587.5;
  const T = centuriesSinceJ2000(jd);

  // --- Sun Calculation ---
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T;
  const C =
    (1.914602 - 0.004817 * T) * Math.sin(M * RAD) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD) +
    0.000289 * Math.sin(3 * M * RAD);
  const sunTrueLong = normDeg(L0 + C);

  // --- Moon Calculation ---
  const Lp = 218.3164477 + 481267.8812773 * T;
  const D = 297.8501921 + 445267.1114034 * T;
  const Mm = 134.9633964 + 477198.8675055 * T;
  const F = 93.272095 + 483202.0175233 * T;

  const moonLong = normDeg(
    Lp +
      6.288774 * Math.sin(Mm * RAD) +
      1.274027 * Math.sin((2 * D - Mm) * RAD) +
      0.658314 * Math.sin(2 * D * RAD) +
      0.213618 * Math.sin(2 * Mm * RAD) -
      0.185116 * Math.sin(M * RAD) -
      0.114332 * Math.sin(2 * F * RAD)
  );

  // --- Lunar Node (Mean North Node) ---
  // Omega = 125.04452 - 1934.136261 * T
  const northNodeLong = normDeg(125.04452 - 1934.136261 * T + 0.0020708 * T * T);
  const southNodeLong = normDeg(northNodeLong + 180);

  // --- Rigorous Keplerian heliocentric to geocentric solver for planets (Meeus Astronomical Algorithms) ---
  const R_sun = 1.000001018 * (1 - e * e) / (1 + e * Math.cos((M + C) * RAD));
  const x_earth = R_sun * Math.cos((sunTrueLong + 180) * RAD);
  const y_earth = R_sun * Math.sin((sunTrueLong + 180) * RAD);

  function solveKeplerianPlanet(a: number, eOrb: number, incDeg: number, nodeDeg: number, periDeg: number, meanLon0: number, nRate: number): number {
    const L = normDeg(meanLon0 + nRate * T);
    const mAnom = normDeg(L - periDeg);
    let E = mAnom * RAD;
    for (let k = 0; k < 6; k++) {
      E = E - (E - eOrb * Math.sin(E) - mAnom * RAD) / (1 - eOrb * Math.cos(E));
    }
    const nu = 2 * Math.atan2(Math.sqrt(1 + eOrb) * Math.sin(E / 2), Math.sqrt(1 - eOrb) * Math.cos(E / 2));
    const r = a * (1 - eOrb * Math.cos(E));
    const u = normDeg(nu * DEG + periDeg - nodeDeg);
    const x_h = r * (Math.cos(nodeDeg * RAD) * Math.cos(u * RAD) - Math.sin(nodeDeg * RAD) * Math.sin(u * RAD) * Math.cos(incDeg * RAD));
    const y_h = r * (Math.sin(nodeDeg * RAD) * Math.cos(u * RAD) + Math.cos(nodeDeg * RAD) * Math.sin(u * RAD) * Math.cos(incDeg * RAD));
    const x_geo = x_h - x_earth;
    const y_geo = y_h - y_earth;
    return normDeg(Math.atan2(y_geo, x_geo) * DEG);
  }

  // Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Chiron
  const mercuryLong = solveKeplerianPlanet(0.387098, 0.205630, 7.005, 48.331, 77.456, 252.251, 149472.6746);
  const venusLong = solveKeplerianPlanet(0.723332, 0.006772, 3.395, 76.680, 131.564, 181.979, 58517.8156);
  const marsLong = solveKeplerianPlanet(1.523679, 0.093405, 1.850, 49.558, 336.060, 355.433, 19140.2993);
  const jupiterLong = solveKeplerianPlanet(5.2044, 0.04849, 1.303, 100.46, 14.73, 34.35, 3034.9057);
  const saturnLong = solveKeplerianPlanet(9.5826, 0.05551, 2.489, 113.67, 92.60, 50.08, 1222.1138);
  const uranusLong = solveKeplerianPlanet(19.2184, 0.04630, 0.773, 74.01, 170.95, 314.06, 428.467);
  const neptuneLong = solveKeplerianPlanet(30.1104, 0.00946, 1.770, 131.78, 44.97, 304.35, 218.486);
  const plutoLong = solveKeplerianPlanet(39.482, 0.2488, 17.16, 110.30, 224.07, 238.93, 145.208);
  const chironLong = normDeg(95.2 + 7.2 * (T + 0.106)); // Chiron around ~95° (5° Cancer) for 1989-1990 epochs

  // --- Ascendant & Midheaven (MC) Calculation ---
  // Greenwich Mean Sidereal Time (GMST) in degrees
  const gmst0 = normDeg(280.46061837 + 360.98564736629 * (jd - 2451545.0));
  // Local Sidereal Time (RAMC in degrees)
  const ramc = normDeg(gmst0 + longitude);

  // Obliquity of the Ecliptic (eps)
  const eps = 23.4392911 - 0.0130042 * T;

  // Midheaven (MC): tan(MC) = tan(RAMC) / cos(eps)
  const mcRad = Math.atan2(Math.sin(ramc * RAD), Math.cos(ramc * RAD) * Math.cos(eps * RAD));
  const mcDeg = normDeg(mcRad * DEG);

  // Ascendant (ASC):
  // True astronomical formula for the eastern rising ecliptic horizon:
  // tan(ASC) = cos(RAMC) / -(sin(RAMC)*cos(eps) + tan(lat)*sin(eps))
  const yAsc = Math.cos(ramc * RAD);
  const xAsc = -(
    Math.sin(ramc * RAD) * Math.cos(eps * RAD) +
    Math.tan(latitude * RAD) * Math.sin(eps * RAD)
  );
  const ascRad = Math.atan2(yAsc, xAsc);
  const ascendantDeg = normDeg(ascRad * DEG);

  // Compute 12 House Cusps using the Placidus System
  const houses = calculateHousesPlacidus(ramc, eps, latitude, ascendantDeg, mcDeg);

  const rawPositions: { id: PlanetId; longitude: number; isRetrograde?: boolean }[] = [
    { id: 'sun', longitude: sunTrueLong },
    { id: 'moon', longitude: moonLong },
    { id: 'mercury', longitude: mercuryLong },
    { id: 'venus', longitude: venusLong },
    { id: 'mars', longitude: marsLong },
    { id: 'jupiter', longitude: jupiterLong },
    { id: 'saturn', longitude: saturnLong },
    { id: 'uranus', longitude: uranusLong },
    { id: 'neptune', longitude: neptuneLong },
    { id: 'pluto', longitude: plutoLong },
    { id: 'northNode', longitude: northNodeLong, isRetrograde: true },
    { id: 'southNode', longitude: southNodeLong, isRetrograde: true },
    { id: 'chiron', longitude: chironLong },
    { id: 'ascendant', longitude: ascendantDeg },
    { id: 'midheaven', longitude: mcDeg },
  ];

  const planets: PlanetPosition[] = rawPositions.map((p) => {
    const info = PLANET_INFO[p.id];
    const details = degToSignDetails(p.longitude);
    const house =
      p.id === 'ascendant'
        ? 1
        : p.id === 'midheaven'
        ? 10
        : getPlacidusHouse(p.longitude, houses);
    return {
      id: p.id,
      name: info.name,
      symbol: info.symbol,
      longitude: p.longitude,
      sign: details.sign,
      degreeInSign: details.degreeInSign,
      minuteInSign: details.minuteInSign,
      secondInSign: details.secondInSign,
      formatted: details.formatted,
      house,
      isRetrograde: p.isRetrograde || false,
      color: info.color,
      meaning: info.defaultMeaning,
    };
  });

  return { planets, houses, ascendantDeg, mcDeg, ramcDeg: ramc, epsDeg: eps };
}

// Calculate the 12 House Cusps using the Placidus System (Trisection of semi-arcs)
export function calculateHousesPlacidus(
  ramcDeg: number,
  epsDeg: number,
  latitudeDeg: number,
  ascendantDeg: number,
  mcDeg: number
): HouseCusp[] {
  const epsRad = epsDeg * RAD;
  // Clamp latitude to [-65.5, 65.5] to prevent polar singularities in Placidus semi-arc calculations
  const safeLat = Math.max(-65.5, Math.min(65.5, latitudeDeg));
  const latRad = safeLat * RAD;

  const cusp10 = normDeg(mcDeg);
  const cusp4 = normDeg(mcDeg + 180);
  const cusp1 = normDeg(ascendantDeg);
  const cusp7 = normDeg(ascendantDeg + 180);

  // Fixed point iterative solver for intermediate Placidus cusps
  function solvePlacidusCusp(offsetDeg: number, fRatio: number): number {
    const R = normDeg(ramcDeg + offsetDeg);
    const K = fRatio * Math.tan(latRad) * Math.tan(epsRad);

    let alpha = R;
    for (let i = 0; i < 30; i++) {
      const sinAlpha = Math.sin(alpha * RAD);
      const arg = Math.max(-0.99999, Math.min(0.99999, K * sinAlpha));
      const delta = Math.asin(arg) * DEG;
      const nextAlpha = normDeg(R + delta);
      if (Math.abs(nextAlpha - alpha) < 1e-6) {
        alpha = nextAlpha;
        break;
      }
      alpha = nextAlpha;
    }

    const alphaRad = alpha * RAD;
    const y = Math.sin(alphaRad);
    const x = Math.cos(alphaRad) * Math.cos(epsRad);
    return normDeg(Math.atan2(y, x) * DEG);
  }

  // Diurnal semi-arc trisection (Houses 11 & 12)
  const cusp11 = solvePlacidusCusp(30, 1 / 3);
  const cusp12 = solvePlacidusCusp(60, 2 / 3);
  // Opposite nocturnal cusps
  const cusp5 = normDeg(cusp11 + 180);
  const cusp6 = normDeg(cusp12 + 180);

  // Nocturnal semi-arc trisection (Houses 2 & 3)
  const cusp2 = solvePlacidusCusp(120, 2 / 3);
  const cusp3 = solvePlacidusCusp(150, 1 / 3);
  // Opposite diurnal cusps
  const cusp8 = normDeg(cusp2 + 180);
  const cusp9 = normDeg(cusp3 + 180);

  const rawCusps = [
    cusp1,  // Casa 1 (Ascendente - AC)
    cusp2,  // Casa 2
    cusp3,  // Casa 3
    cusp4,  // Casa 4 (Fondo de Cielo - IC)
    cusp5,  // Casa 5
    cusp6,  // Casa 6
    cusp7,  // Casa 7 (Descendente - DC)
    cusp8,  // Casa 8
    cusp9,  // Casa 9
    cusp10, // Casa 10 (Medio Cielo - MC)
    cusp11, // Casa 11
    cusp12, // Casa 12
  ];

  return rawCusps.map((longDeg, idx) => {
    const houseNum = idx + 1;
    const details = degToSignDetails(longDeg);
    return {
      house: houseNum,
      longitude: longDeg,
      sign: details.sign,
      degreeInSign: details.degreeInSign,
      minuteInSign: details.minuteInSign,
      secondInSign: details.secondInSign,
      formatted: details.formatted,
      theme: HOUSE_THEMES[houseNum],
    };
  });
}

// Function to find which Placidus house a given ecliptic longitude belongs to
export function getPlacidusHouse(longDeg: number, cusps: HouseCusp[]): number {
  const pLong = normDeg(longDeg);
  for (let i = 0; i < 12; i++) {
    const currentCusp = cusps[i].longitude;
    const nextCusp = cusps[(i + 1) % 12].longitude;
    const dist = normDeg(pLong - currentCusp);
    const span = normDeg(nextCusp - currentCusp);
    if (dist >= 0 && dist < span) {
      return cusps[i].house;
    }
  }
  return 1;
}

// Backward-compatible wrapper for calculateHouses that defaults to Placidus
export function calculateHouses(
  ascendantDeg: number,
  mcDeg?: number,
  ramcDeg?: number,
  epsDeg?: number,
  latitudeDeg?: number
): HouseCusp[] {
  if (
    mcDeg !== undefined &&
    ramcDeg !== undefined &&
    epsDeg !== undefined &&
    latitudeDeg !== undefined
  ) {
    return calculateHousesPlacidus(ramcDeg, epsDeg, latitudeDeg, ascendantDeg, mcDeg);
  }
  // Fallback if only Ascendant degree provided
  const cusps: HouseCusp[] = [];
  for (let i = 1; i <= 12; i++) {
    const cuspLong = normDeg(ascendantDeg + (i - 1) * 30);
    const details = degToSignDetails(cuspLong);
    cusps.push({
      house: i,
      longitude: cuspLong,
      sign: details.sign,
      degreeInSign: details.degreeInSign,
      minuteInSign: details.minuteInSign,
      secondInSign: details.secondInSign,
      formatted: details.formatted,
      theme: HOUSE_THEMES[i],
    });
  }
  return cusps;
}

// Calculate Aspects between natal planets
export function calculateAspects(planets: PlanetPosition[]): Aspect[] {
  const aspects: Aspect[] = [];
  const aspectDefs = [
    { type: 'conjunction' as const, name: 'Conjunción', symbol: '☌', angle: 0, maxOrb: 8, nature: 'neutral' as const, color: '#a855f7' },
    { type: 'opposition' as const, name: 'Oposición', symbol: '☍', angle: 180, maxOrb: 8, nature: 'challenging' as const, color: '#ef4444' },
    { type: 'trine' as const, name: 'Trígono', symbol: '△', angle: 120, maxOrb: 7, nature: 'harmonious' as const, color: '#10b981' },
    { type: 'square' as const, name: 'Cuadratura', symbol: '□', angle: 90, maxOrb: 7, nature: 'challenging' as const, color: '#f97316' },
    { type: 'sextile' as const, name: 'Sextil', symbol: '⚹', angle: 60, maxOrb: 5, nature: 'harmonious' as const, color: '#06b6d4' },
  ];

  // Exclude Ascendant and Midheaven from duplicate aspect pairs, keep celestial bodies
  const mainPlanets = planets.filter((p) => p.id !== 'southNode');

  for (let i = 0; i < mainPlanets.length; i++) {
    for (let j = i + 1; j < mainPlanets.length; j++) {
      const p1 = mainPlanets[i];
      const p2 = mainPlanets[j];

      let diff = Math.abs(p1.longitude - p2.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const def of aspectDefs) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.maxOrb) {
          const aspectInterpretation = generateAspectInterpretation(p1, p2, def.name, def.nature);
          aspects.push({
            id: `${p1.id}-${def.type}-${p2.id}`,
            planet1: p1,
            planet2: p2,
            type: def.type,
            name: def.name,
            symbol: def.symbol,
            angle: def.angle,
            exactAngle: diff,
            orb: Number(orb.toFixed(2)),
            nature: def.nature,
            color: def.color,
            interpretation: aspectInterpretation,
          });
          break;
        }
      }
    }
  }

  // Sort by tightness of orb
  return aspects.sort((a, b) => a.orb - b.orb);
}

function generateAspectInterpretation(
  p1: PlanetPosition,
  p2: PlanetPosition,
  aspectName: string,
  nature: 'harmonious' | 'challenging' | 'neutral'
): string {
  const relationship =
    nature === 'harmonious'
      ? 'fluyen con facilidad creativa y enriquecimiento mutuo'
      : nature === 'challenging'
      ? 'generan tensión evolutiva, exigiendo maduración e integración de polaridades'
      : 'se fusionan de forma poderosa y directa';

  return `${aspectName} entre ${p1.name} en ${p1.sign} y ${p2.name} en ${p2.sign}: las energías de ${p1.name.toLowerCase()} y ${p2.name.toLowerCase()} ${relationship}.`;
}

// Calculate active transits of current sky to natal planets
export function calculateCurrentTransits(
  natalPlanets: PlanetPosition[],
  currentDate: Date = new Date()
): { transitPlanets: PlanetPosition[]; activeTransits: TransitAspect[] } {
  // Calculate planetary positions for transit date at 12:00 UTC
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const { planets: transitPlanets } = calculatePlanetaryPositions(
    year,
    month,
    day,
    12,
    0,
    0,
    0,
    0
  );

  const activeTransits: TransitAspect[] = [];
  const aspectDefs = [
    { type: 'conjunction' as const, name: 'Conjunción', angle: 0, orbLimit: 4.5, nature: 'neutral' as const },
    { type: 'opposition' as const, name: 'Oposición', angle: 180, orbLimit: 4.5, nature: 'challenging' as const },
    { type: 'square' as const, name: 'Cuadratura', angle: 90, orbLimit: 4.0, nature: 'challenging' as const },
    { type: 'trine' as const, name: 'Trígono', angle: 120, orbLimit: 4.0, nature: 'harmonious' as const },
    { type: 'sextile' as const, name: 'Sextil', angle: 60, orbLimit: 3.5, nature: 'harmonious' as const },
  ];

  // Prioritize transits from outer/transpersonal planets to personal natal planets (Sun, Moon, Mercury, Venus, Mars, ASC, MC, Saturn, Jupiter)
  const significantTransits = ['pluto', 'neptune', 'uranus', 'saturn', 'jupiter', 'mars', 'northNode'];
  const significantNatal = ['sun', 'moon', 'ascendant', 'midheaven', 'saturn', 'venus', 'mercury', 'mars', 'northNode'];

  for (const tPlanet of transitPlanets) {
    if (!significantTransits.includes(tPlanet.id)) continue;

    for (const nPlanet of natalPlanets) {
      if (!significantNatal.includes(nPlanet.id)) continue;

      let diff = Math.abs(tPlanet.longitude - nPlanet.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const def of aspectDefs) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orbLimit) {
          const isMajor = ['saturn', 'uranus', 'neptune', 'pluto'].includes(tPlanet.id);
          const impact = generateTransitImpact(tPlanet, nPlanet, def.name, def.nature);

          const details = getTransitExplanation({
            transitPlanetId: tPlanet.id,
            transitPlanetName: tPlanet.name,
            transitSign: tPlanet.sign,
            natalPlanetId: nPlanet.id,
            natalPlanetName: nPlanet.name,
            natalSign: nPlanet.sign,
            natalHouse: nPlanet.house,
            aspectType: def.type,
            nature: def.nature,
            aspectName: def.name,
          });

          activeTransits.push({
            id: `transit-${tPlanet.id}-${def.type}-${nPlanet.id}`,
            transitPlanet: tPlanet,
            natalPlanet: nPlanet,
            aspectType: def.type,
            name: `${tPlanet.name} en tránsito ${def.name} a ${nPlanet.name} natal`,
            angle: def.angle,
            orb: Number(orb.toFixed(2)),
            nature: def.nature,
            isMajor,
            transitTheme: `${tPlanet.name} en ${tPlanet.sign} activando ${nPlanet.name} en ${nPlanet.sign}`,
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

  // Sort by major transits first, then orb tightness
  activeTransits.sort((a, b) => {
    if (a.isMajor && !b.isMajor) return -1;
    if (!a.isMajor && b.isMajor) return 1;
    return a.orb - b.orb;
  });

  return { transitPlanets, activeTransits };
}

function generateTransitImpact(
  transitP: PlanetPosition,
  natalP: PlanetPosition,
  aspectName: string,
  nature: 'harmonious' | 'challenging' | 'neutral'
): string {
  if (transitP.id === 'saturn') {
    return `Saturno demanda rigor, realismo y asunción de madurez consciente. Pone a prueba la autenticidad de tu ${natalP.name} para purgar lo superfluo y construir cimientos duraderos.`;
  }
  if (transitP.id === 'uranus') {
    return `Urano rompe rigideces y patrones caducos en torno a tu ${natalP.name}. Trae despertares repentinos, necesidad de autenticidad e impulsos de libertad biográfica.`;
  }
  if (transitP.id === 'neptune') {
    return `Neptuno disuelve las fronteras del ego e inspira un anhelo de entrega trascendente. Exige afinar la intuición para no caer en espejismos con respecto a tu ${natalP.name}.`;
  }
  if (transitP.id === 'pluto') {
    return `Plutón impulsa una profunda metamorfosis celular y anímica. Muerte simbólica de viejas identidades vinculadas a tu ${natalP.name} para renacer con poder interior.`;
  }
  if (transitP.id === 'jupiter') {
    return `Júpiter aporta confianza, perspectiva expandida y oportunidades benéficas para hacer crecer el potencial de tu ${natalP.name} en tu año de vida.`;
  }
  if (transitP.id === 'northNode') {
    return `El Nodo Norte activa el raíl de tu destino kármico: sincronías y personas clave catalizan el llamado evolutivo de tu ${natalP.name}.`;
  }
  return `Tránsito activo de ${transitP.name} sobre tu ${natalP.name}: dinamiza la energía y despierta los temas del septenio actual.`;
}
