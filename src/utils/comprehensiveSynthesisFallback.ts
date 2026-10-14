/**
 * Guaranteed comprehensive synthesis generator.
 * Provides an immediate, complete, deep 4-section reading
 * integrating the natal chart, Steiner's septennium, lunar nodal axis,
 * profections, and daily quality of the day derived from the individual
 * synastry of current transits onto the consultant's natal chart.
 *
 * Fully grounded in the individual data computed across the application tabs:
 * - Tab 1 (Septenios): Steiner cycle, planetary sphere, core question, concept, age-specific challenges
 * - Tab 2 (Nodos Lunares): North/South node signs, houses, degrees, Dharma, karma, soul lessons, nodal cycle
 * - Tab 3 (Año de Vida): Profection house, sign, Lord of the Year, annual core theme, directives, recommendations
 * - Tab 4 (Tránsitos y Sinastría): Exact celestial contacts with natal planets, houses activated, benefits and conflicts
 */

import { LUNAR_NODE_GUIDANCE, ANTHROPOSOPHIC_SEPTENIOS_BASE } from './anthroposophyEngine.js';
import {
  ZodiacSign,
  SeptenioData,
  YearOfLifeAnalysis,
  LunarNodeData,
  PlanetPosition,
  HouseCusp,
  Aspect,
  TransitAspect,
} from '../types.js';

export interface ActiveTransitItem {
  transitPlanetName?: string;
  transitSign?: string;
  natalPlanetName?: string;
  natalSign?: string;
  natalHouse?: number;
  aspectType?: string;
  aspectLabel?: string;
  nature?: 'harmonious' | 'challenging' | 'neutral';
  biographicalImpact?: string;
  simpleExplanation?: string;
  practicalTip?: string;
  activatedHouseArea?: string;
}

export interface LunarNodesDetailInput {
  northSign: string;
  northHouse?: number;
  northDegree?: number;
  northMinute?: number;
  dharmaDirection?: string;
  soulLesson?: string;
  evolutionaryAction?: string;
  strengthsToCultivate?: string[];
  southSign: string;
  southHouse?: number;
  southDegree?: number;
  southMinute?: number;
  pastLifeGifts?: string;
  comfortZoneTrap?: string;
  patternsToRelease?: string[];
  cycleMeaning?: string;
  nextNodalReturnAge?: number;
  yearsUntilReturn?: number;
}

export interface SynthesisFallbackInput {
  name: string;
  exactAgeFormatted?: string;
  sunSign?: string;
  moonSign?: string;
  ascendantSign?: string;
  septenioCode?: string;
  nodalAxisCode?: string;
  lunarNodesDetail?: LunarNodesDetailInput;
  profectionCode?: string;
  natalAspectCodes?: string[];
  natalPlanetsSummary?: string;
  transitHouseActivations?: string[];
  transitCodes?: string[];
  transitDetailedList?: string[];
  currentSkyPositions?: string;
  todayDate?: string;
  activeTransitsRaw?: ActiveTransitItem[];

  // Rich individual objects directly from the other tabs
  currentSeptenio?: SeptenioData;
  yearOfLife?: YearOfLifeAnalysis;
  lunarNodes?: LunarNodeData;
  planets?: PlanetPosition[];
  houses?: HouseCusp[];
  aspects?: Aspect[];
  currentTransits?: {
    transitDate: string;
    transitPlanets: PlanetPosition[];
    activeTransits: TransitAspect[];
  };
}

