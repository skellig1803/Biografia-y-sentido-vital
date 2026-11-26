import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Obtener credenciales desde variables de entorno
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

let supabaseClient = null;

/**
 * Normaliza y limpia una URL de Supabase para evitar errores como
 * "Invalid path specified in request URL" cuando se copian rutas extra
 * (ej. /rest/v1, /storage/v1, /dashboard/project/..., comillas o espacios).
 * @param {string} rawUrl
 * @returns {{ url: string, wasNormalized: boolean, issue: string | null }}
 */
export function normalizeSupabaseUrl(rawUrl) {
  let cleaned = String(rawUrl || '').trim().replace(/^["']+|["']+$/g, '').trim();
  if (!cleaned) {
    return { url: '', wasNormalized: false, issue: 'missing' };
  }

  try {
    const parsed = new URL(cleaned);
    let normalized = cleaned;
    let wasNormalized = false;

    // Caso 1: Se copió la URL del panel web de Supabase (https://supabase.com/dashboard/project/<ref>)
    const dashboardMatch = parsed.pathname.match(/^\/dashboard\/project\/([a-z0-9-]+)/i);
    if (
      (parsed.hostname === 'supabase.com' || parsed.hostname === 'app.supabase.com') &&
      dashboardMatch
    ) {
      normalized = `https://${dashboardMatch[1]}.supabase.co`;
      return { url: normalized, wasNormalized: true, issue: 'dashboard_url_converted' };
    }

    // Caso 2: Se copió un subdominio de almacenamiento (<ref>.storage.supabase.co)
    const storageHostMatch = parsed.hostname.match(/^([a-z0-9-]+)\.storage\.supabase\.co$/i);
    if (storageHostMatch) {
      normalized = `https://${storageHostMatch[1]}.supabase.co`;
      return { url: normalized, wasNormalized: true, issue: 'storage_host_converted' };
    }

    // Caso 3: Se incluyó una ruta extra en *.supabase.co (ej. /rest/v1, /auth/v1, etc.)
    if (parsed.hostname.endsWith('.supabase.co')) {
      if (parsed.pathname && parsed.pathname !== '/') {
        normalized = parsed.origin;
        wasNormalized = true;
        return { url: normalized, wasNormalized: true, issue: 'extra_path_stripped' };
      }
      return { url: parsed.origin, wasNormalized: cleaned !== parsed.origin, issue: null };
    }

    // Caso 4: Otro host personalizado o URL no estándar de Supabase
    if (parsed.pathname && parsed.pathname !== '/' && parsed.pathname.includes('/rest/v1')) {
      normalized = parsed.origin;
      return { url: normalized, wasNormalized: true, issue: 'extra_path_stripped' };
    }

    return { url: cleaned.replace(/\/+$/, ''), wasNormalized: false, issue: 'non_standard_host' };
  } catch {
    return { url: cleaned, wasNormalized: false, issue: 'invalid_url_format' };
  }
}

export function getSupabaseConfigDiagnostic() {
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const hasKey = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY
  );
  const norm = normalizeSupabaseUrl(rawUrl);
  return {
    hasUrl: Boolean(norm.url),
    hasKey,
    wasNormalized: norm.wasNormalized,
    issue: norm.issue,
  };
}

/**
 * Obtiene o inicializa la instancia del cliente Supabase.
 * @param {string} [url] - URL opcional de Supabase
 * @param {string} [key] - API Key opcional (Anon o Service Role)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabase(url = SUPABASE_URL, key = SUPABASE_KEY) {
  if (supabaseClient) {
    return supabaseClient;
  }

  const rawUrl = url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const rawKey =
    key ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  const { url: normalizedUrl, issue } = normalizeSupabaseUrl(rawUrl);
  const cleanKey = String(rawKey || '').trim().replace(/^["']+|["']+$/g, '').trim();

  if (!normalizedUrl || !cleanKey) {
    throw new Error(
      'Faltan las credenciales de Supabase. Configura SUPABASE_URL y SUPABASE_ANON_KEY (o SUPABASE_SERVICE_ROLE_KEY) en tu archivo .env o en Vercel.'
    );
  }

  if (issue === 'invalid_url_format') {
    throw new Error(
      'El formato de SUPABASE_URL es inválido. Debe ser exactamente https://TU_PROYECTO.supabase.co'
    );
  }

  supabaseClient = createClient(normalizedUrl, cleanKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

// ========================================================
// CRUD: USERS
// ========================================================

/**
 * Crea un nuevo usuario en la base de datos.
 * @param {Object} userData
 * @param {string} userData.email - Correo electrónico del usuario.
 * @param {string} userData.nombre - Nombre completo.
 * @param {string} userData.fecha_nacimiento - Fecha en formato 'YYYY-MM-DD'.
 * @param {string} [userData.hora_nacimiento] - Hora en formato 'HH:MM'.
 * @param {string} [userData.lugar_nacimiento] - Ciudad/País de nacimiento.
 * @param {boolean} [userData.suscripcion_activa=false] - Estado de suscripción.
 * @param {string} [userData.id] - ID opcional (si proviene de Supabase Auth).
 * @returns {Promise<Object>} Registro del usuario creado.
 */
export async function createUser(userData) {
  const supabase = getSupabase();

  const payload = {
    email: userData.email,
    nombre: userData.nombre,
    fecha_nacimiento: userData.fecha_nacimiento,
    hora_nacimiento: userData.hora_nacimiento || null,
    lugar_nacimiento: userData.lugar_nacimiento || null,
    suscripcion_activa: Boolean(userData.suscripcion_activa),
  };

  if (userData.id) {
    payload.id = userData.id;
  }

  const { data, error } = await supabase
    .from('users')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }

  return data;
}

