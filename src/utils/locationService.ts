import { POPULAR_CITIES, CityInfo, findCityMatch } from '../data/cities';

export interface LocationResolutionResult {
  found: boolean;
  source: 'local' | 'internet' | 'manual' | null;
  placeName: string;
  resolvedName: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  timezoneName?: string;
  ianaTimeZone?: string;
  localNotFound?: boolean;
  message?: string;
  error?: string;
}

/**
 * Searches the local city database.
 */
export function searchLocalDatabase(query: string): CityInfo | null {
  return findCityMatch(query);
}

/**
 * Searches the location on the Internet using /api/geocode (with client fallback to Nominatim).
 */
export async function searchInternetLocation(query: string): Promise<{
  success: boolean;
  name: string;
  lat: number;
  lng: number;
  timezoneOffset: number;
  timezoneName?: string;
  ianaTimeZone?: string;
  error?: string;
}> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return {
      success: false,
      name: '',
      lat: 0,
      lng: 0,
      timezoneOffset: 0,
      error: 'Ingresa un nombre de ciudad más específico.',
    };
  }

  // 1. Try internal backend API endpoint
  try {
    const origin = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
    const res = await fetch(`${origin}/api/geocode?q=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.found) {
        return {
          success: true,
          name: data.name,
          lat: data.lat,
          lng: data.lng,
          timezoneOffset: data.timezoneOffset,
          timezoneName: data.timezoneName,
        };
      } else if (data.found === false) {
        return {
          success: false,
          name: '',
          lat: 0,
          lng: 0,
          timezoneOffset: 0,
          error: data.error || `No se encontraron resultados en Internet para "${trimmed}".`,
        };
      }
    }
  } catch (backendErr) {
    console.warn('Backend geocoding request failed, trying client fallback:', backendErr);
  }

  // 2. Client fallback direct to OpenStreetMap Nominatim
  try {
    const clientUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      trimmed
    )}&format=json&addressdetails=1&limit=1`;
    const clientRes = await fetch(clientUrl, {
      headers: {
        'User-Agent': 'CartaNatalAntroposofica/1.0 (https://ai.studio)',
        'Accept-Language': 'es,en',
      },
    });

    if (clientRes.ok) {
      const data = await clientRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        let timezoneOffset = Math.round(lng / 15);
        let timezoneName = 'Aproximado';

        // Try Open-Meteo for exact timezone
        try {
          const tzRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&timezone=auto`
          );
          if (tzRes.ok) {
            const tzData = await tzRes.json();
            if (typeof tzData.utc_offset_seconds === 'number') {
              timezoneOffset = tzData.utc_offset_seconds / 3600;
              timezoneName = tzData.timezone || timezoneName;
            }
          }
        } catch {
          // ignore tz fallback
        }

        return {
          success: true,
          name: item.display_name,
          lat,
          lng,
          timezoneOffset,
          timezoneName,
        };
      }
    }

    return {
      success: false,
      name: '',
      lat: 0,
      lng: 0,
      timezoneOffset: 0,
      error: `No se encontró la ubicación "${trimmed}" en Internet.`,
    };
  } catch (err: any) {
    return {
      success: false,
      name: '',
      lat: 0,
      lng: 0,
      timezoneOffset: 0,
      error: `Error de conexión al buscar en Internet: ${err?.message || 'Fallo de red'}`,
    };
  }
}

/**
 * Resolves location following user mandate:
 * 1. Checks local database.
 * 2. If not found locally, reports local failure and queries the Internet.
 * 3. Communicates whether it was found in local database or on the Internet.
 * 4. Flags error if not found anywhere to prevent calculating with erroneous coordinates.
 */
export async function resolveLocationWithFallback(
  query: string
): Promise<LocationResolutionResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return {
      found: false,
      source: null,
      placeName: trimmed,
      resolvedName: '',
      latitude: 0,
      longitude: 0,
      timezoneOffset: 0,
      error: 'Por favor, ingresa un lugar de nacimiento válido.',
    };
  }

  // 1. Search local database
  const localMatch = searchLocalDatabase(trimmed);
  if (localMatch) {
    return {
      found: true,
      source: 'local',
      placeName: trimmed,
      resolvedName: `${localMatch.name}, ${localMatch.country}`,
      latitude: localMatch.lat,
      longitude: localMatch.lng,
      timezoneOffset: localMatch.timezoneOffset,
      ianaTimeZone: localMatch.ianaTimeZone,
      localNotFound: false,
      message: `Ubicación confirmada en la base de datos local (${localMatch.name}, ${localMatch.country}).`,
    };
  }

  // 2. Not found in local database -> Search on the Internet
  const internetResult = await searchInternetLocation(trimmed);
  if (internetResult.success) {
    const resolvedIana = internetResult.ianaTimeZone || internetResult.timezoneName;
    return {
      found: true,
      source: 'internet',
      placeName: trimmed,
      resolvedName: internetResult.name,
      latitude: internetResult.lat,
      longitude: internetResult.lng,
      timezoneOffset: internetResult.timezoneOffset,
      timezoneName: internetResult.timezoneName,
      ianaTimeZone: resolvedIana,
      localNotFound: true,
      message: `La ubicación no se encontró en la base de datos local. Se encontró en Internet: "${internetResult.name}". Coordenadas y huso horario sincronizados.`,
    };
  }

  // 3. Not found anywhere
  return {
    found: false,
    source: null,
    placeName: trimmed,
    resolvedName: '',
    latitude: 0,
    longitude: 0,
    timezoneOffset: 0,
    localNotFound: true,
    error: `La ubicación "${trimmed}" no se encontró en la base de datos local ni en Internet. Para evitar cálculos erróneos, por favor verifica el nombre o ingresa las coordenadas manualmente.`,
  };
}
