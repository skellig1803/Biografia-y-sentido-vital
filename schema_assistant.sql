-- =============================================================================
-- Schema del Sistema de Suscripciones y Google Assistant para Faro Biográfico
-- =============================================================================
-- Este archivo contiene las migraciones y definiciones de tablas necesarias
-- para soportar el flujo de suscripción (Polar) y la integración con
-- Google Assistant / Actions on Google.
--
-- Orden de ejecución:
--   1. Alteraciones a la tabla existente `users`
--   2. Tabla `subscriptions`
--   3. Tabla `daily_audio_cache`
--   4. Tabla `assistant_sessions`
--   5. Trigger para `updated_at`
--   6. Políticas de Row Level Security (RLS)
-- =============================================================================


-- =============================================================================
-- 1. ALTERACIONES A LA TABLA `users`
-- =============================================================================

-- Zona horaria del usuario (por defecto Colombia, UTC-5)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Bogota';

-- Identificador de cuenta de Google del usuario (para vincular con Google Assistant)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS google_user_id TEXT NULL;

-- Indica si el usuario ha vinculado su cuenta con Google Assistant
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS assistant_linked BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para búsquedas rápidas por google_user_id (se usa en cada petición del Assistant)
CREATE INDEX IF NOT EXISTS idx_users_google_user_id
  ON public.users (google_user_id);


-- =============================================================================
-- 2. TABLA `subscriptions`
--    Almacena el estado de cada suscripción gestionada a través de Polar.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  -- Identificador interno de la suscripción
  id                      UUID        NOT NULL DEFAULT gen_random_uuid(),

  -- Usuario propietario de la suscripción
  user_id                 UUID        NOT NULL
                            REFERENCES public.users(id) ON DELETE CASCADE,

  -- Identificador de la suscripción en Polar (p.ej. "sub_xxxxxxxxxxxx")
  polar_subscription_id   TEXT        NOT NULL,

  -- Identificador de la orden/pago en Polar (puede ser NULL en suscripciones de prueba)
  polar_order_id          TEXT        NULL,

  -- Identificador del plan contratado
  plan_id                 TEXT        NOT NULL DEFAULT 'faro_diario_mensual',

  -- Estado actual de la suscripción
  status                  TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),

  -- Inicio del período de facturación actual
  current_period_start    TIMESTAMPTZ NOT NULL,

  -- Fin del período de facturación actual (la suscripción expira si no se renueva)
  current_period_end      TIMESTAMPTZ NOT NULL,

  -- Fecha/hora en que se canceló la suscripción (NULL si sigue activa)
  cancelled_at            TIMESTAMPTZ NULL,

  -- Marca de tiempo de creación del registro
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Marca de tiempo de la última actualización (gestionada por trigger)
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Claves y restricciones
  CONSTRAINT pk_subscriptions
    PRIMARY KEY (id),

  -- Cada suscripción de Polar debe ser única en nuestro sistema
  CONSTRAINT uq_polar_subscription
    UNIQUE (polar_subscription_id)
);

-- Índice para consultas por usuario (listar suscripciones de un usuario)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions (user_id);

-- Índice para filtrar por estado (p.ej. obtener todas las suscripciones activas)
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions (status);

-- Índice para detectar suscripciones próximas a vencer o ya vencidas
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON public.subscriptions (current_period_end);

COMMENT ON TABLE public.subscriptions IS
  'Suscripciones de usuarios a Faro Biográfico, sincronizadas desde Polar vía webhooks.';

COMMENT ON COLUMN public.subscriptions.polar_subscription_id IS
  'ID único de la suscripción en la plataforma Polar (formato: sub_...).';

COMMENT ON COLUMN public.subscriptions.plan_id IS
  'Identificador del plan de suscripción (p.ej. faro_diario_mensual, faro_diario_anual).';

COMMENT ON COLUMN public.subscriptions.status IS
  'Estado de la suscripción: active | cancelled | expired | past_due.';


