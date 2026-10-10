-- ========================================================
-- Faro Biográfico - Esquema de Base de Datos (PostgreSQL / Supabase)
-- ========================================================

-- Habilitar extensión para UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 1. Tabla: users
-- ========================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    hora_nacimiento TIME NULL,
    lugar_nacimiento TEXT NULL,
    suscripcion_activa BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsquedas rápidas por correo electrónico
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- ========================================================
-- 2. Tabla: biografias
-- ========================================================
CREATE TABLE IF NOT EXISTS public.biografias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    septenio_num INTEGER NOT NULL CHECK (septenio_num >= 1 AND septenio_num <= 7),
    recuerdos TEXT NULL,
    patrones_clave TEXT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Cada usuario tiene un registro único por cada septenio (del 1 al 7)
    CONSTRAINT uq_user_septenio UNIQUE (user_id, septenio_num)
);

-- Índices para optimizar consultas de biografías por usuario y por septenio
CREATE INDEX IF NOT EXISTS idx_biografias_user_id ON public.biografias (user_id);
CREATE INDEX IF NOT EXISTS idx_biografias_user_septenio ON public.biografias (user_id, septenio_num);

-- ========================================================
-- 3. Trigger para actualizar el campo updated_at automáticamente
-- ========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_biografias_updated_at ON public.biografias;
CREATE TRIGGER trg_biografias_updated_at
    BEFORE UPDATE ON public.biografias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 4. Políticas de Seguridad RLS (Row Level Security) - Supabase
-- ========================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biografias ENABLE ROW LEVEL SECURITY;

-- Política de acceso básico (permite lectura/escritura si autenticado o vía API key de servicio)
CREATE POLICY "Acceso para usuarios autenticados a sus propios datos"
    ON public.users
    FOR ALL
    USING (auth.uid() = id OR auth.role() = 'service_role')
    WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "Acceso a biografias del propio usuario"
    ON public.biografias
    FOR ALL
    USING (auth.uid() = user_id OR auth.role() = 'service_role')
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');
