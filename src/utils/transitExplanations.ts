import { PlanetId, ZodiacSign } from '../types';

export interface TransitExplanationResult {
  simpleExplanation: string;
  practicalTip: string;
  activatedHouseArea: string;
}

export const HOUSE_AREAS: Record<number, { title: string; sphere: string }> = {
  1: {
    title: 'Casa 1 (Identidad y Presencia)',
    sphere: 'Afecta tu vitalidad, tu cuerpo físico, tu autoimagen y la forma en que tomas la iniciativa.',
  },
  2: {
    title: 'Casa 2 (Recursos y Autoestima)',
    sphere: 'Influye en tu estabilidad financiera, tus valores prioritarios y tu sentido de merecimiento personal.',
  },
  3: {
    title: 'Casa 3 (Mente y Entorno Cotidiano)',
    sphere: 'Activa tus procesos de aprendizaje, comunicación, intercambios cercanos y desplazamientos habituales.',
  },
  4: {
    title: 'Casa 4 (Hogar y Raíces Emocionales)',
    sphere: 'Impacta en tu intimidad familiar, tu vivienda, tu descanso y la base de seguridad de tu infancia.',
  },
  5: {
    title: 'Casa 5 (Creatividad y Gozo)',
    sphere: 'Despierta tu pasión creadora, romances, relación con hijos o proyectos personales nacidos del corazón.',
  },
  6: {
    title: 'Casa 6 (Salud y Rutina Diaria)',
    sphere: 'Se refleja en tus hábitos de autocuidado, ritmo de trabajo cotidiano, organización y bienestar corporal.',
  },
  7: {
    title: 'Casa 7 (Pareja y Alianzas)',
    sphere: 'Modifica la dinámica con tu pareja, socios o personas clave, mostrando qué proyectas en los demás.',
  },
  8: {
    title: 'Casa 8 (Transformación y Profundidad)',
    sphere: 'Estimula procesos de metamorfosis psicológica, sexualidad íntima, finanzas compartidas y soltar apegos.',
  },
  9: {
    title: 'Casa 9 (Horizontes y Sentido de Vida)',
    sphere: 'Expande tu visión filosófica, vocación espiritual, estudios superiores y necesidad de explorar el mundo.',
  },
  10: {
    title: 'Casa 10 (Vocación y Metas Profesionales)',
    sphere: 'Incide en tu rumbo profesional, reputación pública, autoridad laboral y legado ante la sociedad.',
  },
  11: {
    title: 'Casa 11 (Amistades y Proyectos Colectivos)',
    sphere: 'Abre conexiones con grupos afines, ideales de futuro, redes colaborativas y causas compartidas.',
  },
  12: {
    title: 'Casa 12 (Espiritualidad e Inconsciente)',
    sphere: 'Facilita la introspección, meditación, sanación de memorias del pasado y cierre sereno de etapas.',
  },
};

interface ExplanationRule {
  tPlanet: string;
  nPlanet: string;
  type?: string; // 'conjunction' | 'opposition' | 'square' | 'trine' | 'sextile'
  nature?: 'harmonious' | 'challenging' | 'neutral';
  explanation: string;
  tip: string;
}

