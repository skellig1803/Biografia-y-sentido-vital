export type ZodiacSign =
  | 'Aries'
  | 'Tauro'
  | 'Géminis'
  | 'Cáncer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Escorpio'
  | 'Sagitario'
  | 'Capricornio'
  | 'Acuario'
  | 'Piscis';

export type Element = 'Fuego' | 'Tierra' | 'Aire' | 'Agua';
export type Modality = 'Cardinal' | 'Fijo' | 'Mutable';

export type PlanetId =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'northNode'
  | 'southNode'
  | 'chiron'
  | 'lilith'
  | 'ascendant'
  | 'midheaven';

export interface BirthData {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  placeName: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number; // in hours from UTC, e.g. -5, -3, +1
  ianaTimeZone?: string; // Standard IANA identifier (e.g. Europe/Madrid)
  nodeType?: 'true' | 'mean'; // 'mean' for Mean Lunar Node (default) or 'true' for True Lunar Node
  locationSource?: 'local' | 'internet' | 'manual';
  resolvedPlaceName?: string;
  locationStatus?: 'verified' | 'unverified' | 'searching' | 'error';
}

export interface PlanetPosition {
  id: PlanetId;
  name: string;
  symbol: string;
  longitude: number; // 0 to 360
  sign: ZodiacSign;
  degreeInSign: number;
  minuteInSign: number;
  secondInSign?: number;
  formatted?: string;
  house: number; // 1 to 12
  isRetrograde?: boolean;
  color: string;
  meaning: string;
}

export interface HouseCusp {
  house: number;
  longitude: number;
  sign: ZodiacSign;
  degreeInSign: number;
  minuteInSign: number;
  secondInSign?: number;
  formatted?: string;
  theme: string;
}

export interface Aspect {
  id: string;
  planet1: PlanetPosition;
  planet2: PlanetPosition;
  type: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';
  name: string;
  symbol: string;
  angle: number;
  exactAngle: number;
  orb: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
  color: string;
  interpretation: string;
}

export interface TransitAspect {
  id: string;
  transitPlanet: PlanetPosition;
  natalPlanet: PlanetPosition;
  aspectType: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';
  name: string;
  angle: number;
  orb: number;
  nature: 'harmonious' | 'challenging' | 'neutral';
  isMajor: boolean;
  transitTheme: string;
  biographicalImpact: string;
  simpleExplanation?: string;
  practicalTip?: string;
  activatedHouseArea?: string;
}

export interface LunarNodeData {
  northNode: {
    sign: ZodiacSign;
    house: number;
    degree: number;
    minute: number;
    symbol: string;
    dharmaDirection: string;
    soulLesson: string;
    evolutionaryAction: string;
    strengthsToCultivate: string[];
  };
  southNode: {
    sign: ZodiacSign;
    house: number;
    degree: number;
    minute: number;
    symbol: string;
    pastLifeGifts: string;
    comfortZoneTrap: string;
    patternsToRelease: string[];
  };
  nodalCycle: {
    currentAgeYears: number;
    nextNodalReturnAge: number;
    yearsUntilReturn: number;
    cycleMeaning: string;
  };
}

export interface SeptenioData {
  number: number;
  ageRange: string;
  startAge: number;
  endAge: number;
  archetypalTitle: string;
  phase: 'Desarrollo Biológico-Corporal' | 'Desarrollo Anímico-Psicológico' | 'Desarrollo Espiritual-Moral';
  planetarySphere: string;
  steinerConcept: string;
  coreQuestion: string;
  description: string;
  ageSpecificChallenges: string[];
  currentMilestones: {
    age: number;
    title: string;
    description: string;
    isPast: boolean;
    isCurrent: boolean;
  }[];
  progressPct: number;
}

export interface YearOfLifeAnalysis {
  completedYears: number;
  currentYearOfLife: number; // e.g. 36th year of life when 35 years old
  profectionHouse: number; // 1 to 12
  profectionSign: ZodiacSign;
  lordOfYear: string;
  annualCoreTheme: string;
  anthroposophicYearEnergy: string;
  keyDirectives: string[];
  vitalRecommendations: string[];
}

export interface NatalChartCalculationResult {
  birthData: BirthData;
  calculatedAt: string;
  exactAge: {
    years: number;
    months: number;
    days: number;
    totalDays: number;
    formatted: string;
  };
  planets: PlanetPosition[];
  houses: HouseCusp[];
  aspects: Aspect[];
  lunarNodes: LunarNodeData;
  currentSeptenio: SeptenioData;
  allSeptenios: SeptenioData[];
  yearOfLife: YearOfLifeAnalysis;
  currentTransits: {
    transitDate: string;
    transitPlanets: PlanetPosition[];
    activeTransits: TransitAspect[];
  };
}
