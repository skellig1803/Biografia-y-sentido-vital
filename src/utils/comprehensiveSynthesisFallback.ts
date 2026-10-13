/**
 * Guaranteed comprehensive synthesis generator.
 * Provides an immediate, complete, deep 4-section reading
 * integrating the natal chart, Steiner's septennium, lunar nodal axis,
 * profections, and daily quality of the day with benefits and conflicts.
 */

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

  // Evaluate celestial tone without ever naming transits or technical aspect jargon
  const rawContext = [
    ...(input.transitDetailedList || []),
    ...(input.transitCodes || []),
    ...(input.transitHouseActivations || []),
    ...(input.natalAspectCodes || []),
  ].join(' ').toLowerCase();

  const isHighEnergy =
    rawContext.includes('cuadratura') ||
    rawContext.includes('oposición') ||
    rawContext.includes('oposicion') ||
    rawContext.includes('marte') ||
    rawContext.includes('saturno') ||
    rawContext.includes('plutón') ||
    rawContext.includes('pluton') ||
    rawContext.includes('urano');

  const colloquialDailyMeaning = isHighEnergy
    ? `Para tu jornada de hoy (en sintonía con tu **Sol en ${sun}**, **Luna en ${moon}** y **Ascendente en ${asc}**), el ambiente general se siente dinámico, exigente y de ritmo acelerado:

**Beneficios en tus actividades diarias:** Cuentas con un empuje adicional para acometer tareas complejas que venías postergando, tomar decisiones laborales con firmeza y resolver imprevistos con agilidad práctica. Si focalizas esta energía en una sola prioridad a la vez, tu productividad será notable.

**Posibles conflictos:** El principal riesgo es la impaciencia, la prisa al contestar mensajes o la susceptibilidad en intercambios con colegas o familiares. Si percibes tensión o demoras ajenas, evita forzar resultados en caliente.

**Consejo práctico:** Respira antes de reaccionar, mantén la calma en tus rutinas y convierte cualquier roce en un ejercicio de templanza.`
    : `Para tu jornada de hoy (en sintonía con tu **Sol en ${sun}**, **Luna en ${moon}** y **Ascendente en ${asc}**), el ambiente general se percibe fluido, sereno y propicio para el entendimiento:

**Beneficios en tus actividades diarias:** Es un momento óptimo para dialogar, coordinar acuerdos, avanzar en proyectos creativos y afianzar la cooperación con compañeros o seres queridos. Tu juicio se encuentra despejado para organizar tu agenda con armonía y eficacia.

**Posibles conflictos:** El desafío radica en la dispersión o en postergar tareas que exigen rigor por quedarte en detalles amenos pero secundarios. Cuida no comprometerte con más solicitudes de las que puedes gestionar hoy con holgura.

**Consejo práctico:** Aprovecha la buena receptividad del entorno para cerrar conversaciones pendientes, manteniendo un ritmo constante sin sobrecargarte.`;

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

## 4. Cualidad del Día: Beneficios y Posibles Conflictos en tus Actividades Diarias

${colloquialDailyMeaning}`;
}