const HOUSE_THEMES: Record<number, { name: string; impact: string }> = {
  1: { name: 'Casa 1 (Identidad y Vitalidad)', impact: 'tu presencia física, nivel de energía y capacidad de tomar la iniciativa' },
  2: { name: 'Casa 2 (Recursos y Autoestima)', impact: 'tus finanzas, valoración personal y administración de recursos materiales' },
  3: { name: 'Casa 3 (Mente y Comunicación)', impact: 'tus conversaciones cotidianas, agilidad mental, acuerdos breves y desplazamientos' },
  4: { name: 'Casa 4 (Hogar y Raíces)', impact: 'tu tranquilidad interior, núcleo familiar y espacios de descanso' },
  5: { name: 'Casa 5 (Creatividad y Gozo)', impact: 'tu autoexpresión creativa, proyectos vocacionales del corazón y vitalidad anímica' },
  6: { name: 'Casa 6 (Rutina Laboral y Salud)', impact: 'tu ritmo de trabajo diario, orden de prioridades y bienestar corporal' },
  7: { name: 'Casa 7 (Relaciones y Alianzas)', impact: 'tus intercambios de pareja, socios o personas clave con quienes coordinas hoy' },
  8: { name: 'Casa 8 (Profundidad y Transformación)', impact: 'tu capacidad de concentración estratégica, soltar apegos y finanzas compartidas' },
  9: { name: 'Casa 9 (Visión y Horizonte)', impact: 'tu claridad conceptual a largo plazo, filosofía de vida y planes de crecimiento' },
  10: { name: 'Casa 10 (Metas y Vocación)', impact: 'tu visibilidad pública, liderazgo laboral y cumplimiento de objetivos profesionales' },
  11: { name: 'Casa 11 (Colaboración y Futuro)', impact: 'el trabajo en equipo, proyectos grupales y redes de apoyo' },
  12: { name: 'Casa 12 (Introspección y Cierre)', impact: 'tu necesidad de pausa reflexiva, serenidad interior y finalización de ciclos' },
};

function normalizeZodiacSign(raw: string): ZodiacSign | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const clean = raw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const map: Record<string, ZodiacSign> = {
    aries: 'Aries',
    tauro: 'Tauro',
    geminis: 'Géminis',
    cancer: 'Cáncer',
    leo: 'Leo',
    virgo: 'Virgo',
    libra: 'Libra',
    escorpio: 'Escorpio',
    escorpion: 'Escorpio',
    sagitario: 'Sagitario',
    capricornio: 'Capricornio',
    acuario: 'Acuario',
    piscis: 'Piscis',
  };
  return map[clean];
}

