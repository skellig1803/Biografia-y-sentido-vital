import { computeSwissEphemerisChart } from '../swissEphemeris.js';
import type { BirthData, PlanetPosition } from '../../src/types';

// ---------------------------------------------------------------------------
// Interfaces públicas
// ---------------------------------------------------------------------------

/** Datos mínimos del usuario requeridos por el planificador de tránsitos. */
export interface UserForScheduler {
  id: string;
  nombre: string;
  /** Fecha de nacimiento en formato 'YYYY-MM-DD'. */
  fecha_nacimiento: string;
  /** Hora de nacimiento en formato 'HH:MM' (opcional). */
  hora_nacimiento?: string;
  /** Ciudad o lugar de nacimiento (opcional). */
  lugar_nacimiento?: string;
  /** Latitud natal en grados decimales */
  latitude?: number;
  /** Longitud natal en grados decimales */
  longitude?: number;
  /** Teléfono de WhatsApp (con código de país) */
  whatsapp?: string;
  /** IANA timezone string, e.g. 'America/Mexico_City'. */
  timezone: string;
}

/** Posición de un planeta en tránsito para el día calculado. */
export interface TransitoActivo {
  planeta: string;
  signo: string;
  casa: number;
  grado: number;
  esRetrogrado: boolean;
}

/** Aspecto entre un planeta en tránsito y un planeta natal. */
export interface Aspecto {
  planetaTransitante: string;
  planetaNatal: string;
  tipo: string;
  orbe: number;
  esBenefic: boolean;
}

/** Resultado completo del cálculo de tránsitos diarios con IA. */
export interface DailyTransitsResult {
  /** Fecha del cálculo en formato 'YYYY-MM-DD'. */
  fecha: string;
  transitosActivos: TransitoActivo[];
  aspectosBeneficos: Aspecto[];
  aspectosConflictivos: Aspecto[];
  /** Texto narrativo detallado en español para el reporte escrito. */
  textoPunto4: string;
  /** Síntesis hablada optimizada para audio de 45 a 60 segundos (máximo 85-95 palabras). */
  sintesisAudioMatutino: string;
}

// ---------------------------------------------------------------------------
// Constantes internas
// ---------------------------------------------------------------------------

/** IDs de planetas principales que se toman en cuenta para tránsitos. */
const TRANSIT_PLANET_IDS = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
] as const;

/** Traducción de PlanetId al nombre español utilizado en la narrativa. */
const PLANET_NAME_ES: Record<string, string> = {
  sun: 'Sol',
  moon: 'Luna',
  mercury: 'Mercurio',
  venus: 'Venus',
  mars: 'Marte',
  jupiter: 'Júpiter',
  saturn: 'Saturno',
  uranus: 'Urano',
  neptune: 'Neptuno',
  pluto: 'Plutón',
  northNode: 'Nodo Norte',
  southNode: 'Nodo Sur',
  chiron: 'Quirón',
  lilith: 'Lilith',
  ascendant: 'Ascendente',
  midheaven: 'Medio Cielo',
};

/** Traducción de ZodiacSign al nombre español. */
const SIGN_NAME_ES: Record<string, string> = {
  Aries: 'Aries',
  Taurus: 'Tauro',
  Gemini: 'Géminis',
  Cancer: 'Cáncer',
  Leo: 'Leo',
  Virgo: 'Virgo',
  Libra: 'Libra',
  Scorpio: 'Escorpio',
  Sagittarius: 'Sagitario',
  Capricorn: 'Capricornio',
  Aquarius: 'Acuario',
  Pisces: 'Piscis',
};

interface AspectDefinition {
  angle: number;
  nombre: string;
  orbe: number;
}

/** Definiciones de aspectos con sus orbes propios para tránsitos. */
const ASPECT_DEFS: AspectDefinition[] = [
  { angle: 0,   nombre: 'conjunción', orbe: 3 },
  { angle: 60,  nombre: 'sextil',     orbe: 4 },
  { angle: 90,  nombre: 'cuadratura', orbe: 4 },
  { angle: 120, nombre: 'trígono',    orbe: 4 },
  { angle: 180, nombre: 'oposición',  orbe: 3 },
];

/**
 * Planetas que hacen a una conjunción un aspecto benéfico.
 * Júpiter y Venus aportan expansión y armonía.
 */
const BENEF_CONJUNCTION_PLANETS = new Set(['jupiter', 'venus']);

/**
 * Planetas que hacen a una conjunción un aspecto conflictivo.
 * Saturno, Marte y Plutón generan tensión o restricción.
 */
