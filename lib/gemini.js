import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Cargar variables de entorno si están disponibles en local
dotenv.config();

/**
 * Esquema JSON estricto para la respuesta estructurada de Gemini.
 * Garantiza el retorno exacto de:
 * {
 *   hilos_conductores: string[],
 *   septenio_analizado: string,
 *   sintesis_salutogenica: string
 * }
 */
export const biographicalResponseSchema = {
  type: Type.OBJECT,
  properties: {
    hilos_conductores: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description:
        'Patrones arquetípicos, motivos recurrentes y temas transversales del destino que conectan las vivencias y crisis del septenio.',
    },
    septenio_analizado: {
      type: Type.STRING,
      description:
        'Identificación, fase evolutiva y rango de edad del septenio analizado (ej. "Tercer Septenio (14-21 años) - Nacimiento del Cuerpo Astral").',
    },
    sintesis_salutogenica: {
      type: Type.STRING,
      description:
        'Lectura comprensiva orientada a la salutogénesis (comprensibilidad, manejabilidad y sentido vital), identificando recursos de resiliencia, salud anímica y aprendizaje biográfico.',
    },
  },
  required: ['hilos_conductores', 'septenio_analizado', 'sintesis_salutogenica'],
  propertyOrdering: ['septenio_analizado', 'hilos_conductores', 'sintesis_salutogenica'],
};

/**
 * Inicializa y obtiene una instancia del cliente oficial de Google GenAI.
 * @param {string} [apiKey] - Clave opcional de API. Si no se provee, toma process.env.GEMINI_API_KEY.
 * @returns {GoogleGenAI}
 */
