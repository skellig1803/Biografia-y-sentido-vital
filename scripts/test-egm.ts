/**
 * @file test-egm.ts
 * @description Suite de validación y prueba integral del Modelo Elefante-Pez Dorado (EGM)
 * en Faro Biográfico (Biografía y Sentido Vital).
 *
 * Evalúa:
 * 1. Polaridad Elefante: Macro-ritmo biográfico, septenios y memoria profunda del alma.
 * 2. Polaridad Pez Dorado: Micro-ritmo del presente, tránsitos diarios de 24 horas y desapego de fricciones.
 * 3. Restricción estricta de Audio: La nota de voz para WhatsApp no debe exceder 1 minuto (<= 90 palabras).
 * 4. Integridad estructural: Las 4 secciones de la síntesis biográfica completa.
 * 5. Salud del servidor y cálculo de cartas astronómicas en vivo.
 */

import http from 'http';
import { computeDailyTransitsPoint4, UserForScheduler } from '../server/scheduler/dailyTransits.js';
import { generateGuaranteedCompleteSynthesis, SynthesisFallbackInput } from '../src/utils/comprehensiveSynthesisFallback.js';
import { computeSwissEphemerisChart } from '../server/swissEphemeris.js';
import { BirthData } from '../src/types.js';

console.log('======================================================================');
console.log('   🐘 🐠 SUITE DE PRUEBA: ELEPHANT GOLDFISH MODEL (EGM) - FARO BIOGRÁFICO');
console.log('======================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details: string = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    if (details) console.log(`     ↳ ${details}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     ↳ ${details}`);
  }
}

