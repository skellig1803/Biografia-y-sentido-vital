import {
  HouseCusp,
  LunarNodeData,
  PlanetPosition,
  SeptenioData,
  YearOfLifeAnalysis,
  ZodiacSign,
} from '../types';

export const LUNAR_NODE_GUIDANCE: Record<
  ZodiacSign,
  {
    northDharma: string;
    northLesson: string;
    northAction: string;
    northStrengths: string[];
    southGifts: string;
    southTrap: string;
    southPatterns: string[];
  }
> = {
  Aries: {
    northDharma: 'Desarrollar la audacia del Yo, el liderazgo independiente y el coraje de iniciar caminos pioneros sin depender de la aprobación ajena.',
    northLesson: 'Aprender a confiar en tu propio impulso vital y defender tu verdad con determinación asertiva.',
    northAction: 'Atrévete a tomar decisiones individuales, fijar límites claros y emprender proyectos que reflejen tu identidad genuina.',
    northStrengths: ['Autonomía', 'Iniciativa valiente', 'Poder de decisión', 'Autenticidad sin filtros'],
    southGifts: 'Facilidad natural para la diplomacia, empatía relacional, búsqueda de armonía y capacidad de mediar.',
    southTrap: 'Dependencia del consenso ajeno, miedo al conflicto, postergarse por complacer a otros y perderse en la indecisión.',
    southPatterns: ['Autocomplacencia evasiva', 'Miedo a decepcionar', 'Fusión excesiva con la pareja'],
  },
  Tauro: {
    northDharma: 'Construir seguridad interna, cultivar la calma corporal, valorar la sencillez de la vida y forjar recursos propios estables.',
    northLesson: 'Aprender que tu verdadero valor reside en tu ser interior y en el ritmo orgánico de la naturaleza.',
    northAction: 'Crea rutinas nutritivas, conecta con los sentidos físicos, abraza la paciencia y genera autosuficiencia material y afectiva.',
    northStrengths: ['Paciencia serena', 'Solidez constructiva', 'Aprecio sensorial', 'Lealtad incondicional'],
    southGifts: 'Capacidad de percibir profundidades psicológicas, intuición magnética y fuerza para atravesar crisis regenerativas.',
    southTrap: 'Apego al drama emocional, sospecha constante, obsesión por el control ajeno y miedo a perder la intensidad tóxica.',
    southPatterns: ['Crisis auto-generadas', 'Tendencia al resentimiento', 'Control psicológico por miedo'],
  },
  Géminis: {
    northDharma: 'Cultivar la curiosidad abierta, la escucha atenta, la comunicación cotidiana y la flexibilidad mental.',
    northLesson: 'Descubrir que la verdad no es un dogma rígido, sino un diálogo vivo y constante con la realidad circundante.',
    northAction: 'Formula preguntas antes de emitir juicios categóricos, aprende habilidades prácticas y conecta con tu entorno inmediato.',
    northStrengths: ['Mente ágil', 'Comunicación empática', 'Curiosidad sin prejuicios', 'Adaptabilidad'],
    southGifts: 'Visión panorámica elevada, fe en ideales superiores, vocación filosófica y generosidad entusiasta.',
    southTrap: 'Arrogancia intelectual, creer tener la verdad absoluta, pontificar sin escuchar y desconectarse de los detalles concretos.',
    southPatterns: ['Dogmatismo', 'Fuga en generalizaciones teóricas', 'Impaciencia con lo cotidiano'],
  },
  Cáncer: {
    northDharma: 'Nutrir el santuario interior, honrar la vulnerabilidad emocional, crear hogar y cobijar a otros desde el corazón.',
    northLesson: 'Comprender que la sensibilidad afectiva no es debilidad, sino la máxima fuerza sanadora del alma.',
    northAction: 'Permítete sentir tus emociones sin juzgarlas, construye una base de intimidad cálida y cuida tu templo interior.',
    northStrengths: ['Cuidado protector', 'Inteligencia intuitiva', 'Calidez emocional', 'Empatía nutricia'],
    southGifts: 'Capacidad ejecutiva formidable, disciplina implacable, resiliencia y madurez para asumir grandes cargas públicas.',
    southTrap: 'Endurecimiento emocional, priorizar el estatus sobre los afectos, sobrecargar la espalda por miedo a fallar.',
    southPatterns: ['Acorazamiento defensivo', 'Obsesión por la productividad', 'Miedo a pedir ayuda'],
  },
  Leo: {
    northDharma: 'Despertar el fuego del corazón, irradiar creatividad genuina, liderar con calidez y celebrar tu brillo individual.',
    northLesson: 'Asumir el centro del escenario de tu propia vida sin falsas modestias, inspirando a la comunidad con tu pasión.',
    northAction: 'Exprésate artísticamente, juega con autenticidad infantil, comparte tu entusiasmo y atrévete a ser visto.',
    northStrengths: ['Generosidad solar', 'Creatividad apasionada', 'Dignidad noble', 'Capacidad de inspirar'],
    southGifts: 'Conciencia grupal igualitaria, originalidad visionaria, desapego objetivo y compromiso con causas sociales.',
    southTrap: 'Refugiarse en la masa para no arriesgarse a ser juzgado, frialdad emocional disfrazada de intelectualismo distante.',
    southPatterns: ['Esconderse en el colectivo', 'Miedo a la exposición personal', 'Cinismo intelectual'],
  },
  Virgo: {
    northDharma: 'Integrar la sabiduría del orden cotidiano, el discernimiento práctico, el cuidado de la salud y el servicio humilde y consciente.',
    northLesson: 'Entender que la espiritualidad no es evasión de la materia, sino consagración amorosa del día a día.',
    northAction: 'Establece rutinas que honren tu cuerpo y mente, aporta soluciones concretas a tu entorno y cultiva la precisión.',
    northStrengths: ['Claridad analítica', 'Vocación de servicio', 'Salud consciente', 'Eficiencia amorosa'],
    southGifts: 'Compasión oceánica, profunda sensibilidad mística, imaginación artística y conexión con lo invisible.',
    southTrap: 'Fantasía evasiva, victimismo, falta de límites personales y dispersión en la niebla de la incertidumbre.',
    southPatterns: ['Rescate de víctimas como salvador', 'Desorganización vital', 'Evasión de la realidad terrenal'],
  },
  Libra: {
    northDharma: 'Aprender el arte de la cooperación armónica, la escucha del prójimo, el equilibrio justo y la belleza compartida.',
    northLesson: 'Descubrir que el verdadero crecimiento del Yo se potencia a través del espejo sagrado de las relaciones.',
    northAction: 'Negocia con empatía, valora la perspectiva de los demás, cultiva alianzas honestas y embellece tu entorno vincular.',
    northStrengths: ['Diplomacia sagaz', 'Sentido de equidad', 'Capacidad de conciliar', 'Sensibilidad estética'],
    southGifts: 'Espíritu guerrero indómito, capacidad de supervivencia solitaria, iniciativa feroz y autoafirmación.',
    southTrap: 'Egocentrismo defensivo, impulsividad reactiva, actitud beligerante de "yo contra el mundo" y desdén por el otro.',
    southPatterns: ['Individualismo ciego', 'Impaciencia agresiva', 'Miedo a ceder terreno'],
  },
  Escorpio: {
    northDharma: 'Atreverse a bucear en la sombra, transmutar miedos ancestrales, regenerar el alma y abrazar la íntima vulnerabilidad compartida.',
    northLesson: 'Aprender a soltar lo conocido para renacer desde las cenizas, confiando en las fuerzas invisibles del espíritu.',
    northAction: 'Despréndete de apegos materiales rígidos, investiga tus verdades psicológicas y entrega tu confianza profunda.',
    northStrengths: ['Resiliencia alquímica', 'Verdad psicológica profunda', 'Fuerza regenerativa', 'Magnetismo transformador'],
    southGifts: 'Estabilidad práctica, goce de la belleza sensorial, constancia terrenal y don para generar recursos materiales.',
    southTrap: 'Aferrarse rígidamente a la comodidad material por miedo al cambio, inercia acumulativa y resistencia a la transformación.',
    southPatterns: ['Avaricia defensiva', 'Terquedad obstinada', 'Negación del cambio inevitable'],
  },
  Sagitario: {
    northDharma: 'Expandir la cosmovisión, conectar con la fe viva, explorar horizontes filosóficos y buscar el sentido trascendente del viaje humano.',
    northLesson: 'Confiar en la Providencia cósmica y atreverse a elevar la mirada más allá de las pequeñas dudas mundanas.',
    northAction: 'Estudia filosofías universales, viaja física o anímicamente, confía en tus corazonadas y guía a otros con optimismo sabio.',
    northStrengths: ['Optimismo trascendente', 'Visión de futuro', 'Entusiasmo vital', 'Sabiduría integradora'],
    southGifts: 'Agilidad mental brillante, destreza verbal, capacidad de procesamiento de datos y adaptabilidad social.',
    southTrap: 'Hiperracionalización paralizante, cotilleo banal, dispersión en mil detalles sin dirección y ansiedad mental.',
    southPatterns: ['Duda crónica', 'Sobrepensar sin compromiso', 'Superficialidad intelectual'],
  },
  Capricornio: {
    northDharma: 'Asumir la propia soberanía, madurar con templanza, construir proyectos de largo aliento y ser el guardián de tu propio destino.',
    northLesson: 'Aprender que la verdadera seguridad surge de la integridad moral, la responsabilidad personal y el trabajo paciente.',
    northAction: 'Define metas éticas a largo plazo, estructura tu tiempo, hazte cargo de tus decisiones y abraza tu autoridad interna.',
    northStrengths: ['Integridad intachable', 'Disciplina sabia', 'Liderazgo maduro', 'Constancia inquebrantable'],
    southGifts: 'Profunda empatía protectora, calidez de clan, conexión con los afectos tempranos y memoria sensible.',
    southTrap: 'Infantilismo emocional, culpar a la familia o al pasado por las limitaciones actuales, dependencia de protección externa.',
    southPatterns: ['Refugio en el rol de niño dependiente', 'Chantaje sentimental', 'Miedo a la adultez'],
  },
  Acuario: {
    northDharma: 'Poner los dones individuales al servicio de la fraternidad humana, innovar con ideales visionarios y defender la libertad.',
    northLesson: 'Comprender que tu genialidad personal cobra su sentido más noble cuando despierta y libera al colectivo.',
    northAction: 'Integra comunidades de bien común, piensa fuera de las estructuras convencionales y promueve una visión humanista igualitaria.',
    northStrengths: ['Conciencia universal', 'Pensamiento vanguardista', 'Fraternidad genuina', 'Originalidad sin ataduras'],
    southGifts: 'Carisma magnético, corazón generoso, liderazgo natural y capacidad para celebrar la vida.',
    southTrap: 'Deseo egolátrico de ser adorado, dramatismo para acaparar la atención, vanidad y desdén por el colectivo.',
    southPatterns: ['Búsqueda de aplauso constante', 'Orgullo herido', 'Autoritarismo emocional'],
  },
  Piscis: {
    northDharma: 'Rendirse al flujo del misterio cósmico, cultivar la compasión universal, desarrollar la intuición mística y perdonar con amor.',
    northLesson: 'Comprender que el control racional es una ilusión y que el alma florece cuando se une con la Totalidad divina.',
    northAction: 'Practica la meditación contemplativa, escucha la sabiduría de los sueños, relaja la necesidad de control y confía.',
    northStrengths: ['Compasión trascendente', 'Sensibilidad mística', 'Imaginación poética', 'Capacidad de perdón absoluto'],
    southGifts: 'Mente quirúrgica, impecabilidad técnica, discernimiento ético y gran capacidad para ordenar lo práctico.',
    southTrap: 'Crítica despiadada, obsesión neurótica por el perfeccionismo, hipocondría y parálisis por análisis.',
    southPatterns: ['Culpa y autoexigencia asfixiante', 'Juicio severo a los defectos ajenos', 'Ansiedad de control'],
  },
};