const SPECIFIC_RULES: ExplanationRule[] = [
  // Plutón transits
  {
    tPlanet: 'pluto',
    nPlanet: 'sun',
    nature: 'harmonious',
    explanation:
      'Plutón regenera y fortalece tu voluntad y tu vitalidad esencial. Te brinda una notable capacidad de liderazgo, magnetismo y fuerza interior para renovar tu vida sin resistencias.',
    tip: 'Aprovecha este momento para asumir tu poder personal y liderar transformaciones que antes postergabas.',
  },
  {
    tPlanet: 'pluto',
    nPlanet: 'sun',
    nature: 'challenging',
    explanation:
      'Plutón te confronta con viejas estructuras de control y temores de tu ego para invitarte a una profunda muerte y renacimiento simbólico de tu identidad.',
    tip: 'Suelta la necesidad de controlarlo todo. Confía en el proceso de despojo; lo que se cae deja espacio a tu verdad más genuina.',
  },
  {
    tPlanet: 'pluto',
    nPlanet: 'sun',
    type: 'conjunction',
    explanation:
      'Un momento bisagra en tu biografía: tu identidad básica vive una metamorfosis radical y adquieres una fuerza de regeneración incomparable.',
    tip: 'Sé paciente contigo mismo. Permite que emerja tu auténtica vocación espiritual sin aferrarte a quién eras en el pasado.',
  },
  {
    tPlanet: 'pluto',
    nPlanet: 'moon',
    nature: 'harmonious',
    explanation:
      'Sanación profunda de tus patrones emocionales y apegos infantiles. Adquieres una gran intuición psicológica y estabilidad afectiva.',
    tip: 'Permítete sentir tus emociones sin juzgarlas; tu capacidad de regeneración íntima está al máximo.',
  },
  {
    tPlanet: 'pluto',
    nPlanet: 'moon',
    nature: 'challenging',
    explanation:
      'Emergen emociones intensas, celos o heridas familiares no resueltas para ser reconocidas y sanadas desde la raíz.',
    tip: 'Evita reacciones impulsivas en el hogar o con seres queridos. Dedica tiempo a la terapia, el silencio y el autocuidado.',
  },
  {
    tPlanet: 'pluto',
    nPlanet: 'mercury',
    nature: 'harmonious',
    explanation:
      'Tu mente penetra con agudeza en temas complejos y desentraña verdades ocultas. Excelente para investigaciones, estudios profundos y acuerdos estratégicos.',
    tip: 'Utiliza el poder transformador de tu palabra para sanar y comunicar con autenticidad.',
  },
  {
    tPlanet: 'pluto',
    nPlanet: 'mercury',
    nature: 'challenging',
    explanation:
      'Riesgo de obsesiones mentales, discusiones acaloradas o pensamientos fijos. Se te pide revisar creencias limitantes y soltar dogmas.',
    tip: 'Respira antes de debatir y vigila los pensamientos en bucle. Busca actividades que despejen tu sistema nervioso.',
  },
  {
    tPlanet: 'pluto',
    nPlanet: 'venus',
    nature: 'harmonious',
    explanation:
      'Tus vínculos y finanzas se profundizan con intensidad y magnetismo. Las relaciones que surgen o maduran ahora tienen un sello transformador y auténtico.',
    tip: 'Abre tu corazón a conexiones genuinas y redefine qué tiene verdadero valor para ti.',
  },
  {
    tPlanet: 'pluto',
    nPlanet: 'venus',
    nature: 'challenging',
    explanation:
      'Pone a prueba la autenticidad en tus relaciones y tu economía. Pueden emerger dinámicas de posesividad o dependencia para ser trascendidas.',
    tip: 'Revisa tu autoestima: el amor sano comienza en el respeto propio y no en la necesidad del otro.',
  },
  {
    tPlanet: 'pluto',
    nPlanet: 'mars',
    explanation:
      'Gran aumento de tu energía impulsora y determinación. Pide canalizar la pasión con estrategia constructiva para no generar choques innecesarios.',
    tip: 'Canaliza esta tremenda energía a través de disciplina física, deportes o proyectos exigentes.',
  },
  {
    tPlanet: 'pluto',
    nPlanet: 'northNode',
    explanation:
      'Un poderoso llamado del destino kármico: se eliminan desvíos en tu camino para que abraces con convicción la dirección evolutiva de tu alma.',
    tip: 'Acepta los cambios de rumbo con serenidad; están perfectamente sincronizados con tu aprendizaje.',
  },

  // Saturno transits
  {
    tPlanet: 'saturn',
    nPlanet: 'sun',
    nature: 'harmonious',
    explanation:
      'Saturno consolida tus esfuerzos y te brinda reconocimiento, madurez y estabilidad duradera. Tus proyectos avanzan con solidez y paso firme.',
    tip: 'Mantén tu disciplina habitual; estás construyendo los cimientos que sostendrán los próximos años.',
  },
  {
    tPlanet: 'saturn',
    nPlanet: 'sun',
    nature: 'challenging',
    explanation:
      'Período de prueba y realismo donde sientes mayor peso de responsabilidades o limitaciones temporales. Te exige madurar y eliminar lo que ya no es esencial.',
    tip: 'Cuida tus niveles de descanso físico. No tomes las demoras como fracasos sino como invitaciones a estructurarte mejor.',
  },
  {
    tPlanet: 'saturn',
    nPlanet: 'sun',
    type: 'conjunction',
    explanation:
      'Momento culminante de maduración: asumes plenamente tu autoridad personal y te comprometes formalmente con tu rumbo de vida.',
    tip: 'Elige conscientemente qué responsabilidades deseas asumir con orgullo en esta nueva etapa.',
  },
  {
    tPlanet: 'saturn',
    nPlanet: 'moon',
    nature: 'harmonious',
    explanation:
      'Estabilidad y madurez en tu mundo interior. Capacidad de brindar apoyo sereno y confiable a tus seres queridos.',
    tip: 'Crea rutinas hogareñas ordenadas que nutran tu tranquilidad emocional.',
  },
  {
    tPlanet: 'saturn',
    nPlanet: 'moon',
    nature: 'challenging',
    explanation:
      'Puedes experimentar momentos pasajeros de melancolía, cansancio o sensación de soledad. Te invita a ser tu propio sostén y poner límites sanos.',
    tip: 'No te aísles. Reconoce tus necesidades afectivas y trátate con paciencia y amabilidad.',
  },
  {
    tPlanet: 'saturn',
    nPlanet: 'mercury',
    explanation:
      'Pensamiento riguroso, realista y estructurado. Momento idóneo para redactar contratos, planificar a largo plazo o estudiar materias complejas.',
    tip: 'Evita el exceso de autocrítica o el pesimismo mental; mantén una mirada práctica orientada a soluciones.',
  },
  {
    tPlanet: 'saturn',
    nPlanet: 'venus',
    explanation:
      'Maduración en tus afectos y finanzas. Buscas compromisos reales y duraderos, dejando atrás relaciones o gastos superficiales.',
    tip: 'Valora la calidad por encima de la cantidad en tus vínculos y ahorros.',
  },
  {
    tPlanet: 'saturn',
    nPlanet: 'saturn',
    explanation:
      'Retorno o ciclo clave de Saturno: balance biográfico donde cosechas lo sembrado y reordenas tus prioridades de cara a tu futuro.',
    tip: 'Agradece la experiencia ganada y toma las riendas de tu siguiente fase con responsabilidad serena.',
  },

  // Urano transits
  {
    tPlanet: 'uranus',
    nPlanet: 'sun',
    nature: 'harmonious',
    explanation:
      'Chispazos de genialidad, originalidad y ganas de renovarte. Te atreves a expresar facetas únicas de tu personalidad con fluidez y frescura.',
    tip: 'Abre tu mente a nuevas tecnologías, amistades innovadoras e ideas poco convencionales.',
  },
  {
    tPlanet: 'uranus',
    nPlanet: 'sun',
    nature: 'challenging',
    explanation:
      'Deseo imperioso de romper con rutinas asfixiantes o mandatos heredados. Pueden surgir cambios inesperados que te exigen adaptabilidad.',
    tip: 'Canaliza la inquietud de cambio de manera constructiva, sin quemar puentes de forma impulsiva.',
  },
  {
    tPlanet: 'uranus',
    nPlanet: 'moon',
    explanation:
      'Cambios imprevistos en tu vida doméstica, residencia o ritmos emocionales. Despierta una necesidad de mayor libertad e independencia afectiva.',
    tip: 'Flexibiliza tus expectativas en el hogar y date permiso para experimentar nuevas formas de vivir.',
  },
  {
    tPlanet: 'uranus',
    nPlanet: 'mercury',
    explanation:
      'Mente hiperactiva e intuitiva. Se te ocurren soluciones innovadoras y fuera de la caja a problemas que parecían estancados.',
    tip: 'Apunta tus ideas inspiradoras en cuanto surjan para que no se evaporen.',
  },
  {
    tPlanet: 'uranus',
    nPlanet: 'venus',
    explanation:
      'Vuelco emocionante en tus gustos estéticos y relaciones. Deseo de aire fresco y espontaneidad en tus vínculos de pareja.',
    tip: 'Introduce novedad y juego en tus relaciones para evitar la monotonía.',
  },

  // Neptuno transits
  {
    tPlanet: 'neptune',
    nPlanet: 'sun',
    nature: 'harmonious',
    explanation:
      'Apertura del corazón, inspiración artística y sintonía con lo espiritual. Tu sensibilidad se vuelve más compasiva y trascendente.',
    tip: 'Cultiva el arte, la música o la meditación; son tus mejores canales de expresión en este ciclo.',
  },
  {
    tPlanet: 'neptune',
    nPlanet: 'sun',
    nature: 'challenging',
    explanation:
      'Sensación de niebla, confusión o falta de energía vital. Es un llamado a descansar y no forzar decisiones tajantes sin claridad previa.',
    tip: 'Evita idealizaciones excesivas en personas o propuestas. Pon los pies en la tierra y revisa la letra pequeña.',
  },
  {
    tPlanet: 'neptune',
    nPlanet: 'moon',
    explanation:
      'Sensibilidad psíquica y empatía a flor de piel. Puedes captar los estados de ánimo de los demás como una esponja emocional.',
    tip: 'Establece límites energéticos claros y pasa tiempo cerca de la naturaleza o el agua.',
  },
  {
    tPlanet: 'neptune',
    nPlanet: 'chiron',
    explanation:
      'Disolución compasiva de dolores del pasado. Comprendes tus heridas más profundas con perdón, paz y serenidad de espíritu.',
    tip: 'Honra tu camino recorrido; tus vivencias pasadas son hoy tu mayor medicina para acompañar a otros.',
  },

  // Júpiter transits
  {
    tPlanet: 'jupiter',
    nPlanet: 'sun',
    explanation:
      'Un halo de optimismo, buena fortuna y confianza en tus capacidades. Se abren puertas para crecer, viajar y expandir tus proyectos.',
    tip: 'Aprovecha las oportunidades con entusiasmo, pero sin descuidar la prudencia con promesas desmedidas.',
  },
  {
    tPlanet: 'jupiter',
    nPlanet: 'moon',
    explanation:
      'Bienestar interior, generosidad afectiva y armonía en el entorno familiar. Momento de plenitud emocional.',
    tip: 'Comparte tu alegría con quienes amas y embellece tu espacio de vida.',
  },
  {
    tPlanet: 'jupiter',
    nPlanet: 'mercury',
    explanation:
      'Apertura mental a grandes horizontes, viajes de estudio y negociaciones exitosas. Tu visión de futuro se amplía.',
    tip: 'Aprende algo nuevo o difunde tus ideas con convicción.',
  },
  {
    tPlanet: 'jupiter',
    nPlanet: 'venus',
    explanation:
      'Ventana de encanto, abundancia y celebración en el amor y las finanzas. Atracción natural de personas agradables.',
    tip: 'Disfruta de la vida social y de las gratificaciones que te mereces.',
  },

  // Nodos lunares transits
  {
    tPlanet: 'northNode',
    nPlanet: 'sun',
    explanation:
      'Encuentros y circunstancias clave que te orientan hacia tu propósito evolutivo. Tu camino de vida recibe un fuerte impulso del destino.',
    tip: 'Presta atención a las sincronías y personas que aparecen ahora en tu entorno.',
  },
  {
    tPlanet: 'northNode',
    nPlanet: 'mercury',
    explanation:
      'Conversaciones decisivas, libros o aprendizajes que cambian tu mentalidad y abren nuevos senderos biográficos.',
    tip: 'Escucha con mente abierta los consejos constructivos de personas sabias.',
  },
  {
    tPlanet: 'northNode',
    nPlanet: 'northNode',
    explanation:
      'Retorno Nodal (cada 18.6 años): alineación trascendental con el plan de tu alma. Evalúas si estás viviendo según tus verdaderos valores.',
    tip: 'Pregúntate: ¿hacia dónde me llama mi crecimiento interior? Da el siguiente paso con fe.',
  },
  {
    tPlanet: 'northNode',
    nPlanet: 'southNode',
    explanation:
      'Inversión nodal: invitación a soltar viejos patrones del pasado para hacer espacio a nuevos desafíos evolutivos.',
    tip: 'No temas cerrar un ciclo que ya cumplió su función formativa.',
  },

  // Quirón transits
  {
    tPlanet: 'chiron',
    nPlanet: 'northNode',
    nature: 'harmonious',
    explanation:
      'Sanación de tu camino de destino: la integración de tus vivencias difíciles se convierte en una brújula que te guía hacia adelante con madurez.',
    tip: 'Confía en tu intuición y en la sabiduría que has ganado superando obstáculos.',
  },
  {
    tPlanet: 'chiron',
    nPlanet: 'southNode',
    nature: 'harmonious',
    explanation:
      'Liberación amable de cargas kármicas heredadas. Te desprendes con gratitud de antiguos complejos o mandatos familiares.',
    tip: 'Perdona tus errores del pasado; fueron los escalones que te trajeron hasta aquí.',
  },
];