-- =============================================================================
-- 3. TABLA `daily_audio_cache`
--    Caché del audio diario generado para cada usuario. Evita regenerar el
--    mismo contenido varias veces en un mismo día y permite servir respuestas
--    rápidas al Google Assistant.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.daily_audio_cache (
  -- Identificador interno del registro de caché
  id                      UUID        NOT NULL DEFAULT gen_random_uuid(),

  -- Usuario al que pertenece este audio
  user_id                 UUID        NOT NULL
                            REFERENCES public.users(id) ON DELETE CASCADE,

  -- Fecha del horóscopo/contenido generado (sin hora, en la zona horaria del usuario)
  fecha                   DATE        NOT NULL,

  -- URL pública del archivo de audio en el bucket de almacenamiento
  audio_url               TEXT        NOT NULL DEFAULT '',

  -- Duración del audio en segundos (NULL mientras no se haya generado)
  audio_duration_seconds  INTEGER     NULL,

  -- Texto completo del guion generado por la IA antes de convertirlo a audio
  texto_generado          TEXT        NULL,

  -- Tránsitos astrológicos del día en formato JSON (para depuración y regeneración)
  transitos_json          JSONB       NULL,

  -- Momento en que se completó la generación del audio
  generated_at            TIMESTAMPTZ NULL,

  -- Fecha/hora a partir de la cual este registro puede eliminarse de la caché
  expires_at              TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '3 days'),

  -- Mensaje de error si el estado es 'error'
  error                   TEXT        NULL,

  -- Estado del proceso de generación
  status                  TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'generating', 'ready', 'error')),

  -- Marca de tiempo de creación del registro
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Claves y restricciones
  CONSTRAINT pk_daily_audio_cache
    PRIMARY KEY (id),

  -- Solo puede existir un audio por usuario por día
  CONSTRAINT uq_user_date
    UNIQUE (user_id, fecha)
);

-- Índice para consultar el audio de un usuario específico
CREATE INDEX IF NOT EXISTS idx_daily_audio_user_id
  ON public.daily_audio_cache (user_id);

-- Índice para consultar por fecha (útil para limpiezas de caché masivas)
CREATE INDEX IF NOT EXISTS idx_daily_audio_fecha
  ON public.daily_audio_cache (fecha);

-- Índice para filtrar registros por estado (p.ej. audios pendientes de generar)
CREATE INDEX IF NOT EXISTS idx_daily_audio_status
  ON public.daily_audio_cache (status);

-- Índice para limpiar registros expirados eficientemente
CREATE INDEX IF NOT EXISTS idx_daily_audio_expires
  ON public.daily_audio_cache (expires_at);

COMMENT ON TABLE public.daily_audio_cache IS
  'Caché de audios diarios generados por IA para cada usuario. Expiran automáticamente a los 3 días.';

COMMENT ON COLUMN public.daily_audio_cache.audio_url IS
  'URL pública del audio en Supabase Storage (vacía mientras status != ready).';

COMMENT ON COLUMN public.daily_audio_cache.transitos_json IS
  'JSON con los tránsitos astrológicos calculados para ese día, guardado para auditoría y regeneración.';

COMMENT ON COLUMN public.daily_audio_cache.expires_at IS
  'Timestamp de expiración. Un job de limpieza puede borrar registros donde expires_at < now().';


-- =============================================================================
-- 4. TABLA `assistant_sessions`
--    Registro de cada interacción del usuario con el Google Assistant.
--    Sirve para auditoría, depuración y métricas de uso.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.assistant_sessions (
  -- Identificador interno de la sesión
  id                  UUID        NOT NULL DEFAULT gen_random_uuid(),

  -- Usuario identificado en esta sesión (NULL si no se pudo identificar)
  user_id             UUID        NULL
                        REFERENCES public.users(id) ON DELETE SET NULL,

  -- ID de sesión asignado por Google (persiste durante una conversación)
  google_session_id   TEXT        NOT NULL,

  -- ID de cuenta de Google del usuario (para vincular sin estar autenticado aún)
  google_user_id      TEXT        NULL,

  -- Intent de Dialogflow/Actions que disparó esta sesión (p.ej. "escuchar_faro")
  intent_triggered    TEXT        NULL,

  -- Indica si se sirvió un audio al usuario en esta sesión
  audio_served        BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Indica si se utilizó el mensaje de fallback (p.ej. error al obtener audio)
  fallback_used       BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Mensaje de error capturado durante el manejo de la sesión
  error               TEXT        NULL,

  -- Marca de tiempo de creación del registro
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Clave primaria
  CONSTRAINT pk_assistant_sessions
    PRIMARY KEY (id)
);

