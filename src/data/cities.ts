export interface CityInfo {
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezoneOffset: number; // Standard UTC offset in hours
  ianaTimeZone?: string; // Standard IANA identifier (e.g. Europe/Madrid)
}

/**
 * Computes the exact historical UTC offset in hours for any specific birth date and time,
 * automatically taking into account Daylight Saving Time (DST / Horario de Verano) historical rules.
 */
export function calculateHistoricalTimezoneOffset(
  ianaTimeZone: string,
  dateStr: string,
  timeStr: string = '12:00',
  fallbackOffset: number = 0
): number {
  try {
    if (!ianaTimeZone) return fallbackOffset;
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    if (!y || !m || !d) return fallbackOffset;

    const testUtc = new Date(Date.UTC(y, m - 1, d, h || 12, min || 0, 0));
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(testUtc);
    const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
    const tzYear = getPart('year');
    const tzMonth = getPart('month');
    const tzDay = getPart('day');
    let tzHour = getPart('hour');
    if (tzHour === 24) tzHour = 0;
    const tzMin = getPart('minute');

    const tzDateAsUtc = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, 0));
    const offsetHours = (tzDateAsUtc.getTime() - testUtc.getTime()) / (3600 * 1000);
    return Math.round(offsetHours * 2) / 2; // Supports half-hour offsets like 5.5
  } catch (err) {
    console.warn('Error calculating historical timezone offset:', err);
    return fallbackOffset;
  }
}