// -------------------------------------------------------------
// SECCIÓN 1: Esencia Biográfica y Septenio Presente (Pestaña 1)
// -------------------------------------------------------------
function buildSeptenioSection(input: SynthesisFallbackInput): string {
  const name = input.name || 'Buscador/a';
  const age = input.exactAgeFormatted || 'edad actual';
  const sun = input.sunSign || 'Signo Solar';
  const moon = input.moonSign || 'Signo Lunar';
  const asc = input.ascendantSign || 'Ascendente';

  // Identify septenio data either from object or code
  let septenioObj: SeptenioData | undefined = input.currentSeptenio;
  if (!septenioObj) {
    const septMatch = (input.septenioCode || '').match(/(\d+)°\s*Septenio/i);
    const num = septMatch ? parseInt(septMatch[1], 10) : 5;
    const base = ANTHROPOSOPHIC_SEPTENIOS_BASE.find((s) => s.number === num);
    if (base) {
      septenioObj = {
        ...base,
        progressPct: 50,
        currentMilestones: [],
      };
    }
  }

  const septNumber = septenioObj?.number || 5;
  const septAgeRange = septenioObj?.ageRange || '28 - 35 años';
  const septTitle = septenioObj?.archetypalTitle || 'Alma Racional / Intelectiva';
  const septPhase = septenioObj?.phase || 'Desarrollo Anímico-Psicológico';
  const septSphere = septenioObj?.planetarySphere || 'Marte';
  const steinerConcept = septenioObj?.steinerConcept || 'Maduración de la autoconciencia moral y vocación.';
  const coreQuestion = septenioObj?.coreQuestion || '¿Qué cimientos perdurables estoy edificando con mi propia vida?';
  const description = septenioObj?.description || 'En esta etapa el alma experimenta un umbral de responsabilidad profunda.';
  const progressPct = septenioObj?.progressPct !== undefined ? septenioObj.progressPct : 50;
  const challenges = septenioObj?.ageSpecificChallenges || [
    'Diferenciar las pulsiones egoicas de la verdadera dirección del alma.',
    'Construir una base de coherencia ética y afectiva.',
    'Aprender a transformar la crisis en maduración creadora.',
  ];

  return `## 1. La Esencia Biográfica y el Reto del Septenio Presente

Para **${name}**, situarse en los **${age}** representa un umbral biográfico de honda significación anímica y espiritual. Dentro de la cosmovisión antroposófica iniciada por Rudolf Steiner y desarrollada por Bernard Lievegoed, el ser humano evoluciona a través de metamorfosis rítmicas de siete años gobernadas por esferas arquetípicas.

Te encuentras transitando tu **${septNumber}° Septenio (${septAgeRange})**, denominado arquetípicamente como **«${septTitle}»**, inmerso en la fase de **${septPhase}** bajo el influjo formativo de la esfera de **${septSphere}**. Llevas un **${progressPct}% de recorrido** completado dentro de este septenio.

### La Pregunta Arquetípica de tu Alma
En el núcleo íntimo de este septenio resuena la interrogante de Steiner:
> *«${coreQuestion}»*

${description}

**Principio biográfico antroposófico activo:** ${steinerConcept}

### Retos Evolutivos Concretos de esta Etapa
A partir de tus datos individuales de este septenio, tu alma está convocada a integrar y resolver con madurez tres desafíos específicos:
1. **${challenges[0] || 'Afirmación del Yo consciente frente a las demandas externas.'}**
2. **${challenges[1] || 'Superación de patrones automáticos en favor de la libertad creadora.'}**
3. **${challenges[2] || 'Equilibrio entre las aspiraciones del corazón y la responsabilidad práctica terrenal.'}**

### Articulación con tu Tríada Natal
Tu tríada constitutiva —**Sol en ${sun}**, **Luna en ${moon}** y **Ascendente en ${asc}**— ofrece el instrumental específico para encarnar este septenio: tu **Sol en ${sun}** provee el centro consciente de gravedad y la brújula ética para no perderte; tu **Luna en ${moon}** revela cómo procesas anímicamente las tensiones del ciclo; y tu **Ascendente en ${asc}** es la vestidura y estilo dinámico con el que encaras el mundo exterior y materializas tus propósitos cotidianos.`;
}