-- Índice para consultar historial de sesiones de un usuario
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_user_id
  ON public.assistant_sessions (user_id);

-- Índice para buscar sesiones por cuenta de Google (antes de vincular la cuenta)
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_google_user_id
  ON public.assistant_sessions (google_user_id);

COMMENT ON TABLE public.assistant_sessions IS
  'Log de interacciones entre usuarios y el Google Assistant de Faro Biográfico.';

COMMENT ON COLUMN public.assistant_sessions.google_session_id IS
  'ID de sesión provisto por Google Actions; identifica una conversación continua.';

COMMENT ON COLUMN public.assistant_sessions.intent_triggered IS
  'Nombre del intent de Dialogflow que originó la llamada al webhook.';


-- =============================================================================
-- 5. TRIGGER: actualizar `updated_at` automáticamente en `subscriptions`
--    Reutiliza el patrón de función update_updated_at_column. Si la función
--    ya existe en el esquema (creada para otra tabla), este bloque es idempotente.
-- =============================================================================

-- Función genérica para actualizar el campo updated_at al momento actual
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger que invoca la función antes de cada UPDATE en subscriptions
CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
--    Política: el usuario autenticado solo puede ver/modificar sus propios
--    registros. El service_role (backend/webhooks) tiene acceso completo.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 6a. subscriptions
-- ----------------------------------------------------------------------------

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Lectura: el propio usuario o el service_role
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.role() = 'service_role'
  );

-- Inserción: solo el service_role (los webhooks de Polar crean registros)
CREATE POLICY "subscriptions_insert_service"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- Actualización: solo el service_role (los webhooks actualizan el estado)
CREATE POLICY "subscriptions_update_service"
  ON public.subscriptions
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- Eliminación: solo el service_role
CREATE POLICY "subscriptions_delete_service"
  ON public.subscriptions
  FOR DELETE
  USING (
    auth.role() = 'service_role'
  );

-- ----------------------------------------------------------------------------
-- 6b. daily_audio_cache
-- ----------------------------------------------------------------------------

ALTER TABLE public.daily_audio_cache ENABLE ROW LEVEL SECURITY;

-- Lectura: el propio usuario puede ver su caché de audio; el service_role tiene acceso total
CREATE POLICY "daily_audio_cache_select_own"
  ON public.daily_audio_cache
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.role() = 'service_role'
  );

-- Inserción: solo el service_role (el backend crea los registros de caché)
CREATE POLICY "daily_audio_cache_insert_service"
  ON public.daily_audio_cache
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- Actualización: solo el service_role (actualiza status, audio_url, etc.)
CREATE POLICY "daily_audio_cache_update_service"
  ON public.daily_audio_cache
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- Eliminación: solo el service_role (limpieza de registros expirados)
CREATE POLICY "daily_audio_cache_delete_service"
  ON public.daily_audio_cache
  FOR DELETE
  USING (
    auth.role() = 'service_role'
  );

-- ----------------------------------------------------------------------------
-- 6c. assistant_sessions
-- ----------------------------------------------------------------------------

ALTER TABLE public.assistant_sessions ENABLE ROW LEVEL SECURITY;

-- Lectura: el propio usuario puede consultar su historial; el service_role tiene acceso total
CREATE POLICY "assistant_sessions_select_own"
  ON public.assistant_sessions
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR auth.role() = 'service_role'
  );

-- Inserción: solo el service_role (el webhook del Assistant registra las sesiones)
CREATE POLICY "assistant_sessions_insert_service"
  ON public.assistant_sessions
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- Actualización: solo el service_role
CREATE POLICY "assistant_sessions_update_service"
  ON public.assistant_sessions
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- Eliminación: solo el service_role
CREATE POLICY "assistant_sessions_delete_service"
  ON public.assistant_sessions
  FOR DELETE
  USING (
    auth.role() = 'service_role'
  );


-- =============================================================================
-- FIN DEL SCHEMA
-- =============================================================================