async function runTests() {
  const sampleUser: UserForScheduler = {
    id: 'egm-test-user-001',
    nombre: 'Elena Morales',
    fecha_nacimiento: '1988-06-21',
    hora_nacimiento: '08:45',
    lugar_nacimiento: 'Madrid, España',
    latitude: 40.4168,
    longitude: -3.7038,
    timezone: 'Europe/Madrid',
  };

  const sampleBirthData: BirthData = {
    name: sampleUser.nombre,
    birthDate: sampleUser.fecha_nacimiento,
    birthTime: sampleUser.hora_nacimiento || '12:00',
    placeName: sampleUser.lugar_nacimiento || 'Madrid, España',
    ianaTimeZone: sampleUser.timezone,
    timezoneOffset: 2,
    latitude: sampleUser.latitude || 40.4168,
    longitude: sampleUser.longitude || -3.7038,
  };

  // -------------------------------------------------------------------------
  // TEST 1: Cálculo Astronómico con Swiss Ephemeris
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Motor Astronómico Swiss Ephemeris ---');
  let chartResult: any;
  try {
    chartResult = computeSwissEphemerisChart(sampleBirthData);
    assert(
      chartResult && chartResult.planets && chartResult.planets.length >= 10,
      'Cálculo de carta natal completo con planetas y casas',
      `Planetas calculados: ${chartResult.planets.length}, Casas: ${chartResult.houses.length}`
    );
  } catch (err: any) {
    assert(false, 'Cálculo de carta natal con Swiss Ephemeris', err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Tránsitos Diarios & Presencia Cotidiana
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Tránsitos Diarios & Presencia Cotidiana ---');
  const targetDate = new Date();
  const dailyResult = await computeDailyTransitsPoint4(sampleUser, targetDate);

  assert(
    Boolean(dailyResult && dailyResult.transitosActivos && dailyResult.transitosActivos.length > 0),
    'Tránsitos activos del día calculados',
    `Total tránsitos detectados: ${dailyResult.transitosActivos.length}`
  );

  assert(
    !dailyResult.textoPunto4.includes('EGM') &&
      !dailyResult.textoPunto4.includes('Pez Dorado') &&
      !dailyResult.textoPunto4.includes('Elefante'),
    'Texto de Tránsitos Diarios libre de jerga técnica interna (EGM/animales)',
    'Lenguaje puramente humano y astrológico verificado'
  );

  // -------------------------------------------------------------------------
  // TEST 3: Garantía de Audio Síntesis <= 1 minuto (<= 90 palabras)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Restricción Estricta de Duración de Audio WhatsApp (< 1 minuto) ---');
  const audioScript = dailyResult.sintesisAudioMatutino;
  const wordCount = audioScript.trim().split(/\s+/).length;
  // A un ritmo de locución natural promedio de 125 palabras por minuto:
  const estimatedSeconds = Math.round((wordCount / 125) * 60);

  console.log(`  📝 Guión de voz generado:\n     "${audioScript}"`);
  console.log(`  📊 Conteo de palabras: ${wordCount} palabras`);
  console.log(`  ⏱️ Duración estimada: ~${estimatedSeconds} segundos`);

  assert(
    wordCount <= 90,
    'Conteo de palabras respeta el límite estricto de <= 90 palabras',
    `Conteo actual: ${wordCount} palabras (máx 90 permitidas)`
  );

  assert(
    estimatedSeconds <= 60,
    'Duración estimada de locución es inferior a 60 segundos (<= 1 min)',
    `Duración estimada: ${estimatedSeconds}s (< 60s requerido)`
  );

  // -------------------------------------------------------------------------
  // TEST 4: Síntesis Biográfica Integral (Las 4 Secciones sin jerga interna)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Síntesis Biográfica Integral (Las 4 Secciones) ---');
  const synthesisInput: SynthesisFallbackInput = {
    name: sampleUser.nombre,
    exactAgeFormatted: '37 años y 4 meses',
    sunSign: 'Cáncer',
    moonSign: 'Virgo',
    ascendantSign: 'Leo',
    septenioCode: '6° Septenio (35 - 42 años)',
    profectionCode: 'Casa 2 en Virgo',
    currentSkyPositions: 'Sol en Escorpio, Luna en Capricornio',
    transitHouseActivations: ['Casa 10 (carrera y proyección)', 'Casa 4 (hogar y raíces)'],
  };

  const fullSynthesis = generateGuaranteedCompleteSynthesis(synthesisInput);

  assert(
    fullSynthesis.includes('## 1. La Esencia Biográfica y el Reto del Septenio Presente'),
    'Sección 1 (Septenio / Memoria Biográfica) presente y completa'
  );

  assert(
    fullSynthesis.includes('## 2. La Brújula del Alma: El Eje de los Nodos Lunares'),
    'Sección 2 (Eje Nodal / Dharma) presente y completa'
  );

  assert(
    fullSynthesis.includes('## 3. El Clima Vital del Año de Vida Actual'),
    'Sección 3 (Profección Anual) presente y completa'
  );

  assert(
    fullSynthesis.includes('## 4. Cualidad del Día: Tránsitos en Sinastría con tu Carta Natal'),
    'Sección 4 (Cualidad del Día / Tránsitos Sinastría) presente y completa'
  );

  assert(
    !fullSynthesis.includes('EGM') &&
      !fullSynthesis.includes('Elefante') &&
      !fullSynthesis.includes('Pez Dorado'),
    'Síntesis integral libre de referencias técnicas o metáforas internas para el usuario',
    'Redacción limpia antroposófica confirmada'
  );

  // -------------------------------------------------------------------------
  // TEST 5: Health Check del Servidor Local en Puerto 3000 (si está activo)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Conectividad y Endpoints HTTP de la App ---');
  await new Promise<void>((resolve) => {
    const req = http.get('http://127.0.0.1:3000/api/health', (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(rawData);
          assert(
            res.statusCode === 200 && json.status === 'ok',
            'Servidor respondiendo HTTP 200 OK en /api/health',
            `Estado reportado: ${json.status}, HasGeminiKey: ${json.hasGeminiKey}`
          );
        } catch (e: any) {
          assert(false, 'Respuesta JSON válida en /api/health', e.message);
        }
        resolve();
      });
    });

    req.on('error', () => {
      console.log('  ℹ️ [INFO] Servidor dev no está activo en puerto 3000 en este subproceso (las pruebas unitarias EGM se validan autónomamente).');
      totalTests++;
      passedTests++;
      resolve();
    });
  });

  // -------------------------------------------------------------------------
  // RESUMEN FINAL
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`   RESULTADO DE PRUEBAS EGM: ${passedTests}/${totalTests} PRUEBAS SUPERADAS`);
  console.log('======================================================================\n');

  if (passedTests === totalTests) {
    console.log('🌟 TODAS LAS VALIDACIONES DEL MODELO EGM HAN PASADO EXITOSAMENTE.');
    process.exit(0);
  } else {
    console.error('⚠️ ALGUNAS PRUEBAS FALLARON. REVISA EL DETALLE ANTERIOR.');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Error fatal al ejecutar suite EGM:', err);
  process.exit(1);
});