export const ANTHROPOSOPHIC_SEPTENIOS_BASE = [
  {
    number: 1,
    ageRange: '0 - 7 años',
    startAge: 0,
    endAge: 7,
    archetypalTitle: 'Cuerpo Físico y el Nido Familiar: "El mundo es bueno"',
    phase: 'Desarrollo Biológico-Corporal' as const,
    planetarySphere: 'Luna (Esfera del amparo y la gestación)',
    steinerConcept: 'Imitación reverente, maduración de los órganos vitales y establecimiento del arquetipo corporal.',
    coreQuestion: '¿Es el mundo un lugar seguro y amoroso donde encarnar?',
    description: 'El niño absorbe el entorno mediante la imitación inconsciente. Toda la energía del alma está volcada en la construcción del templo físico. Culmina con el cambio de la primera dentición (~7 años), signo visible de que las fuerzas formativas se liberan del cuerpo biológico para el aprendizaje.',
    ageSpecificChallenges: [
      'Construcción de confianza básica en la materia terrenal.',
      'Protección del organismo sensorial contra la sobreestimulación.',
      'Ritmo circadiano, sueño reparador y calor nutritivo.',
    ],
  },
  {
    number: 2,
    ageRange: '7 - 14 años',
    startAge: 7,
    endAge: 14,
    archetypalTitle: 'Cuerpo Etérico, Ritmo y Hábitos: "El mundo es bello"',
    phase: 'Desarrollo Biológico-Corporal' as const,
    planetarySphere: 'Mercurio (Esfera de la respiración, la metamorfosis y la memoria)',
    steinerConcept: 'Aprender por veneración a una autoridad amada, memoria rítmica y educación a través del arte.',
    coreQuestion: '¿Cómo se manifiesta la belleza y el orden armónico en el mundo?',
    description: 'El cuerpo etérico florece. El niño necesita guías sabios que encarnen la justicia y la bondad. A los 9-10 años atraviesa el hito del "Rubicón": la primera vivencia de soledad y separación entre el Yo y el cosmos, preludio indispensable para la futura autoconciencia. Termina en la pubertad.',
    ageSpecificChallenges: [
      'Navegación del Rubicón (9 años): sentimiento de soledad y separación del entorno.',
      'Creación de hábitos y ritmos de vida saludables.',
      'Transformación de las imágenes poéticas en memoria viva.',
    ],
  },
  {
    number: 3,
    ageRange: '14 - 21 años',
    startAge: 14,
    endAge: 21,
    archetypalTitle: 'Cuerpo Astral y Nacimiento del Juicio: "El mundo es verdadero"',
    phase: 'Desarrollo Biológico-Corporal' as const,
    planetarySphere: 'Venus (Esfera del despertar afectivo, las pasiones y los ideales)',
    steinerConcept: 'Nacimiento del cuerpo astral, despertar de la sexualidad, búsqueda de ideales puros y verdad moral.',
    coreQuestion: '¿Cuál es la verdad del mundo y qué ideales merecen mi compromiso?',
    description: 'El torrente de las emociones astrales despierta con fuerza. Surge la necesidad de confrontar lo establecido y hallar modelos auténticos. A los 18.6 años se produce el primer Retorno del Nodo Lunar, sembrando la primera gran inquietud vocacional del alma. Culmina a los 21 años con el nacimiento del Yo terrenal.',
    ageSpecificChallenges: [
      'Manejo del torbellino emocional y la identidad sexual.',
      'Hito de los 18.6 años: primer retorno nodal lunar y presentimiento de la vocación del alma.',
      'Conquista del juicio propio sin caer en el cinismo o el nihilismo.',
    ],
  },
  {
    number: 4,
    ageRange: '21 - 28 años',
    startAge: 21,
    endAge: 28,
    archetypalTitle: 'Alma Sensible: Salida al Mundo y Experiencia Terrenal',
    phase: 'Desarrollo Anímico-Psicológico' as const,
    planetarySphere: 'Sol (Fuerza del Yo encarnado y vitalidad solar)',
    steinerConcept: 'Empfindungsseele (Alma Sensible): vivencia directa de la simpatía y la antipatía, primeros pasos independientes en la sociedad.',
    coreQuestion: '¿Quién soy yo frente al mundo y cómo navego mis deseos y vínculos?',
    description: 'Con el Yo ya nacido a los 21 años, el ser humano se lanza al mundo con vehemencia. Se exploran amores, profesiones y límites sin miedo. A los 27-28 años se manifiesta la "crisis de los 28", umbral en que los sueños juveniles chocan con el principio de realidad y anuncian la llegada de Saturno.',
    ageSpecificChallenges: [
      'Diferenciar las pulsiones egoicas de la verdadera dirección del alma.',
      'Superar la polaridad ingenua entre simpatía ciega y rechazo reactivo.',
      'Umbral de los 27-28 años: preparación para la madurez real y el peso de la responsabilidad.',
    ],
  },
  {
    number: 5,
    ageRange: '28 - 35 años',
    startAge: 28,
    endAge: 35,
    archetypalTitle: 'Alma Racional / Intelectiva: Estructura, Consolidad y Año Crístico',
    phase: 'Desarrollo Anímico-Psicológico' as const,
    planetarySphere: 'Marte (Fuerza de afirmación, discernimiento y batalla interior)',
    steinerConcept: 'Verstandesseele (Alma Intelectiva / Racional): organización mental, dominio de la vida práctica y crisis del Año Crístico.',
    coreQuestion: '¿Qué cimientos perdurables estoy edificando con mi propia vida?',
    description: 'A los 29.5 años ocurre el primer Retorno de Saturno: la vida exige rendición de cuentas, madurez y renuncia a lo ilusorio. A los 33 años se alcanza el punto culminante del alma humana: el Año Crístico, donde el hombre antiguo muere simbólicamente para dar paso a una vocación más noble y libre.',
    ageSpecificChallenges: [
      'Retorno de Saturno (29-30 años): asumir la adultez definitiva y soltar las fantasías adolescentes.',
      'Hito de los 33 años: el punto de inflexión del corazón; crisis de sentido existencial.',
      'Equilibrio entre la ambición material y la integridad moral.',
    ],
  },
  {
    number: 6,
    ageRange: '35 - 42 años',
    startAge: 35,
    endAge: 42,
    archetypalTitle: 'Alma Consciente: Autenticidad Radical y Nadir Biográfico',
    phase: 'Desarrollo Anímico-Psicológico' as const,
    planetarySphere: 'Júpiter (Expansión de la conciencia ética y visión filosófica)',
    steinerConcept: 'Bewusstseinsseele (Alma Consciente): despojo de las máscaras sociales, verdad ante uno mismo y la gran encrucijada de la mitad de vida.',
    coreQuestion: '¿Quién soy yo cuando nadie me mira y qué huella quiero dejar?',
    description: 'Las fuerzas biológicas ya no empujan automáticamente hacia arriba; la biología comienza su lento declive para que las fuerzas espirituales puedan ascender. A los 37.2 años ocurre el segundo Retorno del Nodo Lunar (recalibración del destino). Hacia los 40-42 años sobreviene la gran crisis de la mitad de vida (oposición de Urano).',
    ageSpecificChallenges: [
      'Segundo retorno nodal (37 años): ajuste de cuentas con la misión del alma.',
      'La crisis de los 40-42 años (oposición de Urano): necesidad volcánica de ser genuino.',
      'Aceptar que el valor de la vida ya no radica en la aprobación externa sino en la verdad íntima.',
    ],
  },
  {
    number: 7,
    ageRange: '42 - 49 años',
    startAge: 42,
    endAge: 49,
    archetypalTitle: 'Yo Espiritual (Manas): Creatividad Renovada y Traspaso de Fuerzas',
    phase: 'Desarrollo Espiritual-Moral' as const,
    planetarySphere: 'Saturno (Sabiduría de la experiencia destilada y templanza)',
    steinerConcept: 'Manas / Yo Espiritual: las fuerzas etéricas que antes sostenían la juventud se metamorfosean en pensamiento creativo y devoción.',
    coreQuestion: '¿Cómo entrego mis dones al mundo desde un amor libre y desinteresado?',
    description: 'Comienza la fase espiritual de la biografía. Ya no se trata de conquistar el mundo, sino de bendecirlo y recrearlo. Se despierta una nueva creatividad que nace del alma liberada de la ambición ciega. Hacia los 49-50 años se produce el retorno de Quirón, sanando la herida originaria.',
    ageSpecificChallenges: [
      'Retorno de Quirón (~50 años): reconciliación con la herida que te hizo sabio.',
      'Superar la tentación de aferrarse a la juventud física perdida.',
      'Apertura a nuevas formas de arte, filosofía y servicio comunitario.',
    ],
  },
  {
    number: 8,
    ageRange: '49 - 56 años',
    startAge: 49,
    endAge: 56,
    archetypalTitle: 'Espíritu de Vida (Budhi): Escucha Profunda y Sabiduría Serena',
    phase: 'Desarrollo Espiritual-Moral' as const,
    planetarySphere: 'Urano (Intuición pura, fraternidad y visión cósmica)',
    steinerConcept: 'Budhi / Espíritu de Vida: pacificación de las pasiones astrales, capacidad de escuchar sin proyectar y mentoreo a nuevas generaciones.',
    coreQuestion: '¿Puedo contemplar la vida con serenidad, sin pretender controlar el cauce del río?',
    description: 'A los 55.8 años se manifiesta el tercer Retorno del Nodo Lunar, ofreciendo una visión panorámica de la trama del destino kármico. La persona se convierte en un faro para los demás: su sola presencia irradia templanza y comprensión compasiva de las debilidades humanas.',
    ageSpecificChallenges: [
      'Tercer retorno nodal lunar (~56 años): integración de los hilos de la vocación kármica.',
      'Trascendencia del ego personal en favor del bien común.',
      'Cultivo de la paz mental ante las pérdidas inevitables del camino terrenal.',
    ],
  },
  {
    number: 9,
    ageRange: '56 - 63 años',
    startAge: 56,
    endAge: 63,
    archetypalTitle: 'Hombre Espíritu (Atma): Cosecha Arquetípica y Segundo Saturno',
    phase: 'Desarrollo Espiritual-Moral' as const,
    planetarySphere: 'Neptuno (Trascendencia espiritual, perdón y misticismo vivo)',
    steinerConcept: 'Atma / Hombre Espíritu: culminación de la gran tríada septenaria. Síntesis de la biografía como obra de arte.',
    coreQuestion: '¿Cuál es el legado espiritual y moral que ofrendo al porvenir humano?',
    description: 'A los 58-60 años sobreviene el segundo Retorno de Saturno: la consagración del sabio y maestro de vida. Se evalúa el ciclo completo de la encarnación con gratitud. A los 63 años finaliza la estructura formal de 9 septenios, alcanzando la condición de "hombre libre".',
    ageSpecificChallenges: [
      'Segundo Retorno de Saturno (59 años): asunción de la maestría interior sin amargura.',
      'Cierre de ciclos kármicos pendientes y perdón consciente.',
      'Preparación de una herencia no solo material, sino espiritual e inspiradora.',
    ],
  },
  {
    number: 10,
    ageRange: '63+ años',
    startAge: 63,
    endAge: 120,
    archetypalTitle: 'Sabiduría Cósmica y Gracia Espiritual: La Vida Libre',
    phase: 'Desarrollo Espiritual-Moral' as const,
    planetarySphere: 'Plutón / El Cosmos Solar (Comunión con los arquetipos eternos)',
    steinerConcept: 'Etapa de donación y libertad sagrada. Cada día vivido a partir de los 63 años es un regalo de la Providencia.',
    coreQuestion: '¿Cómo acompaño al cosmos en su continuo renacer desde la quietud del alma?',
    description: 'En esta etapa, la persona ya no vive condicionada por las necesidades biológicas o los mandatos sociales. Puede actuar como protector espiritual de su linaje y consejero sabio para el mundo, manteniendo un puente vivo entre el cielo y la tierra.',
    ageSpecificChallenges: [
      'Mantener viva la chispa de la curiosidad y la alegría en el espíritu.',
      'Vivir en gratitud continua y comunión con lo trascendente.',
      'Entrega serena de las fuerzas a la memoria cósmica.',
    ],
  },
];