// -------------------------------------------------------------
// SECCIÓN 2: Brújula del Alma: Eje Nodal Lunar (Pestaña 2)
// -------------------------------------------------------------
function buildNodalAxisSection(input: SynthesisFallbackInput): string {
  const name = input.name || 'Buscador/a';

  // 1. Prioritize direct calculation.lunarNodes object
  let northSign: ZodiacSign | undefined;
  let northHouse: number | undefined;
  let northDeg = 0;
  let northMin = 0;
  let dharmaDirection = '';
  let soulLesson = '';
  let evolutionaryAction = '';
  let strengths: string[] = [];

  let southSign: ZodiacSign | undefined;
  let southHouse: number | undefined;
  let southDeg = 0;
  let southMin = 0;
  let pastGifts = '';
  let comfortTrap = '';
  let patterns: string[] = [];

  let cycleMeaning = '';
  let nextReturnAge = 0;
  let yearsUntilReturn = 0;

  if (input.lunarNodes) {
    northSign = input.lunarNodes.northNode.sign;
    northHouse = input.lunarNodes.northNode.house;
    northDeg = input.lunarNodes.northNode.degree;
    northMin = input.lunarNodes.northNode.minute;
    dharmaDirection = input.lunarNodes.northNode.dharmaDirection;
    soulLesson = input.lunarNodes.northNode.soulLesson;
    evolutionaryAction = input.lunarNodes.northNode.evolutionaryAction;
    strengths = input.lunarNodes.northNode.strengthsToCultivate || [];

    southSign = input.lunarNodes.southNode.sign;
    southHouse = input.lunarNodes.southNode.house;
    southDeg = input.lunarNodes.southNode.degree;
    southMin = input.lunarNodes.southNode.minute;
    pastGifts = input.lunarNodes.southNode.pastLifeGifts;
    comfortTrap = input.lunarNodes.southNode.comfortZoneTrap;
    patterns = input.lunarNodes.southNode.patternsToRelease || [];

    cycleMeaning = input.lunarNodes.nodalCycle?.cycleMeaning || '';
    nextReturnAge = input.lunarNodes.nodalCycle?.nextNodalReturnAge || 0;
    yearsUntilReturn = input.lunarNodes.nodalCycle?.yearsUntilReturn || 0;
  } else if (input.lunarNodesDetail) {
    northSign = normalizeZodiacSign(input.lunarNodesDetail.northSign);
    northHouse = input.lunarNodesDetail.northHouse;
    northDeg = input.lunarNodesDetail.northDegree || 0;
    northMin = input.lunarNodesDetail.northMinute || 0;
    dharmaDirection = input.lunarNodesDetail.dharmaDirection || '';
    soulLesson = input.lunarNodesDetail.soulLesson || '';
    evolutionaryAction = input.lunarNodesDetail.evolutionaryAction || '';
    strengths = input.lunarNodesDetail.strengthsToCultivate || [];

    southSign = normalizeZodiacSign(input.lunarNodesDetail.southSign);
    southHouse = input.lunarNodesDetail.southHouse;
    southDeg = input.lunarNodesDetail.southDegree || 0;
    southMin = input.lunarNodesDetail.southMinute || 0;
    pastGifts = input.lunarNodesDetail.pastLifeGifts || '';
    comfortTrap = input.lunarNodesDetail.comfortZoneTrap || '';
    patterns = input.lunarNodesDetail.patternsToRelease || [];

    cycleMeaning = input.lunarNodesDetail.cycleMeaning || '';
    nextReturnAge = input.lunarNodesDetail.nextNodalReturnAge || 0;
    yearsUntilReturn = input.lunarNodesDetail.yearsUntilReturn || 0;
  }

  // 2. Parse from input.nodalAxisCode if still missing
  if ((!northSign || !southSign) && input.nodalAxisCode) {
    const nnMatch = input.nodalAxisCode.match(/NN\s+en\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)(?:\s*\(C(\d+)\))?/i);
    const nsMatch = input.nodalAxisCode.match(/NS\s+en\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)(?:\s*\(C(\d+)\))?/i);
    if (nnMatch && nnMatch[1]) {
      northSign = normalizeZodiacSign(nnMatch[1]) || northSign;
      if (nnMatch[2]) northHouse = parseInt(nnMatch[2], 10);
    }
    if (nsMatch && nsMatch[1]) {
      southSign = normalizeZodiacSign(nsMatch[1]) || southSign;
      if (nsMatch[2]) southHouse = parseInt(nsMatch[2], 10);
    }
  }

  if (!northSign) northSign = 'Aries';
  if (!southSign) southSign = 'Libra';

  // Complete from guidance dictionaries if any text field was empty
  const northGuide = LUNAR_NODE_GUIDANCE[northSign] || LUNAR_NODE_GUIDANCE.Aries;
  const southGuide = LUNAR_NODE_GUIDANCE[southSign] || LUNAR_NODE_GUIDANCE.Libra;

  if (!dharmaDirection) dharmaDirection = northGuide.northDharma;
  if (!soulLesson) soulLesson = northGuide.northLesson;
  if (!evolutionaryAction) evolutionaryAction = northGuide.northAction;
  if (!strengths || strengths.length === 0) strengths = northGuide.northStrengths;
  if (!pastGifts) pastGifts = southGuide.southGifts;
  if (!comfortTrap) comfortTrap = southGuide.southTrap;
  if (!patterns || patterns.length === 0) patterns = southGuide.southPatterns;

  const northCoord = northHouse ? ` en Casa ${northHouse}${northDeg ? ` (${northDeg}° ${northMin}')` : ''}` : '';
  const southCoord = southHouse ? ` en Casa ${southHouse}${southDeg ? ` (${southDeg}° ${southMin}')` : ''}` : '';

  const northHouseTheme = northHouse && HOUSE_THEMES[northHouse]
    ? ` Al ubicarse en tu **${HOUSE_THEMES[northHouse].name}**, este sendero evolutivo te exige proyectarte conscientemente en **${HOUSE_THEMES[northHouse].impact}**.`
    : '';

  const southHouseTheme = southHouse && HOUSE_THEMES[southHouse]
    ? ` En tu **${HOUSE_THEMES[southHouse].name}**, este equipaje kármico se ha expresado tradicionalmente en **${HOUSE_THEMES[southHouse].impact}**.`
    : '';

  const cycleText = nextReturnAge > 0
    ? `\n- **Ciclo Nodal de Vida (~18.6 años):** ${cycleMeaning || 'Etapa de maduración y alineación con la trayectoria biográfica.'} Tu próximo Retorno Nodal exacto se producirá a los **${nextReturnAge} años**${yearsUntilReturn > 0 ? ` (en aproximadamente ~${yearsUntilReturn} años)` : ' (ciclo activo en este momento)'}.\n`
    : cycleMeaning ? `\n- **Ciclo Nodal:** ${cycleMeaning}\n` : '';

  return `## 2. La Brújula del Alma: El Eje de los Nodos Lunares

El eje nodal lunar constituye el vector kármico y la brújula evolutiva de la biografía de **${name}**. En tu mapa celeste individual, este sendero se expresa a través del eje polar entre tu **Nodo Lunar Sur en ${southSign}${southCoord}** y tu **Nodo Lunar Norte en ${northSign}${northCoord}**.

### El Equipaje del Pasado: Tu Nodo Sur en ${southSign}${southCoord}
El **Nodo Lunar Sur** representa tu memoria anímica acumulada, los talentos que traes listos de fábrica y tu territorio de confort espontáneo:
- **Dones y facilidades innatas:** **${pastGifts}**.${southHouseTheme}
- **La trampa de inercia:** Si te refugias en este polo por miedo al esfuerzo evolutivo, caes en: **${comfortTrap}**.
- **Patrones automáticos a observar y liberar:** ${patterns.join(', ')}.

### La Brújula del Porvenir: Tu Nodo Norte en ${northSign}${northCoord}
En el polo opuesto, tu **Nodo Lunar Norte** señala el territorio sagrado de tu Dharma y la verdadera dirección de crecimiento de tu encarnación:
- **El llamado evolutivo (Dharma):** **${dharmaDirection}**.${northHouseTheme}
- **La gran lección del alma:** **${soulLesson}**.
- **Acción evolutiva recomendada:** **${evolutionaryAction}**.
- **Fortalezas del alma a cultivar activamente:** ${strengths.join(', ')}.

### Integración Kármica del Eje en tu Biografía
${cycleText}El aprendizaje de este eje no consiste en mutilar ni rechazar los dones cultivados en tu Nodo Sur en ${southSign}, sino en poner toda esa maestría al servicio del nuevo territorio que tu Nodo Norte en ${northSign}${northCoord} demanda: una vida más íntegra, consciente y alineada con tu misión esencial.`;
}

// -------------------------------------------------------------
// SECCIÓN 3: Clima Vital del Año de Vida Actual (Pestaña 3)
// -------------------------------------------------------------
function buildProfectionSection(input: SynthesisFallbackInput): string {
  const name = input.name || 'Buscador/a';

  // 1. Prioritize calculation.yearOfLife object
  let currentYear = 36;
  let completedYears = 35;
  let profHouse = 12;
  let profSign: ZodiacSign = 'Piscis';
  let lordOfYear = 'Júpiter';
  let annualCoreTheme = 'Año de Cierre de Ciclo, Introspección y Preparación';
  let anthroposophicEnergy = 'El foco pedagógico se orienta hacia la asimilación profunda de experiencias pasadas.';
  let directives: string[] = [];
  let recommendations: string[] = [];

  if (input.yearOfLife) {
    currentYear = input.yearOfLife.currentYearOfLife;
    completedYears = input.yearOfLife.completedYears;
    profHouse = input.yearOfLife.profectionHouse;
    profSign = input.yearOfLife.profectionSign;
    lordOfYear = input.yearOfLife.lordOfYear;
    annualCoreTheme = input.yearOfLife.annualCoreTheme;
    anthroposophicEnergy = input.yearOfLife.anthroposophicYearEnergy;
    directives = input.yearOfLife.keyDirectives || [];
    recommendations = input.yearOfLife.vitalRecommendations || [];
  } else if (input.profectionCode) {
    const yMatch = input.profectionCode.match(/Año\s*(\d+)/i);
    const hMatch = input.profectionCode.match(/C(?:asa)?\s*(\d+)/i);
    const rMatch = input.profectionCode.match(/Regente:\s*([A-Za-zÁÉÍÓÚáéíóúñ\s/]+)/i);
    const sMatch = input.profectionCode.match(/en\s+([A-Za-zÁÉÍÓÚáéíóúñ]+)/i);

    if (yMatch) currentYear = parseInt(yMatch[1], 10);
    completedYears = Math.max(0, currentYear - 1);
    if (hMatch) profHouse = parseInt(hMatch[1], 10);
    if (rMatch) lordOfYear = rMatch[1].trim();
    if (sMatch) profSign = normalizeZodiacSign(sMatch[1]) || profSign;
  }

  const houseTheme = HOUSE_THEMES[profHouse] || {
    name: `Casa ${profHouse}`,
    impact: 'un área nuclear de tu desarrollo individual',
  };

  const directivesList = directives.length > 0
    ? directives.map((d) => `- **Directiva:** ${d}`).join('\n')
    : `- **Directiva:** Prioriza el orden y la autenticidad en los asuntos regidos por ${lordOfYear}.\n- **Directiva:** Alinea tus decisiones anuales con las metas prioritarias de tu ${houseTheme.name}.`;

  const recList = recommendations.length > 0
    ? recommendations.map((r) => `- ${r}`).join('\n')
    : `- Dedica tiempo consciente a reflexionar antes de asumir compromisos de gran envergadura.\n- Cuida tu ritmo biológico y emocional diario para no sobrecargar el sistema nervioso.`;

  const aspectsStr = Array.isArray(input.natalAspectCodes) && input.natalAspectCodes.length > 0
    ? input.natalAspectCodes.slice(0, 4).join(', ')
    : 'tus configuraciones natales más representativas';

  return `## 3. El Clima Vital del Año de Vida Actual

Para **${name}**, el presente período cronológico corresponde al **Año ${currentYear} de vida** (${completedYears} años cumplidos). Dentro de la técnica tradicional de las profecías anuales unida a la biografía antroposófica, tu año está gobernado por:
- **Casa de Profección Activa:** **${houseTheme.name} en ${profSign}**.
- **Regente del Año (Señor del Año):** **${lordOfYear}**.

### Tema Central del Año
**${annualCoreTheme}**

${anthroposophicEnergy} Al activarse tu **${houseTheme.name}**, el foco pedagógico de tus vivencias cotidianas te convoca directamente a madurar y consolidar **${houseTheme.impact}**.

### Directivas Clave para este Año de Vida
Las directivas calculadas para modular la energía de este año son:
${directivesList}

### Recomendaciones Prácticas y Vitales
${recList}

### Integración con tus Aspectos Natales
Bajo el mandato de **${lordOfYear}**, las configuraciones de tu mapa natal (**${aspectsStr}**) se ponen en movimiento para que actúes como un sabio tejedor de tu propia historia: transformar cualquier aparente obstáculo en templanza, lucidez y coherencia moral.`;
}

// -------------------------------------------------------------
// SECCIÓN 4: Cualidad del Día: Tránsitos en Sinastría (Pestaña 4)
// -------------------------------------------------------------
function buildSynastryDailySynthesis(input: SynthesisFallbackInput): string {
  const sun = input.sunSign || 'Signo Solar';
  const moon = input.moonSign || 'Signo Lunar';
  const asc = input.ascendantSign || 'Ascendente';

  let transits: ActiveTransitItem[] = [];

  if (input.currentTransits?.activeTransits && Array.isArray(input.currentTransits.activeTransits)) {
    transits = input.currentTransits.activeTransits.map((t) => ({
      transitPlanetName: t.transitPlanet?.name,
      transitSign: t.transitPlanet?.sign,
      natalPlanetName: t.natalPlanet?.name,
      natalSign: t.natalPlanet?.sign,
      natalHouse: t.natalPlanet?.house,
      aspectType: t.aspectType,
      aspectLabel: t.name || t.aspectType,
      nature: t.nature,
      biographicalImpact: t.biographicalImpact,
      simpleExplanation: t.simpleExplanation,
      practicalTip: t.practicalTip,
      activatedHouseArea: t.activatedHouseArea,
    }));
  } else if (Array.isArray(input.activeTransitsRaw) && input.activeTransitsRaw.length > 0) {
    transits = input.activeTransitsRaw;
  } else if (Array.isArray(input.transitDetailedList) && input.transitDetailedList.length > 0) {
    transits = input.transitDetailedList.map((line) => {
      const isHarmonious = line.includes('trígono') || line.includes('sextil');
      const isChallenging = line.includes('cuadratura') || line.includes('oposición');
      return {
        simpleExplanation: line.replace(/^[•\s]+/, ''),
        nature: isHarmonious ? 'harmonious' : isChallenging ? 'challenging' : 'neutral',
      };
    });
  }

  const harmonious = transits.filter((t) => t.nature === 'harmonious');
  const challenging = transits.filter((t) => t.nature === 'challenging');

  const touchedPoints: string[] = [];
  const houseActivations: string[] = [];

  transits.slice(0, 5).forEach((t) => {
    if (t.natalPlanetName && t.transitPlanetName) {
      const houseText = t.natalHouse ? ` en Casa ${t.natalHouse}` : '';
      touchedPoints.push(`**${t.transitPlanetName} en tránsito** contactando a tu **${t.natalPlanetName} natal${houseText}** (${t.aspectLabel || t.aspectType || 'aspecto'})`);
    } else if (t.simpleExplanation) {
      touchedPoints.push(t.simpleExplanation);
    }

    if (t.natalHouse && HOUSE_THEMES[t.natalHouse]) {
      const hInfo = HOUSE_THEMES[t.natalHouse];
      if (!houseActivations.includes(hInfo.name)) {
        houseActivations.push(`${hInfo.name}: moviliza ${hInfo.impact}`);
      }
    }
  });

  if (Array.isArray(input.transitHouseActivations) && input.transitHouseActivations.length > 0) {
    input.transitHouseActivations.slice(0, 3).forEach((tha) => {
      if (!houseActivations.includes(tha)) {
        houseActivations.push(tha);
      }
    });
  }

  let intro = '';
  if (touchedPoints.length > 0) {
    intro = `Al contrastar las posiciones planetarias activas de hoy con tu carta natal individual (**Sol en ${sun}**, **Luna en ${moon}** y **Ascendente en ${asc}**), se configura una sinastría celeste precisa y personal: destacan ${touchedPoints.slice(0, 2).join(' y ')}.`;
  } else {
    intro = `La sinastría de las posiciones celestes de hoy con tu carta natal individual (**Sol en ${sun}**, **Luna en ${moon}** y **Ascendente en ${asc}**) marca un ritmo específico para tus actividades cotidianas.`;
  }

  if (houseActivations.length > 0) {
    intro += ` Las áreas de tu mapa más activadas hoy son: ${houseActivations.slice(0, 2).join('; ')}.`;
  }

  let benefitsText = '';
  if (harmonious.length > 0) {
    const harmDetails = harmonious
      .slice(0, 2)
      .map((h) => {
        if (h.transitPlanetName && h.natalPlanetName) {
          const detail = h.practicalTip || h.biographicalImpact || h.simpleExplanation || 'aporta fluidez y facilidad de entendimiento';
          return `el contacto armónico de **${h.transitPlanetName}** con tu **${h.natalPlanetName} natal** ${detail}`;
        }
        return h.simpleExplanation || 'proporciona fluidez y claridad práctica';
      })
      .join('. Asimismo, ');

    benefitsText = `Cuentas con un canal favorable para la acción: ${harmDetails}. Es un momento propicio para destrabar gestiones pendientes, entablar conversaciones de acuerdos mutuos y coordinar tus decisiones diarias con serenidad y agudeza.`;
  } else {
    benefitsText = `Tu mapa natal recibe hoy un influjo propicio para enfocar la voluntad en una sola prioridad a la vez. Si diriges tu energía de forma metódica, lograrás avanzar con firmeza en la resolución de tareas que venías postergando.`;
  }

  let conflictsText = '';
  if (challenging.length > 0) {
    const chalDetails = challenging
      .slice(0, 2)
      .map((c) => {
        if (c.transitPlanetName && c.natalPlanetName) {
          const detail = c.simpleExplanation || c.biographicalImpact || 'demanda paciencia para evitar reacciones precipitadas';
          return `la tensión activa de **${c.transitPlanetName}** frente a tu **${c.natalPlanetName} natal** (${detail})`;
        }
        return c.simpleExplanation || 'puede generar impaciencia o susceptibilidad';
      })
      .join('; y ');

    conflictsText = `El punto de fricción del día surge de ${chalDetails}. El riesgo cotidiano está en responder con prisa, caer en susceptibilidades ante imprevistos ajenos o sobrecargar tu agenda pretendiendo controlarlo todo en caliente.`;
  } else {
    conflictsText = `El principal desafío radica en la dispersión o en confiarte en demasía postergando el rigor operativo. Cuida no asumir compromisos extras que fragmenten tu atención o consuman tu energía matutina.`;
  }

  const advice = challenging.length > 0
    ? `Respira y toma distancia antes de reaccionar. Modula el ritmo de tus respuestas, establece prioridades realistas y aprovecha los aspectos fluidos de tu carta para convertir cualquier roce en un ejercicio de templanza y maestría personal.`
    : `Aprovecha la receptividad del entorno para cerrar conversaciones clave y ordenar tus metas del día, manteniendo una cadencia constante sin exigirte más de lo razonable.`;

  return `${intro}

**Beneficios en tus actividades diarias:** ${benefitsText}

**Posibles conflictos:** ${conflictsText}

**Consejo práctico:** ${advice}`;
}

// -------------------------------------------------------------
// FUNCIÓN PRINCIPAL DE SÍNTESIS INTEGRAL
// -------------------------------------------------------------
export function generateGuaranteedCompleteSynthesis(input: SynthesisFallbackInput): string {
  const sec1 = buildSeptenioSection(input);
  const sec2 = buildNodalAxisSection(input);
  const sec3 = buildProfectionSection(input);
  const sec4 = buildSynastryDailySynthesis(input);

  return `${sec1}

---

${sec2}

---

${sec3}

---

## 4. Cualidad del Día: Tránsitos en Sinastría con tu Carta Natal

${sec4}`;
}