const CONFLICT_CONJUNCTION_PLANETS = new Set(['saturn', 'mars', 'pluto']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Traduce un signo zodiacal del inglés/clave interna al español. */
function toSignEs(sign: string): string {
  return SIGN_NAME_ES[sign] ?? sign;
}

/** Traduce un id de planeta al nombre español. */
function toPlanetEs(id: string): string {
  return PLANET_NAME_ES[id] ?? id;
}

/**
 * Construye un objeto BirthData compatible con computeSwissEphemerisChart
 * usando la fecha proporcionada como "nacimiento" (truco para obtener
 * posiciones planetarias en esa fecha).
 */
function buildBirthData(
  name: string,
  fecha: string,
  hora: string,
  timezone: string,
  timezoneOffset: number,
  lat: number,
  lon: number,
): BirthData {
  return {
    name,
    birthDate: fecha,
    birthTime: hora,
    placeName: 'Natal',
    timezoneOffset: Number(timezoneOffset) || 0,
    ianaTimeZone: timezone,
    latitude: Number(lat) || 0,
    longitude: Number(lon) || 0,
    nodeType: 'mean',
  };
}

/**
 * Estima el offset UTC a partir del timezone IANA usando la fecha indicada.
 * Devuelve el offset en horas (puede ser negativo para el oeste).
 */
function estimateTimezoneOffset(timezone: string, fecha: Date): number {
  try {
    // Obtenemos la diferencia entre la hora UTC y la local del timezone
    const utcStr = fecha.toLocaleString('en-US', { timeZone: 'UTC' });
    const localStr = fecha.toLocaleString('en-US', { timeZone: timezone });
    const utcDate = new Date(utcStr);
    const localDate = new Date(localStr);
    return (localDate.getTime() - utcDate.getTime()) / 3600000;
  } catch {
    return 0;
  }
}

/**
 * Devuelve la pista situacional práctica para el día a día de un aspecto benéfico.
 */
function getPistaPracticaBenefica(a: Aspecto): string {
  const t = a.planetaTransitante.toLowerCase();
  const n = a.planetaNatal.toLowerCase();

  if (t === 'mercurio' && n === 'mercurio') {
    return 'abres una valiosa ventana para los negocios, la comunicación y los procesos de pensamiento lógico y acuerdos';
  }
  if (t === 'mercurio' && (n === 'sol' || n === 'júpiter' || n === 'nodo norte' || n === 'lilith')) {
    return 'se potencia tu agilidad mental para negociar, firmar acuerdos comerciales y estructurar ideas con lucidez';
  }
  if (t === 'mercurio') {
    return 'cuentas con gran claridad para el diálogo, resolver trámites pendientes y coordinar decisiones con precisión';
  }
  if (t === 'venus' && (n === 'sol' || n === 'luna' || n === 'júpiter')) {
    return 'se favorecen las relaciones personales, las ventas, los acuerdos cordiales y las alianzas de mutuo beneficio';
  }
  if (t === 'venus') {
    return 'es un momento propicio para cultivar armonía en tu entorno, negociar con suavidad y cuidar tu bienestar';
  }
  if (t === 'marte' && (n === 'sol' || n === 'mercurio' || n === 'júpiter')) {
    return 'cuentas con empuje resolutivo para tomar decisiones firmes, liderar proyectos y actuar con determinación';
  }
  if (t === 'marte') {
    return 'tienes vitalidad y coraje para destrabar gestiones complejas sin postergaciones';
  }
  if (t === 'júpiter' && n === 'júpiter') {
    return 'se amplifica tu visión estratégica, confianza y optimismo bien fundamentado para abrir nuevas puertas';
  }
  if (t === 'júpiter') {
    return 'se presentan oportunidades de expansión en proyectos clave gracias a contactos de valor';
  }
  if (t === 'sol') {
    return 'se ilumina tu centro consciente, aportando vitalidad, seguridad en tus criterios y reconocimiento';
  }
  if (t === 'luna') {
    return 'cuentas con intuición afinada y empatía para percibir el momento oportuno en tus actividades';
  }
  return `activa facilidades concretas en ${a.planetaNatal.toLowerCase()} para avanzar en tus prioridades con serenidad`;
}

/**
 * Devuelve la pista de advertencia situacional para modular un aspecto de tensión en la jornada.
 */
function getPistaPracticaTension(a: Aspecto): string {
  const t = a.planetaTransitante.toLowerCase();
  const n = a.planetaNatal.toLowerCase();

  if ((t === 'sol' && n === 'júpiter') || (t === 'júpiter' && n === 'sol')) {
    return 'advierte la probabilidad a exagerar o sobreestimar fuerzas; mantén la calma, aterriza expectativas y evita reacciones con prisa';
  }
  if ((t === 'marte' && n === 'júpiter') || (t === 'júpiter' && n === 'marte')) {
    return 'previene contra la impaciencia y los riesgos apresurados: modula el entusiasmo y no actúes por mero impulso';
  }
  if (t === 'marte') {
    return 'puede generar roces de temperamento o frustración ante imprevistos; canaliza la energía en trabajo enfocado sin discutir';
  }
  if (t === 'urano' && (n === 'luna' || n === 'mercurio' || n === 'lilith')) {
    return 'pueden presentarse imprevistos de agenda o giros repentinos; mantén la flexibilidad mental sin frustrarte';
  }
  if (t === 'urano') {
    return 'invita a la adaptabilidad frente a cambios súbitos en tus labores cotidianas';
  }
  if (t === 'saturno') {
    return 'podrías sentir lentitud o exigencias burocráticas; responde con rigor y método sin perder la paciencia';
  }
  if (t === 'mercurio') {
    return 'cuidado con despistes, malentendidos o dispersión; verifica los detalles antes de firmar o enviar';
  }
  if (t === 'luna') {
    return 'la susceptibilidad emocional puede nublar la perspectiva; respira antes de responder a situaciones sensibles';
  }
  if (t === 'neptuno') {
    return 'evita confusiones o expectativas poco realistas; exige datos verificables antes de tomar decisiones';
  }
  if (t === 'plutón') {
    return 'invita a soltar luchas de poder o control; transforma la fricción en maestría personal';
  }
  return `demanda moderación y discernimiento: observa antes de reaccionar y mantén tu centro`;
}

/**
 * Devuelve el significado breve de un aspecto benéfico para la narrativa.
 */
function significadoBenef(tipo: string, transitante: string, natal: string): string {
  const pista = getPistaPracticaBenefica({ planetaTransitante: transitante, planetaNatal: natal, tipo, orbe: 0, esBenefic: true });
  return `oportunidad favorable: ${pista}`;
}

/**
 * Devuelve el significado breve de un aspecto conflictivo para la narrativa.
 */
function significadoConflict(tipo: string, transitante: string, natal: string): string {
  const pista = getPistaPracticaTension({ planetaTransitante: transitante, planetaNatal: natal, tipo, orbe: 0, esBenefic: false });
  return `punto de atención: ${pista}`;
}

// ---------------------------------------------------------------------------
// Función principal exportada
// ---------------------------------------------------------------------------

/**
 * Calcula los tránsitos diarios con IA del Faro Biográfico para un
 * usuario dado y una fecha específica.
 *
 * @param user  - Datos del usuario (nacimiento, timezone, etc.)
 * @param fecha - Fecha para la que se calculan los tránsitos (al mediodía)
 * @returns     Objeto DailyTransitsResult con tránsitos, aspectos y texto narrativo
 */
export async function computeDailyTransitsPoint4(
  user: UserForScheduler,
  fecha: Date,
): Promise<DailyTransitsResult> {
  // ── 1. Preparar parámetros comunes ────────────────────────────────────────
  const tzOffset = estimateTimezoneOffset(user.timezone, fecha);

  // Coordenadas geográficas natales del usuario (con fallback si no se especificaron)
  const userLat = typeof user.latitude === 'number' && !isNaN(user.latitude) ? user.latitude : 0;
  const userLon = typeof user.longitude === 'number' && !isNaN(user.longitude) ? user.longitude : 0;

  // ── 2. Carta natal del usuario ────────────────────────────────────────────
  const natalHora = user.hora_nacimiento ?? '12:00';
  const natalBirthData = buildBirthData(
    user.nombre,
    user.fecha_nacimiento,
    natalHora,
    user.timezone,
    tzOffset,
    userLat,
    userLon,
  );
  const natalChart = computeSwissEphemerisChart(natalBirthData);
  const natalPlanets: PlanetPosition[] = natalChart.planets;

  // ── 3. Carta de tránsito (posiciones del día a las 12:00) ─────────────────
  const fechaStr = fecha.toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const transitBirthData = buildBirthData(
    'Transits',
    fechaStr,
    '12:00',
    user.timezone,
    tzOffset,
    userLat,
    userLon,
  );
  const transitChart = computeSwissEphemerisChart(transitBirthData);

  // Los tránsitos están disponibles en currentTransits.transitPlanets
  const transitPlanetsRaw: PlanetPosition[] =
    transitChart.currentTransits?.transitPlanets ?? transitChart.planets;

  // ── 4. Filtrar planetas de tránsito relevantes ────────────────────────────
  const transitPlanetMap = new Map<string, PlanetPosition>();
  for (const p of transitPlanetsRaw) {
    if ((TRANSIT_PLANET_IDS as readonly string[]).includes(p.id)) {
      transitPlanetMap.set(p.id, p);
    }
  }

  // ── 5. Construir lista de tránsitos activos ───────────────────────────────
  const transitosActivos: TransitoActivo[] = [];
  for (const id of TRANSIT_PLANET_IDS) {
    const planet = transitPlanetMap.get(id);
    if (!planet) continue;
    transitosActivos.push({
      planeta: toPlanetEs(id),
      signo: toSignEs(planet.sign),
      casa: planet.house,
      grado: planet.degreeInSign,
      esRetrogrado: planet.isRetrograde ?? false,
    });
  }

  // ── 6. Calcular aspectos tránsito → natal ─────────────────────────────────
  const aspectosBeneficos: Aspecto[] = [];
  const aspectosConflictivos: Aspecto[] = [];

  for (const id of TRANSIT_PLANET_IDS) {
    const tPlanet = transitPlanetMap.get(id);
    if (!tPlanet) continue;

    for (const nPlanet of natalPlanets) {
      // Excluir puntos virtuales sin cuerpo celeste real
      if (nPlanet.id === 'ascendant' || nPlanet.id === 'midheaven') continue;

      const diff = Math.abs(tPlanet.longitude - nPlanet.longitude);
      const angle = diff > 180 ? 360 - diff : diff;

      for (const aspDef of ASPECT_DEFS) {
        const orbe = Math.abs(angle - aspDef.angle);
        if (orbe <= aspDef.orbe) {
          const aspecto: Aspecto = {
            planetaTransitante: toPlanetEs(id),
            planetaNatal: toPlanetEs(nPlanet.id),
            tipo: aspDef.nombre,
            orbe: Number(orbe.toFixed(2)),
            esBenefic: false,
          };

          // Clasificación
          const isTrine   = aspDef.nombre === 'trígono';
          const isSextile = aspDef.nombre === 'sextil';
          const isConj    = aspDef.nombre === 'conjunción';
          const isSquare  = aspDef.nombre === 'cuadratura';
          const isOpp     = aspDef.nombre === 'oposición';

          if (isTrine || isSextile || (isConj && BENEF_CONJUNCTION_PLANETS.has(id))) {
            aspecto.esBenefic = true;
            aspectosBeneficos.push(aspecto);
          } else if (isSquare || isOpp || (isConj && CONFLICT_CONJUNCTION_PLANETS.has(id))) {
            aspecto.esBenefic = false;
            aspectosConflictivos.push(aspecto);
          }
          // Conjunción neutra (ni benéfica ni conflictiva) se omite
          break;
        }
      }
    }
  }

  // ── 7. Construir texto narrativo de Tránsitos Diarios ──────────────────────────
  const fechaFormateada = fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Sección: tránsitos activos
  const lineasTransitos = transitosActivos
    .map((t) => {
      const retro = t.esRetrogrado ? ' ℞' : '';
      return `  • ${t.planeta}${retro} en ${t.signo} ${t.grado}° (Casa ${t.casa})`;
    })
    .join('\n');

  // Sección: aspectos favorables
  const lineasBenef = aspectosBeneficos.length
    ? aspectosBeneficos
        .map((a) => {
          const sig = significadoBenef(a.tipo, a.planetaTransitante, a.planetaNatal);
          return `  • ${a.planetaTransitante} en ${a.tipo} con ${a.planetaNatal} natal (orbe ${a.orbe}°): ${sig}.`;
        })
        .join('\n')
    : '  • Sin aspectos favorables destacados hoy.';

  // Sección: aspectos de tensión
  const lineasConflict = aspectosConflictivos.length
    ? aspectosConflictivos
        .map((a) => {
          const sig = significadoConflict(a.tipo, a.planetaTransitante, a.planetaNatal);
          return `  • ${a.planetaTransitante} en ${a.tipo} con ${a.planetaNatal} natal (orbe ${a.orbe}°): ${sig}.`;
        })
        .join('\n')
    : '  • Sin aspectos de tensión destacados hoy.';

  // Síntesis orientadora del día
  const hayBenef   = aspectosBeneficos.length > 0;
  const hayConflict = aspectosConflictivos.length > 0;
  let orientacion: string;

  if (hayBenef && hayConflict) {
    const primerBenef    = aspectosBeneficos[0];
    const primerConflict = aspectosConflictivos[0];
    orientacion =
      `Hoy el cielo te ofrece tanto oportunidades como desafíos. Aprovecha la fluidez de ` +
      `${primerBenef.planetaTransitante} en ${primerBenef.tipo} para avanzar en lo que más te importa, ` +
      `mientras integras con consciencia la tensión de ${primerConflict.planetaTransitante} en ` +
      `${primerConflict.tipo}. La clave es actuar desde la serenidad y no desde la reacción. ` +
      `Habita el presente con ligereza y claridad: los tránsitos son ventanas de posibilidad, no dictados del destino; suelta las cargas de ayer y fluye con presencia serena.`;
  } else if (hayBenef) {
    const primerBenef = aspectosBeneficos[0];
    orientacion =
      `El día se presenta con vientos favorables: ${primerBenef.planetaTransitante} en ${primerBenef.tipo} ` +
      `activa recursos internos y externos que facilitan tus metas. Es un momento propicio para iniciar, ` +
      `conectar y crear. Con frescura y presencia viva, confía en tu impulso y actúa con intención clara.`;
  } else if (hayConflict) {
    const primerConflict = aspectosConflictivos[0];
    orientacion =
      `Hoy los tránsitos invitan a la paciencia y la reflexión. ${primerConflict.planetaTransitante} en ` +
      `${primerConflict.tipo} puede generar fricción o resistencia; úsala como combustible para crecer. ` +
      `No te aferres a la incomodidad pasajera del día: el malestar de hoy puede ser la sabiduría de mañana.`;
  } else {
    orientacion =
      `El cielo de hoy presenta una calma relativa en los tránsitos. Es un día favorable para el ` +
      `trabajo constante, la rutina creativa y la atención a los detalles cotidianos. Mantén tu centro ` +
      `con presencia serena y confía en el proceso, pues los grandes cambios a menudo germinan en la quietud.`;
  }

  const textoPunto4 = [
    `🌟 TRÁNSITOS DEL DÍA — ${fechaFormateada.toUpperCase()}`,
    lineasTransitos,
    '',
    '✨ ASPECTOS FAVORABLES',
    lineasBenef,
    '',
    '⚡ ASPECTOS DE TENSIÓN',
    lineasConflict,
    '',
    '🧭 ORIENTACIÓN DEL DÍA',
    `  ${orientacion}`,
  ].join('\n');

  // ── 8. Construir síntesis hablada para nota de voz (máx. 85-95 palabras, < 1 minuto) ──
  const lunaTransito = transitosActivos.find((t) => t.planeta === 'Luna');
  const lunaDesc = lunaTransito
    ? `la Luna transita por ${lunaTransito.signo} en tu casa ${lunaTransito.casa}`
    : 'el firmamento te acompaña con serenidad';

  let mensajeFocal: string;
  if (hayBenef && hayConflict) {
    const b = aspectosBeneficos[0];
    const c = aspectosConflictivos[0];
    const pistaBenef = getPistaPracticaBenefica(b);
    const pistaConflict = getPistaPracticaTension(c);
    mensajeFocal = `Hoy, con ${b.planetaTransitante} en ${b.tipo} con tu ${b.planetaNatal} natal, ${pistaBenef}. Al mismo tiempo, la tensión de ${c.planetaTransitante} con ${c.planetaNatal} ${pistaConflict}.`;
  } else if (hayBenef) {
    const b = aspectosBeneficos[0];
    const pistaBenef = getPistaPracticaBenefica(b);
    mensajeFocal = `Hoy cuentas con un viento astral favorable: con ${b.planetaTransitante} en ${b.tipo} con tu ${b.planetaNatal} natal, ${pistaBenef}. Aprovecha este impulso con intención clara.`;
  } else if (hayConflict) {
    const c = aspectosConflictivos[0];
    const pistaConflict = getPistaPracticaTension(c);
    mensajeFocal = `El cielo de hoy te invita al discernimiento: la tensión de ${c.planetaTransitante} con tu ${c.planetaNatal} natal ${pistaConflict}. Usa el reto como palanca de madurez.`;
  } else {
    mensajeFocal = `Hoy predomina una calma fértil en tus tránsitos. Con ${lunaDesc}, es un día propicio para avanzar con método en tus labores cotidianas y cuidar tu bienestar.`;
  }

  const sintesisAudioMatutino =
    `Buenos días, ${user.nombre}. Tu faro para hoy, ${fechaFormateada}: ` +
    `${mensajeFocal} ` +
    `Recuerda que los astros iluminan el sendero, pero tú diriges tus pasos. Que tengas un día luminoso y consciente.`;

  return {
    fecha: fechaStr,
    transitosActivos,
    aspectosBeneficos,
    aspectosConflictivos,
    textoPunto4,
    sintesisAudioMatutino,
  };
}
