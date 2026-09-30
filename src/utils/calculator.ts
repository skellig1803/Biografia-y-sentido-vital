import {
  calculateAspects,
  calculateCurrentTransits,
  calculatePlanetaryPositions,
} from './astrologyEngine';
import {
  calculateExactAge,
  calculateLunarNodeData,
  calculateSeptenioData,
  calculateYearOfLifeAnalysis,
} from './anthroposophyEngine';
import { calculateHistoricalTimezoneOffset } from '../data/cities';
import { BirthData, NatalChartCalculationResult } from '../types';

export async function calculateSwissChartAsync(
  birthData: BirthData
): Promise<NatalChartCalculationResult> {
  try {
    const res = await fetch('/api/astrology/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(birthData),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Error fetching Swiss Ephemeris from /api/astrology/calculate:', err);
  }

  // Fallback to local synchronous calculation if API unreachable
  return calculateCompleteChart(birthData);
}

export function calculateCompleteChart(birthData: BirthData): NatalChartCalculationResult {
  const [bYear, bMonth, bDay] = birthData.birthDate.split('-').map(Number);
  const [bHour, bMin] = birthData.birthTime.split(':').map(Number);

  let tz = Number(birthData.timezoneOffset);
  if (birthData.ianaTimeZone) {
    tz = calculateHistoricalTimezoneOffset(
      birthData.ianaTimeZone,
      birthData.birthDate,
      birthData.birthTime,
      tz
    );
  }

  const exactAge = calculateExactAge(birthData.birthDate, birthData.birthTime);

  const { planets, houses } = calculatePlanetaryPositions(
    bYear,
    bMonth,
    bDay,
    bHour,
    bMin,
    tz,
    birthData.latitude,
    birthData.longitude
  );

  const aspects = calculateAspects(planets);

  const northNode = planets.find((p) => p.id === 'northNode') || planets[0];
  const southNode = planets.find((p) => p.id === 'southNode') || planets[0];
  const lunarNodes = calculateLunarNodeData(northNode, southNode, exactAge.years + exactAge.months / 12);

  const { currentSeptenio, allSeptenios } = calculateSeptenioData(exactAge.years, exactAge.months);

  const ascendantPlanet = planets.find((p) => p.id === 'ascendant') || planets[0];
  const yearOfLife = calculateYearOfLifeAnalysis(exactAge.years, ascendantPlanet.sign, planets, houses);

  const currentTransits = calculateCurrentTransits(planets, new Date());

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
      transitDate: new Date().toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      transitPlanets: currentTransits.transitPlanets,
      activeTransits: currentTransits.activeTransits,
    },
  };
}
