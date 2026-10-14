/**
 * Guaranteed comprehensive synthesis generator.
 * Provides an immediate, complete, deep 4-section reading
 * integrating the natal chart, Steiner's septennium, lunar nodal axis,
 * profections, and daily quality of the day derived from the individual
 * synastry of current transits onto the consultant's natal chart.
 */

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

export interface SynthesisFallbackInput {
  name: string;
  exactAgeFormatted?: string;
  sunSign?: string;
  moonSign?: string;
  ascendantSign?: string;
  septenioCode?: string;
  nodalAxisCode?: string;
  profectionCode?: string;
  natalAspectCodes?: string[];
  natalPlanetsSummary?: string;
  transitHouseActivations?: string[];
  transitCodes?: string[];
  transitDetailedList?: string[];
  currentSkyPositions?: string;
  todayDate?: string;
  activeTransitsRaw?: ActiveTransitItem[];
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

function buildSynastryDailySynthesis(input: SynthesisFallbackInput): string {
  const name = input.name || 'Buscador/a';
  const sun = input.sunSign || 'Signo Solar';
  const moon = input.moonSign || 'Signo Lunar';
  const asc = input.ascendantSign || 'Ascendente';

  // 1. Gather rich transit synastry contacts
  let transits: ActiveTransitItem[] = [];

  if (Array.isArray(input.activeTransitsRaw) && input.activeTransitsRaw.length > 0) {
    transits = input.activeTransitsRaw;
  } else if (Array.isArray(input.transitDetailedList) && input.transitDetailedList.length > 0) {
    // Parse from transitDetailedList
    transits = input.transitDetailedList.map((line) => {
      const isHarmonious = line.includes('trígono') || line.includes('sextil');
      const isChallenging = line.includes('cuadratura') || line.includes('oposición');
      return {
        simpleExplanation: line.replace(/^[•\s]+/, ''),
        nature: isHarmonious ? 'harmonious' : isChallenging ? 'challenging' : 'neutral',
      };
    });
  }

  // Group into harmonious, challenging, and all
  const harmonious = transits.filter((t) => t.nature === 'harmonious');
  const challenging = transits.filter((t) => t.nature === 'challenging');

  // Extract key touched houses and planets
  const touchedPoints: string[] = [];
  const houseActivations: string[] = [];

  transits.slice(0, 5).forEach((t) => {
    if (t.natalPlanetName && t.transitPlanetName) {
      const houseText = t.natalHouse ? ` en Casa ${t.natalHouse}` : '';
      touchedPoints.push(`**${t.transitPlanetName} en tránsito** activando tu **${t.natalPlanetName} natal${houseText}** (${t.aspectLabel || t.aspectType || 'aspecto'})`);
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

  // Also include transitHouseActivations if provided
  if (Array.isArray(input.transitHouseActivations) && input.transitHouseActivations.length > 0) {
    input.transitHouseActivations.slice(0, 3).forEach((tha) => {
      if (!houseActivations.includes(tha)) {
        houseActivations.push(tha);
      }
    });
  }

  // 2. Build synthesis intro
  let intro = '';
  if (touchedPoints.length > 0) {
    intro = `Al contrastar el cielo activo de hoy con tu carta natal individual (**Sol en ${sun}**, **Luna en ${moon}** y **Ascendente en ${asc}**), se configura una sinastría celeste precisa y personal: destacan ${touchedPoints.slice(0, 2).join(' y ')}.`;
  } else {
    intro = `La sinastría de las posiciones celestes de hoy con tu carta natal individual (**Sol en ${sun}**, **Luna en ${moon}** y **Ascendente en ${asc}**) marca un ritmo específico para tus actividades cotidianas.`;
  }

  if (houseActivations.length > 0) {
    intro += ` Las áreas de tu mapa más activadas hoy son: ${houseActivations.slice(0, 2).join('; ')}.`;
  }

  // 3. Build Benefits section based on specific transits
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

    benefitsText = `Cuentas con un canal favorable para la acción: ${harmDetails}. Es un momento excelente para destrabar gestiones pendientes, entablar conversaciones de acuerdos mutuos y coordinar tus decisiones diarias con serenidad y agudeza.`;
  } else {
    benefitsText = `Tu mapa natal recibe hoy un influjo propicio para enfocar la voluntad en una sola prioridad a la vez. Si diriges tu energía de forma metódica, lograrás avanzar con firmeza en la resolución de tareas que venías postergando.`;
  }

  // 4. Build Conflicts section based on specific transits
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

  // 5. Build Practical Advice based on consultant's chart
  const advice = challenging.length > 0
    ? `Respira y toma distancia antes de reaccionar. Modula el ritmo de tus respuestas, establece prioridades realistas y aprovecha los aspectos fluidos de tu carta para convertir cualquier roce en un ejercicio de templanza y maestría personal.`
    : `Aprovecha la receptividad del entorno para cerrar conversaciones clave y ordenar tus metas del día, manteniendo una cadencia constante sin exigirte más de lo razonable.`;

  return `${intro}

**Beneficios en tus actividades diarias:** ${benefitsText}

**Posibles conflictos:** ${conflictsText}

**Consejo práctico:** ${advice}`;
}

export function generateGuaranteedCompleteSynthesis(input: SynthesisFallbackInput): string {
  const name = input.name || 'Buscador/a';
  const age = input.exactAgeFormatted || 'edad actual';
  const sun = input.sunSign || 'Signo Solar';
  const moon = input.moonSign || 'Signo Lunar';
  const asc = input.ascendantSign || 'Ascendente';
  const septenio = input.septenioCode || 'Septenio en curso';
  const nodes = input.nodalAxisCode || 'Eje Nodal kármico';
  const profection = input.profectionCode || 'Profección anual activa';
  const aspects = (input.natalAspectCodes && input.natalAspectCodes.length > 0)
    ? input.natalAspectCodes.slice(0, 5).join(', ')
    : 'Configuraciones armónicas y retos de integración natal';

  const dailySynastryMeaning = buildSynastryDailySynthesis(input);

  return `## 1. La Esencia Biográfica y el Reto del Septenio Presente

Para **${name}**, situarse en los **${age}** representa un umbral biográfico de honda significación anímica y espiritual. Dentro de la cosmovisión antroposófica iniciada por Rudolf Steiner y desarrollada por Bernard Lievegoed, el ser humano no evoluciona de manera lineal, sino a través de metamorfosis rítmicas de siete años gobernadas por arquetipos planetarios.

En este momento de tu recorrido vital, te encuentras transitando el **${septenio}**. Esta etapa solicita un diálogo directo entre las fuerzas formativas del pasado y las preguntas que tu Yo superior formula hacia el porvenir. Tu tríada constitutiva —**Sol en ${sun}**, **Luna en ${moon}** y **Ascendente en ${asc}**— ofrece la clave para navegar este reto: mientras tu Sol busca irradiar autenticidad y propósito consciente, tu Luna aporta la memoria afectiva y tu Ascendente encarna el vehículo y estilo con que te presentas ante el mundo exterior.

El aprendizaje central de este septenio consiste en no reaccionar mecánicamente ante los desafíos cotidianos, sino transformarlos en materia prima para la maduración interior. Es tiempo de cultivar una presencia serena, reconociendo qué estructuras de pensamiento ya cumplieron su ciclo formativo y necesitan dar paso a una renovada libertad creadora.

---

## 2. La Brújula del Alma: El Eje de los Nodos Lunares

El eje nodal lunar constituye el verdadero vector kármico y la brújula evolutiva de la biografía. En tu mapa celeste, este sendero se expresa a través de: **${nodes}**.

El **Nodo Lunar Sur** representa tu equipaje del pasado: los talentos innatos, la familiaridad ancestral y aquellas respuestas automáticas en las que resulta cómodo refugiarse ante la incertidumbre. Si bien este punto contiene una sabiduría consolidada, tender a permanecer en él sin dinamismo puede derivar en estancamiento anímico.

Por contraste, el **Nodo Lunar Norte** señala el territorio de tu Dharma y tu mayor promesa de crecimiento. Avanzar en dirección al signo y casa de tu Nodo Norte implica aventurarse con valentía hacia actitudes desconocidas pero profundamente revitalizantes. No se trata de rechazar lo construido en el Nodo Sur, sino de ponerlo al servicio de la nueva vocación que el Nodo Norte reclama: una vida más integrada, valiente y alineada con el servicio al bien común y la propia verdad esencial.

---

## 3. El Clima Vital del Año de Vida Actual

A nivel del tiempo presente y la técnica clásica de las profecías helenísticas unida a la biografía antroposófica, tu año está marcado por: **${profection}**.

Este factor actúa como el compás que marca la nota tonal de tus vivencias durante estos doce meses. La casa activada por la profección y su planeta regente sitúan el foco de los acontecimientos, las pruebas y los descubrimientos más fértiles del año. Las circunstancias cotidianas que emergen bajo esta influencia no son meras casualidades externas, sino impulsos diseñados pedagógicamente por tu propio destino para desarrollar fortalezas específicas de tu alma.

Durante este período, se sugiere observar con atención las dinámicas vinculadas a los aspectos natales destacados (**${aspects}**). Tu tarea consiste en actuar como un sabio tejedor de tu propia historia: transformar cualquier fricción o tensión aparente en templanza, lucidez y coherencia moral en tus decisiones diarias.

---

## 4. Cualidad del Día: Tránsitos en Sinastría con tu Carta Natal

${dailySynastryMeaning}`;
}