/**
 * Obtiene un usuario por su ID único.
 * @param {string} id - UUID del usuario.
 * @returns {Promise<Object|null>}
 */
export async function getUserById(id) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Registro no encontrado
    }
    console.error(`Error al obtener usuario ${id}:`, error);
    throw error;
  }

  return data;
}

/**
 * Obtiene un usuario por su correo electrónico.
 * @param {string} email - Correo electrónico a buscar.
 * @returns {Promise<Object|null>}
 */
export async function getUserByEmail(email) {
  const supabase = getSupabase();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', cleanEmail)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error(`Error al obtener usuario por email ${cleanEmail}:`, error);
    throw error;
  }

  return data;
}

/**
 * Busca un usuario por correo electrónico o por número de WhatsApp.
 * @param {string} identifier - Email o número de teléfono.
 * @returns {Promise<Object|null>}
 */
export async function getUserByEmailOrWhatsApp(identifier) {
  const supabase = getSupabase();
  const clean = String(identifier || '').trim().toLowerCase();
  if (!clean) return null;

  // 1. Intentar por email
  const { data: byEmail, error: emailErr } = await supabase
    .from('users')
    .select('*')
    .eq('email', clean)
    .maybeSingle();

  if (emailErr) {
    console.error(`Error al buscar usuario por email ${clean}:`, emailErr);
    throw emailErr;
  }

  if (byEmail) return byEmail;

  // 2. Si no, intentar por whatsapp (limpiando espacios)
  const phoneClean = clean.replace(/[\s\-\(\)]/g, '');
  const { data: byPhone, error: phoneErr } = await supabase
    .from('users')
    .select('*')
    .eq('whatsapp', phoneClean)
    .maybeSingle();

  if (phoneErr) {
    console.error(`Error al buscar usuario por WhatsApp ${phoneClean}:`, phoneErr);
    throw phoneErr;
  }

  return byPhone ?? null;
}

/**
 * Inserta o actualiza el perfil completo de un usuario con sus datos natales y WhatsApp.
 * @param {Object} p
 * @returns {Promise<Object>}
 */