export const POPULAR_CITIES: CityInfo[] = [
  // España
  { name: 'Madrid', country: 'España', lat: 40.4168, lng: -3.7038, timezoneOffset: 1, ianaTimeZone: 'Europe/Madrid' },
  { name: 'Barcelona', country: 'España', lat: 41.3879, lng: 2.1699, timezoneOffset: 1, ianaTimeZone: 'Europe/Madrid' },
  { name: 'Valencia', country: 'España', lat: 39.4699, lng: -0.3763, timezoneOffset: 1, ianaTimeZone: 'Europe/Madrid' },
  { name: 'Sevilla', country: 'España', lat: 37.3891, lng: -5.9845, timezoneOffset: 1, ianaTimeZone: 'Europe/Madrid' },
  { name: 'Bilbao', country: 'España', lat: 43.263, lng: -2.935, timezoneOffset: 1, ianaTimeZone: 'Europe/Madrid' },
  { name: 'Málaga', country: 'España', lat: 36.7213, lng: -4.4214, timezoneOffset: 1, ianaTimeZone: 'Europe/Madrid' },

  // México
  { name: 'Ciudad de México', country: 'México', lat: 19.4326, lng: -99.1332, timezoneOffset: -6, ianaTimeZone: 'America/Mexico_City' },
  { name: 'Guadalajara', country: 'México', lat: 20.6597, lng: -103.3496, timezoneOffset: -6, ianaTimeZone: 'America/Mexico_City' },
  { name: 'Monterrey', country: 'México', lat: 25.6866, lng: -100.3161, timezoneOffset: -6, ianaTimeZone: 'America/Monterrey' },
  { name: 'Puebla', country: 'México', lat: 19.0414, lng: -98.2063, timezoneOffset: -6, ianaTimeZone: 'America/Mexico_City' },
  { name: 'Cancún', country: 'México', lat: 21.1619, lng: -86.8515, timezoneOffset: -5, ianaTimeZone: 'America/Cancun' },
  { name: 'Tijuana', country: 'México', lat: 32.5149, lng: -117.0382, timezoneOffset: -8, ianaTimeZone: 'America/Tijuana' },

  // Argentina
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816, timezoneOffset: -3, ianaTimeZone: 'America/Argentina/Buenos_Aires' },
  { name: 'Córdoba', country: 'Argentina', lat: -31.4201, lng: -64.1888, timezoneOffset: -3, ianaTimeZone: 'America/Argentina/Cordoba' },
  { name: 'Rosario', country: 'Argentina', lat: -32.9442, lng: -60.6505, timezoneOffset: -3, ianaTimeZone: 'America/Argentina/Buenos_Aires' },
  { name: 'Mendoza', country: 'Argentina', lat: -32.8895, lng: -68.8458, timezoneOffset: -3, ianaTimeZone: 'America/Argentina/Mendoza' },

  // Colombia
  { name: 'Bogotá', country: 'Colombia', lat: 4.711, lng: -74.0721, timezoneOffset: -5, ianaTimeZone: 'America/Bogota' },
  { name: 'Medellín', country: 'Colombia', lat: 6.2442, lng: -75.5812, timezoneOffset: -5, ianaTimeZone: 'America/Bogota' },
  { name: 'Cali', country: 'Colombia', lat: 3.4516, lng: -76.532, timezoneOffset: -5, ianaTimeZone: 'America/Bogota' },
  { name: 'Barranquilla', country: 'Colombia', lat: 10.9685, lng: -74.7813, timezoneOffset: -5, ianaTimeZone: 'America/Bogota' },

  // Chile
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693, timezoneOffset: -3, ianaTimeZone: 'America/Santiago' },
  { name: 'Valparaíso', country: 'Chile', lat: -33.0472, lng: -71.6127, timezoneOffset: -3, ianaTimeZone: 'America/Santiago' },
  { name: 'Concepción', country: 'Chile', lat: -36.827, lng: -73.0503, timezoneOffset: -3, ianaTimeZone: 'America/Santiago' },

  // Perú
  { name: 'Lima', country: 'Perú', lat: -12.0464, lng: -77.0428, timezoneOffset: -5, ianaTimeZone: 'America/Lima' },
  { name: 'Cusco', country: 'Perú', lat: -13.5319, lng: -71.9675, timezoneOffset: -5, ianaTimeZone: 'America/Lima' },
  { name: 'Arequipa', country: 'Perú', lat: -16.409, lng: -71.5375, timezoneOffset: -5, ianaTimeZone: 'America/Lima' },

  // Ecuador
  { name: 'Cuenca', country: 'Ecuador', lat: -2.9001, lng: -79.0059, timezoneOffset: -5, ianaTimeZone: 'America/Guayaquil' },
  { name: 'Quito', country: 'Ecuador', lat: -0.1807, lng: -78.4678, timezoneOffset: -5, ianaTimeZone: 'America/Guayaquil' },
  { name: 'Guayaquil', country: 'Ecuador', lat: -2.1709, lng: -79.9224, timezoneOffset: -5, ianaTimeZone: 'America/Guayaquil' },
  { name: 'Ambato', country: 'Ecuador', lat: -1.2491, lng: -78.6168, timezoneOffset: -5, ianaTimeZone: 'America/Guayaquil' },
  { name: 'Loja', country: 'Ecuador', lat: -3.9931, lng: -79.2042, timezoneOffset: -5, ianaTimeZone: 'America/Guayaquil' },
  { name: 'Manta', country: 'Ecuador', lat: -0.9677, lng: -80.7089, timezoneOffset: -5, ianaTimeZone: 'America/Guayaquil' },
  { name: 'Portoviejo', country: 'Ecuador', lat: -1.0546, lng: -80.4545, timezoneOffset: -5, ianaTimeZone: 'America/Guayaquil' },
  { name: 'Machala', country: 'Ecuador', lat: -3.2586, lng: -79.9554, timezoneOffset: -5, ianaTimeZone: 'America/Guayaquil' },
  { name: 'Riobamba', country: 'Ecuador', lat: -1.6744, lng: -78.6483, timezoneOffset: -5, ianaTimeZone: 'America/Guayaquil' },
  { name: 'Ibarra', country: 'Ecuador', lat: 0.3517, lng: -78.1223, timezoneOffset: -5, ianaTimeZone: 'America/Guayaquil' },
  { name: 'Santo Domingo', country: 'Ecuador', lat: -0.2532, lng: -79.1754, timezoneOffset: -5, ianaTimeZone: 'America/Guayaquil' },

  // Otros países de América Latina
  { name: 'Caracas', country: 'Venezuela', lat: 10.4806, lng: -66.9036, timezoneOffset: -4, ianaTimeZone: 'America/Caracas' },
  { name: 'Maracaibo', country: 'Venezuela', lat: 10.6427, lng: -71.6125, timezoneOffset: -4, ianaTimeZone: 'America/Caracas' },
  { name: 'Valencia', country: 'Venezuela', lat: 10.162, lng: -68.0077, timezoneOffset: -4, ianaTimeZone: 'America/Caracas' },
  { name: 'Montevideo', country: 'Uruguay', lat: -34.9011, lng: -56.1645, timezoneOffset: -3, ianaTimeZone: 'America/Montevideo' },
  { name: 'Asunción', country: 'Paraguay', lat: -25.2637, lng: -57.5759, timezoneOffset: -4, ianaTimeZone: 'America/Asuncion' },
  { name: 'La Paz', country: 'Bolivia', lat: -16.4897, lng: -68.1193, timezoneOffset: -4, ianaTimeZone: 'America/La_Paz' },
  { name: 'Santa Cruz de la Sierra', country: 'Bolivia', lat: -17.8146, lng: -63.1561, timezoneOffset: -4, ianaTimeZone: 'America/La_Paz' },
  { name: 'Cochabamba', country: 'Bolivia', lat: -17.3895, lng: -66.1568, timezoneOffset: -4, ianaTimeZone: 'America/La_Paz' },
  { name: 'San José', country: 'Costa Rica', lat: 9.9281, lng: -84.0907, timezoneOffset: -6, ianaTimeZone: 'America/Costa_Rica' },
  { name: 'Ciudad de Panamá', country: 'Panamá', lat: 8.9824, lng: -79.5199, timezoneOffset: -5, ianaTimeZone: 'America/Panama' },
  { name: 'Santo Domingo', country: 'República Dominicana', lat: 18.4861, lng: -69.9312, timezoneOffset: -4, ianaTimeZone: 'America/Santo_Domingo' },
  { name: 'San Juan', country: 'Puerto Rico', lat: 18.4655, lng: -66.1057, timezoneOffset: -4, ianaTimeZone: 'America/Puerto_Rico' },
  { name: 'La Habana', country: 'Cuba', lat: 23.1136, lng: -82.3666, timezoneOffset: -5, ianaTimeZone: 'America/Havana' },
  { name: 'Guatemala', country: 'Guatemala', lat: 14.6349, lng: -90.5069, timezoneOffset: -6, ianaTimeZone: 'America/Guatemala' },
  { name: 'San Salvador', country: 'El Salvador', lat: 13.6929, lng: -89.2182, timezoneOffset: -6, ianaTimeZone: 'America/El_Salvador' },
  { name: 'Tegucigalpa', country: 'Honduras', lat: 14.0723, lng: -87.1921, timezoneOffset: -6, ianaTimeZone: 'America/Tegucigalpa' },
  { name: 'Managua', country: 'Nicaragua', lat: 12.115, lng: -86.2362, timezoneOffset: -6, ianaTimeZone: 'America/Managua' },

  // Estados Unidos y Europa
  { name: 'Miami', country: 'EE.UU.', lat: 25.7617, lng: -80.1918, timezoneOffset: -5, ianaTimeZone: 'America/New_York' },
  { name: 'New York', country: 'EE.UU.', lat: 40.7128, lng: -74.006, timezoneOffset: -5, ianaTimeZone: 'America/New_York' },
  { name: 'Los Angeles', country: 'EE.UU.', lat: 34.0522, lng: -118.2437, timezoneOffset: -8, ianaTimeZone: 'America/Los_Angeles' },
  { name: 'París', country: 'Francia', lat: 48.8566, lng: 2.3522, timezoneOffset: 1, ianaTimeZone: 'Europe/Paris' },
  { name: 'Londres', country: 'Reino Unido', lat: 51.5074, lng: -0.1278, timezoneOffset: 0, ianaTimeZone: 'Europe/London' },
  { name: 'Roma', country: 'Italia', lat: 41.9028, lng: 12.4964, timezoneOffset: 1, ianaTimeZone: 'Europe/Rome' },
  { name: 'Berlín', country: 'Alemania', lat: 52.52, lng: 13.405, timezoneOffset: 1, ianaTimeZone: 'Europe/Berlin' },
];

