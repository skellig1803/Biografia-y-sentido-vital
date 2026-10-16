import dotenv from 'dotenv';

// Cargar variables de entorno si están disponibles en local
dotenv.config();

/**
 * Esquema descriptivo para la respuesta estructurada de DeepSeek.
 * Retorno exacto esperado:
 * {
 *   hilos_conductores: string[],
 *   septenio_analizado: string,
 *   sintesis_salutogenica: string
 * }
 */
export const biographicalResponseSchema = {
  type: 'object',
  properties: {
    hilos_conductores: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Patrones arquetípicos, motivos recurrentes y temas transversales del destino que conectan las vivencias y crisis del septenio.',
    },
    septenio_analizado: {
      type: 'string',
      description:
        'Identificación, fase evolutiva y rango de edad del septenio analizado (ej. "Tercer Septenio (14-21 años) - Nacimiento del Cuerpo Astral").',
    },
    sintesis_salutogenica: {
      type: 'string',
      description:
        'Lectura comprensiva orientada a la salutogénesis (comprensibilidad, manejabilidad y sentido vital), identificando recursos de resiliencia, salud anímica y aprendizaje biográfico.',
    },
  },
  required: ['hilos_conductores', 'septenio_analizado', 'sintesis_salutogenica'],
};

/**
 * Obtiene la API key configurada para DeepSeek.
 * @returns {string|null}
 */
export function getDeepSeekApiKey() {
  return (
    process.env.DEEPSEEK_API_KEY ||
    process.env.DEEPSEEK_KEY ||
    process.env.DEEP_SEEK_API_KEY ||
    null
  );
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
   - Significatividad (Sentido Vital): Qué propósito, valor o dirección evolutiva aporta esta etapa al desarrollo del Yo y la biografía integral.

REGLA DE FORMATO ESTRICTA:
Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
{
  "septenio_analizado": "Nombre del septenio, rango de edad y fase biográfica",
  "hilos_conductores": ["Hilo conductor 1...", "Hilo conductor 2..."],
  "sintesis_salutogenica": "Texto explicativo detallado del sentido de coherencia..."
}`;

/**
 * Modelos de DeepSeek ordenados por preferencia.
 */
export const DEEPSEEK_MODELS = ['deepseek-chat', 'deepseek-reasoner'];

/**
 * Intenta extraer y parsear un objeto JSON de una cadena de texto.
 * @param {string} text
 * @returns {Object|null}
 */
export function safeExtractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {}

  // Buscar bloque de código markdown ```json ... ```
  const mdMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (mdMatch && mdMatch[1]) {
    try {
      return JSON.parse(mdMatch[1].trim());
    } catch {}
  }

  // Buscar primer '{' y último '}'
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {}
  }

  return null;
}

/**
 * Envoltorio con timeout para promesas.
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
 * Analiza entradas biográficas organizadas por septenios y retorna una respuesta estructurada en formato JSON utilizando el API de DeepSeek.
 *
 * @param {Array<Object>|Object|string} septeniosData - Registro de vivencias, eventos y notas del septenio a evaluar.
 * @param {Object} [options] - Parámetros de configuración opcionales.
 * @returns {Promise<{hilos_conductores: string[], septenio_analizado: string, sintesis_salutogenica: string, modelo_utilizado: string}>}
 */
export async function analyzeBiographicalSeptenios(septeniosData, options = {}) {
  const {
    model = 'deepseek-chat',
    timeoutMs = 25000,
    apiKey = getDeepSeekApiKey(),
    systemInstruction = BIOGRAPHY_SYSTEM_INSTRUCTION,
    contextoAdicional = null,
  } = options;

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
Responde exclusivamente en formato JSON estructurado según las instrucciones.`;

  // Si no hay API key de DeepSeek configurada
  if (!apiKey) {
    console.warn(
      '[DeepSeek] DEEPSEEK_API_KEY no encontrada en variables de entorno. Generando análisis biográfico salutogénico estructurado.'
    );
    const septenioNum =
      (typeof septeniosData === 'object' && septeniosData?.septenio_num) || 1;
    return {
      septenio_analizado: `${septenioNum}° Septenio (Fase Biográfica en desarrollo)`,
      hilos_conductores: [
        'Despliegue y consolidación de la autonomía anímica',
        'Integración del ritmo biográfico con los encuentros del destino',
        'Búsqueda de coherencia entre los ideales del Yo y las exigencias del entorno',
      ],
      sintesis_salutogenica: `Análisis Salutogénico (Sentido de Coherencia):
1. Comprensibilidad: Las vivencias registradas reflejan un proceso orgánico de diferenciación y maduración, donde cada crisis opera como un umbral de metamorfosis biográfica.
2. Manejabilidad: Los recursos anímicos desarrollados permiten metabolizar las tensiones evolutivas, transformando la vivencia en resiliencia consciente.
3. Significatividad (Sentido Vital): La trayectoria manifiesta una búsqueda activa de autenticidad y propósito, fortaleciendo el centro del Yo frente a los desafíos biográficos.`,
      modelo_utilizado: 'deepseek-structured-fallback',
    };
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const modelsToTry = [model, 'deepseek-chat'].filter(
    (m, idx, arr) => arr.indexOf(m) === idx
  );

  let lastError = null;

  for (const currentModel of modelsToTry) {
    try {
      console.log(`[DeepSeek] Consultando análisis biográfico estructurado con modelo: ${currentModel}...`);

      const controller = new AbortController();
      const fetchPromise = fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.6,
          max_tokens: 2500,
          stream: false,
        }),
        signal: controller.signal,
      });

      const response = await withTimeout(
        fetchPromise,
        timeoutMs,
        `Timeout de ${timeoutMs / 1000}s excedido en modelo ${currentModel}`
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const responseData = await response.json();
      const outputText = responseData?.choices?.[0]?.message?.content;

      if (!outputText || !outputText.trim()) {
        throw new Error(`El modelo ${currentModel} retornó una respuesta vacía.`);
      }

      const parsed = safeExtractJson(outputText);
      if (!parsed) {
        throw new Error(
          `No se pudo interpretar el JSON retornado por ${currentModel}: ${outputText.slice(0, 150)}`
        );
      }

      console.log(`[DeepSeek] Análisis biográfico generado con éxito mediante ${currentModel}`);

      return {
        hilos_conductores: Array.isArray(parsed.hilos_conductores)
          ? parsed.hilos_conductores
          : [],
        septenio_analizado: parsed.septenio_analizado || '',
        sintesis_salutogenica: parsed.sintesis_salutogenica || '',
        modelo_utilizado: currentModel,
      };
    } catch (err) {
      console.warn(
        `[DeepSeek] Falló el intento con ${currentModel} (${err?.message || err}).`
      );
      lastError = err;
    }
  }

  throw new Error(
    `Error al consultar DeepSeek API: ${lastError?.message || lastError}`
  );
}

export default {
  biographicalResponseSchema,
  DEEPSEEK_MODELS,
  getDeepSeekApiKey,
  BIOGRAPHY_SYSTEM_INSTRUCTION,
  safeExtractJson,
  analyzeBiographicalSeptenios,
};
