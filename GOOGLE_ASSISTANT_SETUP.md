# Guía de Configuración: Google Assistant para Faro Biográfico

> Última actualización: noviembre 2026

---

## 1. Resumen de Arquitectura

El sistema funciona en dos fases desacopladas para garantizar respuestas rápidas en Google Assistant (límite: 10 segundos):

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 1 – Pre-generación (cada hora via Scheduler)              │
│                                                                 │
│  Cloud Scheduler → POST /api/scheduler/run-daily                │
│       └─ Para cada usuario suscrito cuya TZ es ~1AM:            │
│            1. Genera texto biográfico con DeepSeek              │
│            2. Sintetiza audio (TTS)                             │
│            3. Sube MP3 a Supabase Storage (bucket daily-audio)  │
│            4. Guarda URL firmada en tabla `daily_audio`         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FASE 2 – Entrega (cuando el usuario habla con el Assistant)    │
│                                                                 │
│  Usuario: "Ok Google, habla con Faro Biográfico"                │
│       └─ Google Actions → POST /api/assistant/webhook           │
│            └─ Webhook busca audio pregenerado en daily_audio    │
│                 └─ Responde con URL firmada del MP3 (<1s)       │
└─────────────────────────────────────────────────────────────────┘
```

**Por qué pre-generar:** La generación de texto + síntesis de voz tarda 15-40 segundos, muy por encima del límite de Google Actions. El audio pregenerado a la 1AM (hora local del usuario) está listo cuando el usuario lo solicita por la mañana.

---

## 2. Pre-requisitos

Antes de comenzar, asegúrate de tener:

- **Google Cloud Project** con la API de Actions on Google habilitada
- **Google Actions Console** ([console.actions.google.com](https://console.actions.google.com)) — cuenta vinculada al mismo proyecto
- **Supabase** con un proyecto activo y acceso al SQL Editor y Storage
- **Cuenta en Polar.sh** configurada (ya existente en el proyecto)
- Las variables de entorno listadas en la sección siguiente

---

## 3. Variables de Entorno

Agrega estas variables a tu `.env` (y `.env.example`). Ver también el archivo `.env.example` del repositorio.

| Variable | Descripción | Ejemplo / Default |
|---|---|---|
| `GOOGLE_ACTIONS_PROJECT_ID` | ID del proyecto en Google Cloud Console donde están configuradas las Actions | `mi-proyecto-12345` |
| `ASSISTANT_WEBHOOK_SECRET` | Secreto compartido para validar que los webhooks provienen de Google Actions. Se configura como header `x-assistant-secret` | Cadena aleatoria segura |
| `SUPABASE_STORAGE_BUCKET` | Nombre del bucket en Supabase Storage para los audios diarios pregenerados | `daily-audio` |
| `SCHEDULER_SECRET` | Secreto Bearer para proteger el endpoint `POST /api/scheduler/run-daily` | Cadena aleatoria segura |
| `POLAR_CHECKOUT_URL_FARO_DIARIO` | URL de checkout de Polar.sh para la suscripción mensual "Faro Diario" (ya existía) | `https://polar.sh/checkout/...` |

> **Generar secretos seguros:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 4. Paso 1: Configurar Supabase Storage

### 4.1 Crear el bucket `daily-audio`

