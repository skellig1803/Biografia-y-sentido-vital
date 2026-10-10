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
 * Obtiene o inicializa la instancia del cliente Supabase.
 * @param {string} [url] - URL opcional de Supabase
 * @param {string} [key] - API Key opcional (Anon o Service Role)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabase(url = SUPABASE_URL, key = SUPABASE_KEY) {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!url || !key) {
    throw new Error(
      'Faltan las credenciales de Supabase. Configura SUPABASE_URL y SUPABASE_ANON_KEY (o SUPABASE_SERVICE_ROLE_KEY) en tu archivo .env o en Vercel.'
    );
  }

  supabaseClient = createClient(url, key, {
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

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error(`Error al obtener usuario por email ${email}:`, error);
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
  // User CRUD
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  setUserSubscription,
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