export function getTransitExplanation(params: {
  transitPlanetId: string;
  transitPlanetName: string;
  transitSign: string;
  natalPlanetId: string;
  natalPlanetName: string;
  natalSign: string;
  natalHouse: number;
  aspectType: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';
  nature: 'harmonious' | 'challenging' | 'neutral';
  aspectName: string;
}): TransitExplanationResult {
  const {
    transitPlanetId,
    transitPlanetName,
    natalPlanetId,
    natalPlanetName,
    natalHouse,
    aspectType,
    nature,
    aspectName,
  } = params;

  // 1. Check specific catalog rules
  const match = SPECIFIC_RULES.find((r) => {
    if (r.tPlanet !== transitPlanetId) return false;
    if (r.nPlanet !== natalPlanetId) return false;
    if (r.type && r.type !== aspectType) return false;
    if (r.nature && r.nature !== nature) return false;
    return true;
  });

  const houseInfo = HOUSE_AREAS[natalHouse] || {
    title: `Casa ${natalHouse}`,
    sphere: `Activa las temáticas de tu Casa ${natalHouse} natal.`,
  };

  if (match) {
    return {
      simpleExplanation: match.explanation,
      practicalTip: match.tip,
      activatedHouseArea: `${houseInfo.title}: ${houseInfo.sphere}`,
    };
  }

  // 2. Synthesize an accurate, clear, pedagogical fallback
  const aspectDynamics: Record<string, string> = {
    conjunction: 'inicia un ciclo conjunto de máxima concentración de energía',
    trine: 'fluye con armonía, facilitando avances y bienestar sin fricciones',
    sextile: 'abre oportunidades estimulantes que puedes activar con iniciativa',
    square: 'genera una tensión estimulante que te desafía a madurar y tomar decisiones claras',
    opposition: 'te sitúa frente a un espejo que pide equilibrar dos fuerzas complementarias',
  };

  const planetQualities: Record<string, string> = {
    sun: 'tu vitalidad y sentido de identidad',
    moon: 'tu mundo emocional y seguridad interior',
    mercury: 'tu forma de pensar y comunicarte',
    venus: 'tus afectos, relaciones y valores',
    mars: 'tu fuerza de iniciativa y capacidad de acción',
    jupiter: 'tu confianza y expansión de horizontes',
    saturn: 'tu disciplina, límites y madurez responsable',
    uranus: 'tu necesidad de libertad y renovación',
    neptune: 'tu sensibilidad espiritual e intuición',
    pluto: 'tu capacidad de regeneración y poder personal',
    northNode: 'la brújula de tu destino evolutivo',
    southNode: 'la memoria y talentos de tu pasado',
    chiron: 'la sanación de tus vulnerabilidades',
    ascendant: 'tu personalidad y cómo te presentas al mundo',
    midheaven: 'tu vocación y metas profesionales',
  };

  const transitActions: Record<string, string> = {
    pluto: 'transforma profundamente y elimina lo superfluo en',
    neptune: 'sensibiliza e inspira sutilmente a',
    uranus: 'renueva y despierta de forma innovadora a',
    saturn: 'estructura, pone a prueba y madura a',
    jupiter: 'expande con optimismo y nuevas oportunidades a',
    mars: 'dinamiza y moviliza con intensidad a',
    venus: 'armoniza y embellece las dinámicas de',
    mercury: 'activa el diálogo y nuevas ideas en torno a',
    sun: 'ilumina con conciencia y vitalidad a',
    moon: 'nutre y conmueve emocionalmente a',
    northNode: 'sincroniza con tu aprendizaje de vida a',
    chiron: 'ayuda a sanar con compasión a',
  };

  const dyn = aspectDynamics[aspectType] || 'activa la relación con';
  const qual = planetQualities[natalPlanetId] || natalPlanetName;
  const action = transitActions[transitPlanetId] || 'influye directamente sobre';

  const simpleExplanation = `${transitPlanetName} en ${aspectName} a tu ${natalPlanetName} natal: esta configuración ${action} ${qual}, y ${dyn}.`;

  const practicalTip =
    nature === 'harmonious'
      ? `Aprovecha la fluidez de este aspecto para consolidar iniciativas vinculadas a ${qual}.`
      : nature === 'challenging'
      ? `Toma este momento como un entrenamiento de madurez; observa las tensiones sin precipitarte y busca el equilibrio.`
      : `Dedica atención consciente a cómo integras esta nueva energía en tu día a día.`;

  return {
    simpleExplanation,
    practicalTip,
    activatedHouseArea: `${houseInfo.title}: ${houseInfo.sphere}`,
  };
}