1. Ve a tu proyecto en [supabase.com](https://supabase.com) → **Storage** → **New bucket**
2. Nombre: `daily-audio`
3. Tipo: **Privado** (desactiva "Public bucket")
4. Haz clic en **Create bucket**

### 4.2 Configurar permisos (Row Level Security)

El bucket debe ser privado. El acceso se realiza exclusivamente via **Signed URLs** generadas por el backend con `SUPABASE_SERVICE_ROLE_KEY`. No se requiere política RLS adicional para el bucket en sí, pero si tu proyecto tiene RLS activado en Storage, verifica que el service role pueda hacer `SELECT`, `INSERT` y `DELETE`.

### 4.3 Ejecutar el esquema de base de datos

En Supabase → **SQL Editor**, ejecuta el archivo:

```
schema_assistant.sql
```

Este script crea la tabla `daily_audio` que almacena las referencias a los audios pregenerados:

```sql
-- Estructura esperada (referencia)
CREATE TABLE daily_audio (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  audio_url   TEXT NOT NULL,         -- Signed URL de Supabase Storage
  expires_at  TIMESTAMPTZ NOT NULL,  -- Cuando expira la URL firmada
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
```

---

## 5. Paso 2: Configurar Google Actions

### 5.1 Crear el Action

1. Ve a [console.actions.google.com](https://console.actions.google.com)
2. Haz clic en **New project**
3. Selecciona el proyecto de Google Cloud (`GOOGLE_ACTIONS_PROJECT_ID`)
4. Nombre para mostrar: **Faro Biográfico**
5. Idioma principal: **Español (España)** o **Español (México)** según tu audiencia

### 5.2 Configurar el Fulfillment Webhook

En la consola de Actions → **Develop** → **Webhook**:

- **Webhook URL:** `{APP_URL}/api/assistant/webhook`
  - Ejemplo: `https://mi-app.vercel.app/api/assistant/webhook`
- **HTTP Headers personalizados:**
  ```
  x-assistant-secret: {ASSISTANT_WEBHOOK_SECRET}
  ```

### 5.3 Configurar Account Linking

Para identificar a los usuarios suscritos, configura **Account Linking**:

1. En la consola → **Develop** → **Account linking**
2. Tipo de vinculación: **Google Sign-In** (recomendado, más simple) o **OAuth**
3. Con Google Sign-In, el webhook recibirá el `sub` (Google User ID) del usuario autenticado
4. En tu base de datos, vincula el `google_user_id` con el `user_id` de Supabase/Polar

### 5.4 Configurar Intents

Crea los siguientes intents en **Develop** → **Invocation** / **Intents**:

| Intent | Tipo | Frases de ejemplo |
|---|---|---|
| `welcome` | Invocation (principal) | "habla con Faro Biográfico", "abre Faro Biográfico" |
| `daily_reading` | Custom | "mi lectura del día", "mi faro biográfico", "lectura de hoy", "dame mi lectura" |
| `subscription_info` | Custom | "información de suscripción", "precios", "¿cuánto cuesta?", "quiero suscribirme" |
| `cancel` | Built-in `CANCEL` | (frases gestionadas automáticamente por Google) |

Para cada intent custom, enlázalo al **webhook** como fulfillment.

---

## 6. Paso 3: Configurar Google Cloud Scheduler

El Scheduler es el corazón del sistema: llama al endpoint de pre-generación cada hora para procesar a los usuarios cuya zona horaria local sea aproximadamente la 1AM.

### 6.1 Crear el job en Cloud Scheduler

En [console.cloud.google.com](https://console.cloud.google.com) → **Cloud Scheduler** → **Create job**:

| Campo | Valor |
|---|---|
| **Nombre** | `faro-biografico-daily-audio` |
| **Región** | La más cercana a tus usuarios |
| **Frecuencia** | `0 * * * *` (cada hora, en punto) |
| **Zona horaria** | `UTC` |
| **Target type** | HTTP |
| **URL** | `{APP_URL}/api/scheduler/run-daily` |
| **Método HTTP** | `POST` |
| **Body** | `{}` |
| **Headers** | `Authorization: Bearer {SCHEDULER_SECRET}` y `Content-Type: application/json` |

> **¿Por qué cada hora?**
> El endpoint calcula internamente qué usuarios tienen la 1AM en su zona horaria en ese momento y solo genera audio para ellos. Llamarlo cada hora garantiza que ningún usuario se quede sin su lectura matutina independientemente de su timezone.

### 6.2 Alternativa: Cron local (Railway / Fly.io)

Si tu app corre en Railway o Fly.io, puedes usar su sistema de cron integrado o configurar una tarea periódica:

```bash
# Agregar a crontab (crontab -e) en tu servidor
0 * * * * curl -X POST {APP_URL}/api/scheduler/run-daily \
  -H "Authorization: Bearer {SCHEDULER_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 7. Paso 4: Vincular Polar.sh con el Sistema

El sistema necesita saber qué usuarios tienen una suscripción activa para generar su audio diario.

### 7.1 Eventos de Polar a procesar

Verifica que el webhook de Polar (configurado en `server/app.ts`) maneje estos eventos y actualice la tabla `subscriptions`:

| Evento Polar | Acción en el sistema |
|---|---|
| `subscription.created` | Llamar `upsertSubscription()` — activa la generación de audio para el usuario |
| `subscription.updated` | Llamar `upsertSubscription()` — actualiza estado, fecha de renovación, etc. |
| `subscription.cancelled` | Llamar `cancelSubscription()` — desactiva la generación de audio |

### 7.2 Integración en `server/app.ts`

Extiende la sección de Polar webhooks en `server/app.ts` para llamar a las funciones de `lib/subscriptions.js`:

```typescript
// En el handler del webhook de Polar (server/app.ts)
import { upsertSubscription, cancelSubscription } from '../lib/subscriptions.js';

// Dentro del switch/if de eventos:
case 'subscription.created':
case 'subscription.updated':
  await upsertSubscription({
    polarSubscriptionId: event.data.id,
    userId: event.data.metadata?.user_id,   // asegúrate de pasar user_id en metadata al crear checkout
    productId: event.data.product_id,
    status: event.data.status,
    currentPeriodEnd: event.data.current_period_end,
  });
  break;

case 'subscription.cancelled':
  await cancelSubscription(event.data.id);
  break;
```

> **Importante:** Al crear el checkout de Polar, pasa el `user_id` de Supabase en el campo `metadata` para poder asociar la suscripción al usuario correcto en tu base de datos.

---

## 8. Paso 5: Despliegue

### Consideración clave

El proyecto puede correr en **Vercel** (serverless) para el webhook de Google Actions y las APIs principales. Sin embargo, **el scheduler necesita un disparador externo** ya que las funciones serverless no pueden ejecutarse en background de forma periódica por sí solas.

### Opciones de despliegue

| Opción | Pros | Contras |
|---|---|---|
| **Google Cloud Run + Cloud Scheduler** ⭐ | Integración nativa con Google, confiable, fácil de monitorear | Requiere configurar Cloud Run si no se usa ya |
| **Railway.app con cron job integrado** | Simple, todo en un lugar, preview environments | Costo adicional por el servidor persistente |
| **Fly.io con scheduled machines** | Flexible, buen precio, control total | Más configuración inicial |

### Configuración recomendada (Google Cloud Run)

Si despliegas en Cloud Run, el endpoint `/api/scheduler/run-daily` se puede llamar desde Cloud Scheduler con autenticación via Bearer token (el `SCHEDULER_SECRET`). No se requiere OIDC ni Service Account especial — el secreto compartido es suficiente para este caso de uso.

---

## 9. Flujo de Prueba

### 9.1 Probar la pre-generación de audio manualmente

```bash
# Generar audio para una fecha específica (útil para pruebas sin esperar a la 1AM)
curl -X POST {APP_URL}/api/scheduler/run-daily \
  -H "Authorization: Bearer {SCHEDULER_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-11-03"}'
```

Respuesta esperada:
```json
{
  "ok": true,
  "processed": 3,
  "skipped": 1,
  "errors": 0
}
```

Verifica en **Supabase → Storage → daily-audio** que los archivos MP3 aparezcan.

### 9.2 Probar el webhook de Google Actions

1. Ve a [console.actions.google.com](https://console.actions.google.com) → tu proyecto → **Test**
2. En el simulador, escribe: `habla con Faro Biográfico`
3. Luego: `mi lectura del día`
4. Verifica que el Assistant reproduzca el audio o responda con el mensaje de bienvenida

### 9.3 Verificar audio en Supabase

1. Ve a **Supabase → Storage → daily-audio**
2. Los archivos deben seguir la nomenclatura: `{user_id}/{fecha}.mp3`
3. Verifica que la URL firmada en la tabla `daily_audio` no haya expirado

---

## 10. Troubleshooting

### ❌ Google Actions hace timeout (error tras ~10 segundos)

**Causa:** El audio no estaba pregenerado y el webhook intentó generarlo en tiempo real.

**Solución:**
1. Verifica que el scheduler está corriendo (`0 * * * *`)
2. Comprueba los logs del endpoint `/api/scheduler/run-daily`
3. Si el usuario se suscribió recientemente, dispara manualmente la generación:
   ```bash
   curl -X POST {APP_URL}/api/scheduler/run-daily \
     -H "Authorization: Bearer {SCHEDULER_SECRET}" \
     -d '{"userId": "{USER_ID}", "date": "2026-11-03"}'
   ```

### ❌ El audio no se reproduce / URL inválida

**Causa:** La Signed URL de Supabase Storage expiró antes de que el usuario escuchara.

**Solución:**
- Aumenta la duración de las Signed URLs al generarlas (recomendado: 48 horas)
- Implementa regeneración lazy en el webhook: si la URL expiró, genera una nueva URL firmada para el mismo objeto en Storage (sin regenerar el audio)

### ❌ Usuario no identificado (Google Actions no puede vincular la cuenta)

**Causa:** Account Linking no está configurado o el usuario no ha completado la vinculación.

**Solución:**
1. Verifica la configuración de Account Linking en Google Actions Console
2. En el webhook, detecta cuando `conv.user.params.userId` está vacío y responde con un mensaje pidiendo al usuario que vincule su cuenta:
   ```
   "Para escuchar tu Faro Biográfico diario, primero vincula tu cuenta. 
    Puedes hacerlo en la app de Google Home o en la configuración de tu teléfono."
   ```

### ❌ Polar webhook no actualiza las suscripciones

**Causa:** Los eventos de Polar no están siendo procesados correctamente.

**Solución:**
1. Ve a Polar.sh → **Webhooks** → revisa el historial de eventos y sus respuestas HTTP
2. Verifica que el `POLAR_WEBHOOK_SECRET` coincide en Polar y en tu `.env`
3. Revisa los logs del servidor para errores en el handler de webhooks