// Helper to normalize strings for comparison (remove accents)
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Find closest matching city by name or place query
export function findCityMatch(query: string): CityInfo | null {
  if (!query || query.trim().length < 2) return null;
  const qNorm = normalizeText(query);

  // 1. Exact match on city name or "City, Country"
  for (const city of POPULAR_CITIES) {
    const cName = normalizeText(city.name);
    const full = normalizeText(`${city.name}, ${city.country}`);
    if (cName === qNorm || full === qNorm) {
      return city;
    }
  }

  // 2. Query contains city name (e.g. "cuenca ecuador" contains "cuenca")
  for (const city of POPULAR_CITIES) {
    const cName = normalizeText(city.name);
    if (qNorm.includes(cName)) {
      return city;
    }
  }

  // 3. City name contains query
  for (const city of POPULAR_CITIES) {
    const cName = normalizeText(city.name);
    if (cName.includes(qNorm)) {
      return city;
    }
  }

  return null;
}

// Country-level fallback coordinates and standard timezones
const COUNTRY_FALLBACKS: { [country: string]: { lat: number; lng: number; timezoneOffset: number } } = {
  ecuador: { lat: -1.8312, lng: -78.1834, timezoneOffset: -5 },
  colombia: { lat: 4.5709, lng: -74.2973, timezoneOffset: -5 },
  peru: { lat: -9.1899, lng: -75.0152, timezoneOffset: -5 },
  mexico: { lat: 23.6345, lng: -102.5528, timezoneOffset: -6 },
  espana: { lat: 40.4637, lng: -3.7492, timezoneOffset: 1 },
  spain: { lat: 40.4637, lng: -3.7492, timezoneOffset: 1 },
  argentina: { lat: -38.4161, lng: -63.6167, timezoneOffset: -3 },
  chile: { lat: -35.6751, lng: -71.543, timezoneOffset: -3 },
  uruguay: { lat: -32.5228, lng: -55.7658, timezoneOffset: -3 },
  venezuela: { lat: 6.4238, lng: -66.5897, timezoneOffset: -4 },
  bolivia: { lat: -16.2902, lng: -63.5887, timezoneOffset: -4 },
  paraguay: { lat: -23.4425, lng: -58.4438, timezoneOffset: -4 },
  costa_rica: { lat: 9.7489, lng: -83.7534, timezoneOffset: -6 },
  panama: { lat: 8.5379, lng: -80.7821, timezoneOffset: -5 },
  guatemala: { lat: 15.7835, lng: -90.2308, timezoneOffset: -6 },
  cuba: { lat: 21.5218, lng: -77.7812, timezoneOffset: -5 },
  estados_unidos: { lat: 37.0902, lng: -95.7129, timezoneOffset: -5 },
  usa: { lat: 37.0902, lng: -95.7129, timezoneOffset: -5 },
};

export function inferLocationFromQuery(query: string): { lat: number; lng: number; timezoneOffset: number; matchedName?: string } | null {
  const cityMatch = findCityMatch(query);
  if (cityMatch) {
    return {
      lat: cityMatch.lat,
      lng: cityMatch.lng,
      timezoneOffset: cityMatch.timezoneOffset,
      matchedName: `${cityMatch.name}, ${cityMatch.country}`,
    };
  }

  const norm = normalizeText(query).replace(/\s+/g, '_');
  for (const [countryKey, coords] of Object.entries(COUNTRY_FALLBACKS)) {
    if (norm.includes(countryKey)) {
      return { ...coords };
    }
  }

  return null;
}