export function getGeminiClient(
  apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GEMINI_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.gemini_api_key ||
    ''
  ).trim().replace(/^["']|["']$/g, '')
) {
  if (!apiKey || apiKey.length < 5) {
    throw new Error(
      'GEMINI_API_KEY no está configurada. Por favor define la variable de entorno GEMINI_API_KEY en tu archivo .env o en el panel de Vercel (y recuerda Redesplegar/Redeploy tu proyecto en Vercel).'
    );
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Sistema de instrucción base enfocado en biografía antroposófica y salutogénesis.
 */
export const BIOGRAPHY_SYSTEM_INSTRUCTION = `Eres un asesor biográfico experto en Antroposofía (metodología de Rudolf Steiner, Gudrun Burkhard y Bernard Lievegoed) y en el enfoque Salutogénico (Aaron Antonovsky).
Tu tarea es analizar las entradas vitales de una persona organizadas por septenios y devolver un análisis estructurado.
Debes:
1. Identificar con precisión el septenio analizado y su polaridad o leyes biográficas (ej. septenios del cuerpo físico, etérico, astral, alma sensible, alma racional, alma consciente, etc.).
2. Detectar los "hilos conductores" (hilos rojos o motivos del destino) que revelan continuidades, transformaciones y aprendizajes latentes a través de las experiencias narradas.
3. Formular una "síntesis salutogénica" centrada en el Sentido de Coherencia:
   - Comprensibilidad: Cómo ordenar cognitivamente lo vivido sin juicio ni patologización.
   - Manejabilidad: Qué fuerzas internas, personas encuentro o recursos anímicos permitieron o permiten sostener la vivencia.
   - Significatividad (Sentido Vital): Qué propósito, valor o dirección evolutiva aporta esta etapa al desarrollo del Yo y la biografía integral.`;

/**
 * Lista priorizada de modelos de Gemini con degradación elegante (fallback).
 * Se inicia con Gemini 3.8 Flash (más reciente y capaz) y, si falla por cuota,
 * disponibilidad o error de API, conmuta automáticamente a versiones previas.
 */
export const GEMINI_FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
];

/**
 * Envoltorio con timeout para evitar peticiones bloqueadas indefinidamente.
 * @param {Promise} promise
 * @param {number} ms
 * @param {string} errorMsg
 */
function withTimeout(promise, ms, errorMsg) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg || `Timeout tras ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Analiza entradas biográficas organizadas por septenios y retorna una respuesta estructurada en formato JSON.
 * Si el modelo principal (gemini-3.8-flash) no responde o genera un error, intenta automáticamente
 * con las versiones previas de Gemini en cascada.
 *
 * @param {Array<Object>|Object|string} septeniosData - Registro de vivencias, eventos y notas del septenio o septenios a evaluar.
 * @param {Object} [options] - Parámetros de configuración opcionales.
 * @param {string} [options.model] - Modelo preferente inicial (por defecto 'gemini-3.8-flash').
 * @param {string[]} [options.fallbackModels] - Lista personalizada de modelos para fallback.
 * @param {number} [options.timeoutMs=25000] - Tiempo máximo de espera por cada intento de modelo.
 * @param {string} [options.apiKey] - Clave de API de Gemini (por defecto: process.env.GEMINI_API_KEY).
 * @param {string} [options.systemInstruction] - Instrucción del sistema personalizada.
 * @param {Object} [options.contextoAdicional] - Información adicional (fecha de nacimiento, profesión, etc.).
 * @returns {Promise<{hilos_conductores: string[], septenio_analizado: string, sintesis_salutogenica: string, modelo_utilizado: string}>}
 */
export async function analyzeBiographicalSeptenios(septeniosData, options = {}) {
  const {
    model = 'gemini-3.8-flash',
    fallbackModels = GEMINI_FALLBACK_MODELS,
    timeoutMs = 25000,
    apiKey = process.env.GEMINI_API_KEY,
    systemInstruction = BIOGRAPHY_SYSTEM_INSTRUCTION,
    contextoAdicional = null,
  } = options;

  const client = getGeminiClient(apiKey);

  // Formatear las entradas biográficas recibidas
  let formattedInput = '';
  if (typeof septeniosData === 'string') {
    formattedInput = septeniosData;
  } else {
    formattedInput = JSON.stringify(septeniosData, null, 2);
  }

  const prompt = `Analiza las siguientes entradas biográficas del consultante y extrae el septenio analizado, los hilos conductores y la síntesis salutogénica:

=== ENTRADAS BIOGRÁFICAS ===
${formattedInput}

${
  contextoAdicional
    ? `=== CONTEXTO ADICIONAL DEL CONSULTANTE ===\n${JSON.stringify(contextoAdicional, null, 2)}\n`
    : ''
}
Asegúrate de estructurar la respuesta respetando fielmente el esquema JSON requerido.`;

  // Construir lista ordenada de modelos a probar (el modelo indicado primero, seguido de los fallbacks sin duplicar)
  const candidateModels = [
    model,
    ...fallbackModels.filter((m) => m !== model),
  ];

  let lastError = null;

  for (const currentModel of candidateModels) {
    try {
      console.log(`[Gemini] Consultando análisis biográfico estructurado con modelo: ${currentModel}...`);

      const response = await withTimeout(
        client.models.generateContent({
          model: currentModel,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema: biographicalResponseSchema,
          },
        }),
        timeoutMs,
        `Timeout de ${timeoutMs / 1000}s excedido en modelo ${currentModel}`
      );

      const outputText = response?.text;
      if (!outputText || !outputText.trim()) {
        throw new Error(`El modelo ${currentModel} retornó una respuesta vacía.`);
      }

      // Parsear el JSON garantizado por el esquema
      const parsed = JSON.parse(outputText.trim());

      console.log(`[Gemini] Análisis biográfico generado con éxito mediante ${currentModel}`);

      return {
        hilos_conductores: Array.isArray(parsed.hilos_conductores) ? parsed.hilos_conductores : [],
        septenio_analizado: parsed.septenio_analizado || '',
        sintesis_salutogenica: parsed.sintesis_salutogenica || '',
        modelo_utilizado: currentModel,
      };
    } catch (err) {
      console.warn(
        `[Gemini] Falló el intento con ${currentModel} (${err?.message || err}). Conmutando al siguiente modelo previo...`
      );
      lastError = err;
    }
  }

  console.error('[Gemini] Todos los modelos en cascada fallaron:', candidateModels);
  throw new Error(
    `Todos los modelos de Gemini fallaron tras evaluar la cascada (${candidateModels.join(', ')}). Último error: ${lastError?.message || lastError}`
  );
}

export default {
  biographicalResponseSchema,
  GEMINI_FALLBACK_MODELS,
  getGeminiClient,
  BIOGRAPHY_SYSTEM_INSTRUCTION,
  analyzeBiographicalSeptenios,
};