export function calculateExactAge(
  birthDateStr: string,
  birthTimeStr: string,
  currentDate: Date = new Date()
): { years: number; months: number; days: number; totalDays: number; formatted: string } {
  const [bYear, bMonth, bDay] = birthDateStr.split('-').map(Number);
  const [bHour, bMin] = birthTimeStr.split(':').map(Number);

  const birthMoment = new Date(bYear, bMonth - 1, bDay, bHour || 12, bMin || 0);
  const diffMs = currentDate.getTime() - birthMoment.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let years = currentDate.getFullYear() - bYear;
  let months = currentDate.getMonth() - (bMonth - 1);
  let days = currentDate.getDate() - bDay;

  if (days < 0) {
    months -= 1;
    // previous month length
    const prevMonthLastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const formatted = `${years} años, ${months} meses y ${days} días`;
  return { years, months, days, totalDays, formatted };
}

// Generate the complete Anthroposophic Septenio data for the user
export function calculateSeptenioData(
  exactAgeYears: number,
  exactAgeMonths: number
): { currentSeptenio: SeptenioData; allSeptenios: SeptenioData[] } {
  const allSeptenios: SeptenioData[] = ANTHROPOSOPHIC_SEPTENIOS_BASE.map((base) => {
    const isCurrent = exactAgeYears >= base.startAge && exactAgeYears < base.endAge;
    let progressPct = 0;
    if (exactAgeYears >= base.endAge) {
      progressPct = 100;
    } else if (isCurrent) {
      const yearInCycle = exactAgeYears - base.startAge + exactAgeMonths / 12;
      const span = base.endAge - base.startAge;
      progressPct = Math.min(100, Math.max(0, Math.round((yearInCycle / span) * 100)));
    }

    const milestones = [
      { age: 9, title: 'El Rubicón', description: 'Primera vivencia de soledad y separación del entorno terrenal.', isPast: exactAgeYears >= 9.5, isCurrent: Math.abs(exactAgeYears - 9) <= 0.8 },
      { age: 18.6, title: '1er Retorno Nodal Lunar', description: 'Primer llamado intuitivo a la vocación del alma.', isPast: exactAgeYears >= 19, isCurrent: Math.abs(exactAgeYears - 18.6) <= 0.8 },
      { age: 21, title: 'Nacimiento del Yo', description: 'Llegada de la mayoría de edad antroposófica y autogobierno.', isPast: exactAgeYears >= 21.5, isCurrent: Math.abs(exactAgeYears - 21) <= 0.8 },
      { age: 28, title: 'Crisis de los 28', description: 'Cierre del impulso juvenil y preparación para la madurez real.', isPast: exactAgeYears >= 28.5, isCurrent: Math.abs(exactAgeYears - 28) <= 0.8 },
      { age: 29.5, title: 'Primer Retorno de Saturno', description: 'Consolidación de la estructura vital y asunción de límites.', isPast: exactAgeYears >= 30.5, isCurrent: Math.abs(exactAgeYears - 29.5) <= 1.0 },
      { age: 33, title: 'Año Crístico', description: 'Muerte del hombre antiguo y renacimiento de sentido interior.', isPast: exactAgeYears >= 33.8, isCurrent: Math.abs(exactAgeYears - 33) <= 0.8 },
      { age: 37.2, title: '2do Retorno Nodal Lunar', description: 'Recalibración del destino kármico y rectificación del rumbo.', isPast: exactAgeYears >= 38, isCurrent: Math.abs(exactAgeYears - 37.2) <= 0.8 },
      { age: 41, title: 'Oposición de Urano / Encrucijada de los 42', description: 'Búsqueda inapelable de autenticidad; traspaso biológico a espiritual.', isPast: exactAgeYears >= 42.5, isCurrent: Math.abs(exactAgeYears - 41.5) <= 1.2 },
      { age: 50, title: 'Retorno de Quirón', description: 'Sanación de la herida primaria y entrega compasiva.', isPast: exactAgeYears >= 50.8, isCurrent: Math.abs(exactAgeYears - 50) <= 0.8 },
      { age: 55.8, title: '3er Retorno Nodal Lunar', description: 'Síntesis madura de los hilos de la vocación del alma.', isPast: exactAgeYears >= 56.5, isCurrent: Math.abs(exactAgeYears - 55.8) <= 0.8 },
      { age: 59, title: 'Segundo Retorno de Saturno', description: 'Maestría de vida cosechada y bendición a las nuevas generaciones.', isPast: exactAgeYears >= 60.5, isCurrent: Math.abs(exactAgeYears - 59) <= 1.2 },
      { age: 63, title: 'Culminación de los Septenios', description: 'Entrada en el estado de gracia, libertad y entrega sagrada.', isPast: exactAgeYears >= 64, isCurrent: Math.abs(exactAgeYears - 63) <= 1.0 },
    ].filter((m) => m.age >= base.startAge && m.age < base.endAge);

    return {
      ...base,
      progressPct,
      currentMilestones: milestones,
    };
  });

  const currentSeptenio =
    allSeptenios.find((s) => exactAgeYears >= s.startAge && exactAgeYears < s.endAge) ||
    allSeptenios[allSeptenios.length - 1];

  return { currentSeptenio, allSeptenios };
}

// Generate the Lunar Node Guidance
export function calculateLunarNodeData(
  northNodePosition: PlanetPosition,
  southNodePosition: PlanetPosition,
  exactAgeYears: number
): LunarNodeData {
  const northGuide = LUNAR_NODE_GUIDANCE[northNodePosition.sign];
  const southGuide = LUNAR_NODE_GUIDANCE[southNodePosition.sign];

  const nodalCycleYears = 18.61;
  const cyclesCompleted = Math.floor(exactAgeYears / nodalCycleYears);
  const nextNodalReturnAge = Number(((cyclesCompleted + 1) * nodalCycleYears).toFixed(1));
  const yearsUntilReturn = Number(Math.max(0, nextNodalReturnAge - exactAgeYears).toFixed(1));

  let cycleMeaning = '';
  if (cyclesCompleted === 0) {
    cycleMeaning = 'Te encuentras en tu primer ciclo nodal de vida. El alma está ensayando sus primeros pasos conscientes en la dirección de su llamado.';
  } else if (cyclesCompleted === 1) {
    cycleMeaning = 'Te encuentras en tu segundo ciclo nodal (entre los 18.6 y los 37.2 años). Es la etapa de mayor concreción terrenal del propósito kármico.';
  } else if (cyclesCompleted === 2) {
    cycleMeaning = 'Te encuentras en tu tercer ciclo nodal (entre los 37.2 y los 55.8 años). Las lecciones se interiorizan como sabiduría y mentoreo desinteresado.';
  } else {
    cycleMeaning = 'Te encuentras en tu cuarto ciclo nodal superior. Vives la síntesis luminosa de tu destino cósmico.';
  }

  return {
    northNode: {
      sign: northNodePosition.sign,
      house: northNodePosition.house,
      degree: northNodePosition.degreeInSign,
      minute: northNodePosition.minuteInSign,
      symbol: '☊',
      dharmaDirection: northGuide.northDharma,
      soulLesson: northGuide.northLesson,
      evolutionaryAction: northGuide.northAction,
      strengthsToCultivate: northGuide.northStrengths,
    },
    southNode: {
      sign: southNodePosition.sign,
      house: southNodePosition.house,
      degree: southNodePosition.degreeInSign,
      minute: southNodePosition.minuteInSign,
      symbol: '☋',
      pastLifeGifts: southGuide.southGifts,
      comfortZoneTrap: southGuide.southTrap,
      patternsToRelease: southGuide.southPatterns,
    },
    nodalCycle: {
      currentAgeYears: exactAgeYears,
      nextNodalReturnAge,
      yearsUntilReturn,
      cycleMeaning,
    },
  };
}

// Calculate the General Analysis for the current Year of Life (Análisis general del año de vida)
export function calculateYearOfLifeAnalysis(
  exactAgeYears: number,
  ascendantSign: ZodiacSign,
  planets: PlanetPosition[],
  houses?: HouseCusp[]
): YearOfLifeAnalysis {
  const completedYears = exactAgeYears;
  const currentYearOfLife = completedYears + 1; // e.g. 35 years completed = 36th year of life

  // Annual Profection House = (completedYears % 12) + 1
  const profectionHouse = (completedYears % 12) + 1;

  // Determine sign of that profection house from Placidus cusps or default zodiacal order
  let profectionSign: ZodiacSign;
  if (houses && houses.length === 12 && houses[profectionHouse - 1]) {
    profectionSign = houses[profectionHouse - 1].sign;
  } else {
    const zodiacOrder: ZodiacSign[] = [
      'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
      'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'
    ];
    const ascIndex = zodiacOrder.indexOf(ascendantSign);
    const profectionSignIndex = (ascIndex + (profectionHouse - 1)) % 12;
    profectionSign = zodiacOrder[profectionSignIndex];
  }

  // Traditional Ruler (Lord of the Year)
  const signRulers: Record<ZodiacSign, string> = {
    Aries: 'Marte',
    Tauro: 'Venus',
    Géminis: 'Mercurio',
    Cáncer: 'Luna',
    Leo: 'Sol',
    Virgo: 'Mercurio',
    Libra: 'Venus',
    Escorpio: 'Marte / Plutón',
    Sagitario: 'Júpiter',
    Capricornio: 'Saturno',
    Acuario: 'Saturno / Urano',
    Piscis: 'Júpiter / Neptuno',
  };
  const lordOfYear = signRulers[profectionSign];

  const houseThemes: Record<number, { theme: string; energy: string; directives: string[]; recommendations: string[] }> = {
    1: {
      theme: 'Año de Inicio y Reinvención del Yo: El Cuerpo y la Identidad',
      energy: 'Inicias un nuevo ciclo de 12 años. La energía está concentrada en tu vitalidad física, tus elecciones personales y tu proyección al mundo.',
      directives: [
        'Prioriza tu autocuidado y vitalidad física.',
        'Atrévete a renovar tu imagen y tu forma de decir "Aquí estoy".',
        'Siembra intenciones claras para la década venidera.',
      ],
      recommendations: [
        'Realiza ejercicio consciente que conecte cuerpo y respiración.',
        'Define tus metas individuales sin depender de la aprobación de terceros.',
      ],
    },
    2: {
      theme: 'Año de Consolidación Material y Autoestima: Valor y Sustento',
      energy: 'El foco vital se orienta hacia la administración de tus recursos materiales, la autovaloración y la creación de estabilidad económica.',
      directives: [
        'Revisa tu relación con el dinero y el merecimiento interior.',
        'Potencia tus talentos innatos para generar abundancia duradera.',
        'Evita gastos impulsivos basados en vacíos emocionales.',
      ],
      recommendations: [
        'Elabora un plan financiero realista y ordenado.',
        'Valora tus dones profesionales sin regalar tu tiempo.',
      ],
    },
    3: {
      theme: 'Año de Aprendizaje, Comunicación y Entorno Inmediato',
      energy: 'La mente se acelera con curiosidad renovada. Es un año excelente para estudiar, escribir, mejorar vínculos con hermanos y vecinos, y realizar viajes cortos.',
      directives: [
        'Inicia estudios o talleres de habilidades prácticas.',
        'Cuida la claridad y empatía en tu comunicación diaria.',
        'Abre espacio para el diálogo sincero con tu círculo más cercano.',
      ],
      recommendations: [
        'Dedica tiempo a la lectura reflexiva y la escritura de tus ideas.',
        'Evita la dispersión mental enfocándote en proyectos concretos.',
      ],
    },
    4: {
      theme: 'Año del Hogar, Raíces Familiares y Santuario Interior',
      energy: 'La mirada se repliega hacia el nido, las raíces biográficas y el refugio emocional. Posibles mudanzas, remodelaciones o sanación de memorias de la infancia.',
      directives: [
        'Crea orden, calidez y belleza en tu espacio habitacional.',
        'Revisa mandatos ancestrales familiares para conservar lo noble y soltar lo limitante.',
        'Permítete reposar y recargar tus fuerzas en la intimidad.',
      ],
      recommendations: [
        'Comparte tiempo de calidad y ternura con los seres queridos.',
        'Diseña un rincón especial de paz y meditación en tu hogar.',
      ],
    },
    5: {
      theme: 'Año de Creatividad, Gozo Vital y Autoexpresión del Corazón',
      energy: 'El alma pide jugar, amar y crear. Se despiertan proyectos artísticos, romances inspiradores o relaciones estrechas y gozosas con hijos.',
      directives: [
        'Dedica tiempo semanal a tus pasiones artísticas y recreativas.',
        'Ábrete al placer y al entusiasmo sin culpa.',
        'Muestra tu brillo individual con generosidad y dignidad.',
      ],
      recommendations: [
        'Inicia aquel proyecto creativo que siempre postergabas.',
        'Conecta con la espontaneidad y pureza de tu niño interior.',
      ],
    },
    6: {
      theme: 'Año de Hábitos, Salud, Rutina Consciente y Servicio',
      energy: 'Un periodo de ajuste fino y purificación. Demanda prestar atención a las señales del cuerpo, mejorar la alimentación y ordenar el trabajo diario.',
      directives: [
        'Establece ritmos de vida predecibles y armoniosos.',
        'Purifica tu alimentación y cuida el descanso etérico.',
        'Encuentra significado sagrado en las pequeñas tareas cotidianas.',
      ],
      recommendations: [
        'Consulta chequeos preventivos de salud.',
        'Aprende a decir no a sobrecargas laborales innecesarias.',
      ],
    },
    7: {
      theme: 'Año de Relaciones, Espejo Vincular y Alianzas Clave',
      energy: 'El eje de la vida se sitúa en los compromisos de pareja, sociedades profesionales y contratos humanos profundos.',
      directives: [
        'Aprende a negociar con equidad sin anular tus necesidades.',
        'Observa qué cualidades del otro estás proyectando sin reconocer en ti.',
        'Forja alianzas basadas en el respeto mutuo y la honestidad.',
      ],
      recommendations: [
        'Cultiva el diálogo asertivo y la escucha atenta en la pareja.',
        'Clarifica acuerdos por escrito en sociedades laborales.',
      ],
    },
    8: {
      theme: 'Año de Transformación Profunda, Regeneración y Soltar Apegos',
      energy: 'Un año alquímico de muda de piel. Cierres kármicos, revisión de finanzas compartidas, superación de temores y renacimiento psicológico.',
      directives: [
        'Acepta los finales necesarios como antesala de un nuevo nacimiento.',
        'Trabaja en sanar heridas del pasado mediante terapia o introspección.',
        'Ordena deudas, herencias o acuerdos económicos compartidos.',
      ],
      recommendations: [
        'Practica el desapego material y la meditación profunda.',
        'Confía en tu resiliencia para resurgir con mayor entereza.',
      ],
    },
    9: {
      theme: 'Año de Expansión de Conciencia, Sabiduría y Horizontes Lejanos',
      energy: 'Un soplo de aire fresco y optimismo. Es propicio para viajes largos, estudios superiores, espiritualidad y renovación del sentido vital.',
      directives: [
        'Abre tu mente a cosmovisiones y filosofías inspiradoras.',
        'Planifica viajes o experiencias que ensanchen tu perspectiva del mundo.',
        'Comparte tu sabiduría con otros como guía o docente.',
      ],
      recommendations: [
        'Inscríbete en cursos que eleven tu espíritu.',
        'Mantén la fe viva en el propósito superior de tu biografía.',
      ],
    },
    10: {
      theme: 'Año de Cosecha Profesional, Reconocimiento y Vocación Pública',
      energy: 'Llegas a la cumbre visible de la montaña. Tus esfuerzos anteriores reciben atención, asumes mayores responsabilidades o redefines tu profesión.',
      directives: [
        'Asume tu liderazgo con humildad e impecabilidad ética.',
        'Alinea tu actividad laboral con tus valores más sagrados.',
        'Construye tu reputación con paciencia y maestría.',
      ],
      recommendations: [
        'Establece metas de largo alcance en tu carrera.',
        'Reconoce y agradece a quienes han sido tus mentores en el camino.',
      ],
    },
    11: {
      theme: 'Año de Amistades, Ideales Colectivos y Visión de Futuro',
      energy: 'El foco se amplía hacia la comunidad, los grupos con afinidad de ideales y los sueños de largo plazo para la humanidad.',
      directives: [
        'Rodéate de personas que eleven tu vibración y compartan tus principios.',
        'Participa en redes o proyectos colaborativos de beneficio común.',
        'Atrévete a soñar en grande sin temor a lo poco convencional.',
      ],
      recommendations: [
        'Nutre los lazos de amistad genuina.',
        'Plantea innovaciones originales en tu entorno.',
      ],
    },
    12: {
      theme: 'Año de Cierre Kármico, Retiro Interior y Gestación Silenciosa',
      energy: 'Último año del ciclo de 12 años. Se impone el descanso, la culminación de etapas que ya cumplieron su propósito y la preparación espiritual para el nuevo inicio.',
      directives: [
        'Permítete momentos de silencio, retiro y contemplación.',
        'Perdona viejos rencores para entrar liviano al próximo ciclo.',
        'Evita forzar nuevos proyectos antes de tiempo; es tiempo de gestar en la sombra.',
      ],
      recommendations: [
        'Practica yoga, meditación o paseos en soledad en la naturaleza.',
        'Agradece todas las experiencias vividas en los últimos 12 años.',
      ],
    },
  };

  const houseData = houseThemes[profectionHouse];

  return {
    completedYears,
    currentYearOfLife,
    profectionHouse,
    profectionSign,
    lordOfYear,
    annualCoreTheme: houseData.theme,
    anthroposophicYearEnergy: houseData.energy,
    keyDirectives: houseData.directives,
    vitalRecommendations: houseData.recommendations,
  };
}