export async function upsertUserProfile(p) {
  const supabase = getSupabase();
  const email = String(p.email || '').trim().toLowerCase();
  if (!email) {
    throw new Error('upsertUserProfile: El email es obligatorio.');
  }

  const payload = {
    email,
    nombre: p.nombre || p.name,
    fecha_nacimiento: p.fecha_nacimiento || p.birthDate,
    hora_nacimiento: p.hora_nacimiento || p.birthTime || null,
    lugar_nacimiento: p.lugar_nacimiento || p.placeName || null,
    latitude: typeof p.latitude === 'number' ? p.latitude : (p.lat ? Number(p.lat) : null),
    longitude: typeof p.longitude === 'number' ? p.longitude : (p.lng ? Number(p.lng) : null),
    timezone: p.timezone || p.ianaTimeZone || 'America/Bogota',
    whatsapp: p.whatsapp ? String(p.whatsapp).trim().replace(/[\s\-\(\)]/g, '') : null,
    updated_at: new Date().toISOString(),
  };

  if (typeof p.credits === 'number' && !isNaN(p.credits)) {
    payload.credits = Math.max(0, Math.floor(p.credits));
  }

  const { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'email' })
    .select()
    .single();

  if (error) {
    console.error('Error en upsertUserProfile:', error);
    throw error;
  }

  return data;
}

/**
 * Actualiza los datos de un usuario existente.
 * @param {string} id - UUID del usuario.
 * @param {Object} updates - Campos a modificar.
 * @returns {Promise<Object>} Usuario actualizado.
 */
export async function updateUser(id, updates) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error al actualizar usuario ${id}:`, error);
    throw error;
  }

  return data;
}

/**
 * Modifica el estado de suscripción de un usuario.
 * @param {string} id - UUID del usuario.
 * @param {boolean} activa - true si la suscripción está activa.
 * @returns {Promise<Object>}
 */
export async function setUserSubscription(id, activa) {
  return updateUser(id, { suscripcion_activa: Boolean(activa) });
}

/**
 * Agrega créditos al saldo persistente del usuario en Supabase.
 * @param {string} userId
 * @param {number} amount
 * @returns {Promise<number>} Nuevo saldo
 */
export async function addUserCredits(userId, amount) {
  const user = await getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  const current = typeof user.credits === 'number' ? user.credits : 5;
  const next = Math.max(0, current + Math.floor(amount));
  const updated = await updateUser(userId, { credits: next, updated_at: new Date().toISOString() });
  return updated.credits;
}

/**
 * Descuenta 1 crédito del saldo persistente del usuario en Supabase si tiene saldo >= 1.
 * @param {string} userId
 * @returns {Promise<{success: boolean, credits: number}>}
 */
export async function consumeUserCredit(userId) {
  const user = await getUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');
  const current = typeof user.credits === 'number' ? user.credits : 5;
  if (current < 1) {
    return { success: false, credits: 0 };
  }
  const next = current - 1;
  const updated = await updateUser(userId, { credits: next, updated_at: new Date().toISOString() });
  return { success: true, credits: updated.credits };
}

/**
 * Elimina un usuario por su ID (elimina en cascada sus biografías asociadas).
 * @param {string} id - UUID del usuario.
 * @returns {Promise<boolean>}
 */
export async function deleteUser(id) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error al eliminar usuario ${id}:`, error);
    throw error;
  }

  return true;
}

// ========================================================
// CRUD: BIOGRAFIAS
// ========================================================

/**
 * Valida que el número de septenio se encuentre en el rango permitido (1 a 7).
 * @param {number} septenioNum
 */
function validateSeptenioNum(septenioNum) {
  const num = Number(septenioNum);
  if (!Number.isInteger(num) || num < 1 || num > 7) {
    throw new Error(`septenio_num inválido: ${septenioNum}. Debe ser un número entero entre 1 y 7.`);
  }
}

/**
 * Crea una nueva entrada biográfica para un septenio.
 * @param {Object} biografiaData
 * @param {string} biografiaData.user_id - UUID del usuario propietario.
 * @param {number} biografiaData.septenio_num - Número del septenio (1 a 7).
 * @param {string} [biografiaData.recuerdos] - Texto de vivencias, hechos y memorias.
 * @param {string} [biografiaData.patrones_clave] - Análisis de hilos conductores o patrones clave.
 * @returns {Promise<Object>} Entrada biográfica creada.
 */
export async function createBiografia(biografiaData) {
  validateSeptenioNum(biografiaData.septenio_num);
  const supabase = getSupabase();

  const payload = {
    user_id: biografiaData.user_id,
    septenio_num: Number(biografiaData.septenio_num),
    recuerdos: biografiaData.recuerdos || null,
    patrones_clave: biografiaData.patrones_clave || null,
    timestamp: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('biografias')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error al crear biografía:', error);
    throw error;
  }

  return data;
}

