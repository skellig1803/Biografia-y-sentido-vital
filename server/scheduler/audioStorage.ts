import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Configuración del bucket
// ---------------------------------------------------------------------------

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'daily-audio';

// ---------------------------------------------------------------------------
// Cliente Supabase (uso interno)
// ---------------------------------------------------------------------------

/**
 * Crea y devuelve un cliente de Supabase configurado con la service role key,
 * lo que permite operaciones de almacenamiento sin restricciones de RLS.
 */
function getStorageClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '[audioStorage] Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias.',
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Construye la ruta del archivo dentro del bucket.
 * Formato: {userId}/{fecha}.wav
 */
function buildFilePath(userId: string, fecha: string): string {
  return `${userId}/${fecha}.wav`;
}

// ---------------------------------------------------------------------------
// Funciones exportadas
// ---------------------------------------------------------------------------

/**
 * Sube el audio diario al bucket de Supabase Storage.
 * Si ya existe un archivo para la misma fecha y usuario, se reemplaza (upsert).
 *
 * @param userId      - Identificador único del usuario
 * @param fecha       - Fecha del audio en formato 'YYYY-MM-DD'
 * @param audioBuffer - Contenido del archivo de audio como Buffer
 * @returns           URL pública del archivo subido
 * @throws            Error si la subida falla en Supabase
 */
export async function uploadDailyAudio(
  userId: string,
  fecha: string,
  audioBuffer: Buffer,
): Promise<string> {
  const supabase = getStorageClient();
  const filePath = buildFilePath(userId, fecha);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, audioBuffer, {
      contentType: 'audio/wav',
      upsert: true,
    });

  if (error) {
    throw new Error(
      `[audioStorage] Error al subir el audio para usuario ${userId}, fecha ${fecha}: ${error.message}`,
    );
  }

  // Obtener la URL pública (el bucket debe ser público, o usar signed URL)
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

/**
 * Genera una URL firmada con validez de 24 horas para acceder al audio diario.
 * Útil cuando el bucket es privado y se requiere acceso temporal seguro.
 *
 * @param userId - Identificador único del usuario
 * @param fecha  - Fecha del audio en formato 'YYYY-MM-DD'
 * @returns      URL firmada válida por 86400 segundos, o null si no existe / hay error
 */
export async function getSignedAudioUrl(
  userId: string,
  fecha: string,
): Promise<string | null> {
  const supabase = getStorageClient();
  const filePath = buildFilePath(userId, fecha);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 86400); // 24 horas en segundos

  if (error || !data?.signedUrl) {
    console.warn(
      `[audioStorage] No se pudo generar URL firmada para usuario ${userId}, fecha ${fecha}: ` +
      (error?.message ?? 'sin datos'),
    );
    return null;
  }

  return data.signedUrl;
}

/**
 * Elimina el archivo de audio de un usuario para una fecha específica.
 * No lanza error si el archivo no existe; sólo registra una advertencia.
 *
 * @param userId - Identificador único del usuario
 * @param fecha  - Fecha del audio en formato 'YYYY-MM-DD'
 * @throws       Error si Supabase devuelve un error distinto a "not found"
 */
export async function deleteAudioFile(userId: string, fecha: string): Promise<void> {
  const supabase = getStorageClient();
  const filePath = buildFilePath(userId, fecha);

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath]);

  if (error) {
    // Toleramos errores de "archivo no encontrado" sin lanzar excepción
    const isNotFound =
      error.message.toLowerCase().includes('not found') ||
      error.message.toLowerCase().includes('no existe');

    if (isNotFound) {
      console.warn(
        `[audioStorage] El archivo ${filePath} no existe en el bucket; se omite la eliminación.`,
      );
      return;
    }

    throw new Error(
      `[audioStorage] Error al eliminar el audio para usuario ${userId}, fecha ${fecha}: ${error.message}`,
    );
  }

  console.info(`[audioStorage] Archivo ${filePath} eliminado correctamente del bucket '${BUCKET}'.`);
}