/**
 * Inserta o actualiza (Upsert) una biografía para el usuario y septenio dados.
 * @param {Object} biografiaData
 * @param {string} biografiaData.user_id - UUID del usuario.
 * @param {number} biografiaData.septenio_num - Número del septenio (1 a 7).
 * @param {string} [biografiaData.recuerdos] - Texto de recuerdos.
 * @param {string} [biografiaData.patrones_clave] - Texto de patrones clave.
 * @returns {Promise<Object>} Registro biográfico guardado.
 */
export async function upsertBiografia(biografiaData) {
  validateSeptenioNum(biografiaData.septenio_num);
  const supabase = getSupabase();

  const payload = {
    user_id: biografiaData.user_id,
    septenio_num: Number(biografiaData.septenio_num),
    recuerdos: biografiaData.recuerdos || null,
    patrones_clave: biografiaData.patrones_clave || null,
    timestamp: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('biografias')
    .upsert(payload, { onConflict: 'user_id,septenio_num' })
    .select()
    .single();

  if (error) {
    console.error('Error en upsertBiografia:', error);
    throw error;
  }

  return data;
}

/**
 * Obtiene una biografía por su ID primario.
 * @param {string} id - UUID de la biografía.
 * @returns {Promise<Object|null>}
 */
export async function getBiografiaById(id) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('biografias')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error(`Error al obtener biografía ${id}:`, error);
    throw error;
  }

  return data;
}

/**
 * Obtiene todas las biografías de un usuario ordenadas por septenio.
 * @param {string} userId - UUID del usuario.
 * @returns {Promise<Array<Object>>} Lista de biografías del septenio 1 al 7.
 */
export async function getBiografiasByUserId(userId) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('biografias')
    .select('*')
    .eq('user_id', userId)
    .order('septenio_num', { ascending: true });

  if (error) {
    console.error(`Error al obtener biografías del usuario ${userId}:`, error);
    throw error;
  }

  return data || [];
}

/**
 * Obtiene el registro biográfico de un usuario para un septenio específico.
 * @param {string} userId - UUID del usuario.
 * @param {number} septenioNum - Número del septenio (1 a 7).
 * @returns {Promise<Object|null>}
 */
export async function getBiografiaBySeptenio(userId, septenioNum) {
  validateSeptenioNum(septenioNum);
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('biografias')
    .select('*')
    .eq('user_id', userId)
    .eq('septenio_num', Number(septenioNum))
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error(`Error al obtener septenio ${septenioNum} del usuario ${userId}:`, error);
    throw error;
  }

  return data;
}

/**
 * Actualiza los datos de una entrada biográfica existente por su ID.
 * @param {string} id - UUID de la biografía.
 * @param {Object} updates - Campos a modificar (recuerdos, patrones_clave, etc.).
 * @returns {Promise<Object>} Biografía actualizada.
 */
export async function updateBiografia(id, updates) {
  const supabase = getSupabase();

  if (updates.septenio_num !== undefined) {
    validateSeptenioNum(updates.septenio_num);
  }

  const payload = {
    ...updates,
    timestamp: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('biografias')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error al actualizar biografía ${id}:`, error);
    throw error;
  }

  return data;
}

/**
 * Elimina una entrada biográfica por su ID.
 * @param {string} id - UUID de la biografía.
 * @returns {Promise<boolean>}
 */
export async function deleteBiografia(id) {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('biografias')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error al eliminar biografía ${id}:`, error);
    throw error;
  }

  return true;
}

export default {
  getSupabase,
  normalizeSupabaseUrl,
  getSupabaseConfigDiagnostic,
  // User CRUD
  createUser,
  getUserById,
  getUserByEmail,
  getUserByEmailOrWhatsApp,
  upsertUserProfile,
  updateUser,
  setUserSubscription,
  addUserCredits,
  consumeUserCredit,
  deleteUser,
  // Biografia CRUD
  createBiografia,
  upsertBiografia,
  getBiografiaById,
  getBiografiasByUserId,
  getBiografiaBySeptenio,
  updateBiografia,
  deleteBiografia,
};
