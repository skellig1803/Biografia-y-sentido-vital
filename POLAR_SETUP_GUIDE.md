# Guía Completa de Configuración y Aprobación en Polar.sh
**Faro Biográfico — SaaS de Informes Biográficos y Desarrollo Personal**

Esta guía te acompaña paso a paso para configurar tu cuenta en [Polar.sh](https://polar.sh), crear tus productos y enlaces de pago, y asegurar que tu solicitud de verificación sea aprobada sin problemas por su equipo de Compliance.

---

## 1. ¿Por qué Polar.sh?
Polar.sh opera como **Merchant of Record (MoR)**. Esto significa que:
* Polar recauda los pagos de forma segura y maneja el IVA / Sales Tax global automáticamente.
* Cumple las normativas de Visa, Mastercard y procesadores bancarios (Stripe).
* No exige crear sociedades complejas en el extranjero para recibir cobros internacionales en USD.

---

## 2. Creación de tu Cuenta y Organización
1. Entra en [polar.sh](https://polar.sh) y haz clic en **Sign In** (puedes ingresar con GitHub o con tu email).
2. Crea tu organización:
   * **Nombre sugerido:** `Faro Biográfico`
   * **Slug de organización:** `faro-biografico` (o el que elijas).
   * Este slug es tu variable de entorno: `POLAR_ORGANIZATION_SLUG="faro-biografico"`

---

## 3. Creación de los Productos en Polar.sh
En el panel de Polar, ve a la sección **Products** > **New Product**. Crea los 5 productos detallados a continuación:

### 📦 Bloque 1: Paquetes de Créditos para Informes con IA

#### Producto 1: 1 Reporte de Trayectoria Vital
* **Name:** `1 Reporte de Trayectoria Vital`
* **Pricing type:** `One-time purchase` (Pago único)
* **Amount:** `$3.99 USD`
* **Description:**
  > 1 Crédito de análisis biográfico asistido por IA. Incluye síntesis de trayectoria vital, desglose de ejes de crecimiento, clima del septenio y dinámica de tránsitos. Entrega digital inmediata.

#### Producto 2: Pack 5 Reportes de Análisis (Más Popular)
* **Name:** `Pack 5 Reportes de Análisis`
* **Pricing type:** `One-time purchase` (Pago único)
* **Amount:** `$14.99 USD`
* **Description:**
  > 5 Créditos para informes biográficos con IA ($2.99 USD/reporte, 25% de ahorro). Sin fecha de caducidad, comparativa de ciclos vitales y cálculo astronómico prioritario.

#### Producto 3: Pack Profesional (15 Reportes)
* **Name:** `Pack Profesional (15 Reportes)`
* **Pricing type:** `One-time purchase` (Pago único)
* **Amount:** `$29.99 USD`
* **Description:**
  > 15 Créditos sin caducidad ($1.99 USD/reporte, 50% de ahorro). Incluye licencia de uso comercial para consultoría de desarrollo personal, sesiones de coaching y mentorías.

---

### 🎙️ Bloque 2: Servicios Continuos y Consultoría Especializada

#### Producto 4: Faro Diario - Suscripción Matutina (Audio PWA)
* **Name:** `Faro Diario - Suscripción Matutina`
* **Pricing type:** `Subscription` (Recurrente mensual)
* **Amount:** `$7.99 USD / mes`
* **Billing interval:** `Monthly`
* **Description:**
  > Suscripción continua a micro-audios matutinos personalizados de 45 segundos (análisis diario de Nodo Lunar, Septenio activo, Profección anual y Tránsitos del día). Cancelable en cualquier momento sin permanencia.

#### Producto 5: Rectificación Biográfica de Carta Natal (Artesanal)
* **Name:** `Rectificación Biográfica Artesanal`
* **Pricing type:** `One-time purchase` (Pago único)
* **Amount:** `$80.00 USD`
* **Description:**
  > Servicio técnico individualizado de ajuste y verificación horaria mediante técnica de atacires y cronología vital verificable. Entrega estructurada en 3 días laborables.

#### Servicio 6: Consultas Privadas Individuales
* **Coordinación:** Enlace de cobro personalizado o botón directo generado desde Polar tras acordar la sesión por agenda (WhatsApp o Cal.com).

---

## 4. Enlaces de Pago, Success URL y Return URL

Al crear o editar cada producto en Polar.sh (o en la configuración general de Checkout), Polar te solicitará dos URLs fundamentales:

### 🎯 4.1 ¿Qué es la Success URL? (URL de Éxito / Confirmación)
Es la dirección web a la que Polar redirige automáticamente al comprador **justo después de que su tarjeta o medio de pago es procesado con éxito**.
En esa pantalla, Faro Biográfico detecta los parámetros de la URL, acredita los créditos inmediatamente y le muestra al usuario una ventana de confirmación.

Polar permite utilizar la variable dinámica `{CHECKOUT_ID}`.

#### Opciones de Success URL según tu dominio:

* **Si usas tu propio dominio o Vercel (ej. `https://tudominio.com`):**
  * **Genérica (válida para cualquier producto):**
    ```text
    https://tudominio.com/?payment=success&checkout_id={CHECKOUT_ID}
    ```
  * **Específica por producto (Recomendada para auto-acreditar los créditos exactos):**
    * **1 Reporte ($3.99):**
      `https://tudominio.com/?payment=success&plan=pack_single&checkout_id={CHECKOUT_ID}`
    * **Pack 5 Reportes ($14.99):**
      `https://tudominio.com/?payment=success&plan=pack5&checkout_id={CHECKOUT_ID}`
    * **Pack Profesional 15 Reportes ($29.99):**
      `https://tudominio.com/?payment=success&plan=pack15&checkout_id={CHECKOUT_ID}`
    * **Faro Diario (Suscripción $7.99/mes):**
      `https://tudominio.com/?payment=success&service=faro_diario&checkout_id={CHECKOUT_ID}`
    * **Rectificación Biográfica ($80.00):**
      `https://tudominio.com/?payment=success&service=rectificacion&checkout_id={CHECKOUT_ID}`

* **Si estás probando en el entorno actual de AI Studio / Cloud Run:**
  * **Success URL actual:**
    ```text
    https://ais-pre-tmwyppxfk5opbk236cqzcq-434622891090.us-east1.run.app/?payment=success&checkout_id={CHECKOUT_ID}
    ```

---

### ↩️ 4.2 ¿Qué es la Return URL? (URL de Retorno / Cancelación)
Es la dirección a donde vuelve el usuario si decide **cancelar el proceso de pago**, cerrar la ventana de pago o hacer clic en "Volver a la tienda" / "Return to Faro Biográfico" antes de pagar.

* **Si usas tu dominio o Vercel:**
  ```text
  https://tudominio.com/
  ```
  *(o si deseas que la app detecte la cancelación y le informe que no se hizo ningún cargo: `https://tudominio.com/?payment=cancelled`)*

* **En el entorno actual de AI Studio:**
  ```text
  https://ais-pre-tmwyppxfk5opbk236cqzcq-434622891090.us-east1.run.app/
  ```

---

### 🔗 4.3 Obtención de Enlaces de Pago (Checkout URLs)
Al guardar cada producto, Polar genera una URL de pago directa:
* Copia el enlace de cada producto y agrégalo a tu archivo `.env` o a las variables de entorno de tu hosting (Vercel / Render / Cloud Run):
  ```env
  POLAR_CHECKOUT_URL_SINGLE="https://polar.sh/checkout/..."
  POLAR_CHECKOUT_URL_PACK5="https://polar.sh/checkout/..."
  POLAR_CHECKOUT_URL_PACK15="https://polar.sh/checkout/..."
  POLAR_CHECKOUT_URL_FARO_DIARIO="https://polar.sh/checkout/..."
  POLAR_CHECKOUT_URL_RECTIFICACION="https://polar.sh/checkout/..."
  POLAR_CHECKOUT_URL_CONSULTA="https://polar.sh/checkout/..."
  ```

---

## 5. Token de Acceso y Webhooks (Automatización)
1. **Access Token:**
   * En Polar ve a **Settings** > **Developers** > **Personal Access Tokens**.
   * Crea un token con permisos sobre tu organización y copia el valor en:
     ```env
     POLAR_ACCESS_TOKEN="polar_at_..."
     ```
2. **Webhooks:**
   * En Polar ve a **Settings** > **Developers** > **Webhooks** > **Add Endpoint**.
   * **URL del endpoint:** `https://tu-dominio.com/api/webhooks/polar`
   * **Eventos a suscribir:**
     - `order.created` (para compras de paquetes de créditos y pagos únicos)
     - `subscription.created` (para altas de Faro Diario)
     - `subscription.updated` / `subscription.revoked` (para control de bajas)
   * Copia el secreto del webhook en tu entorno:
     ```env
     POLAR_WEBHOOK_SECRET="polar_whsec_..."
     ```

---

## 6. Formulario de Aprobación de Polar.sh (Compliance)
Cuando Polar solicite la información de tu negocio para activar los cobros y transferencias a tu cuenta bancaria, proporciona los siguientes datos:

* **Sitio Web / URL del Producto:** URL donde está desplegada tu app (ej. `https://farobiografico.com` o la URL de Vercel/Cloud Run).
* **Descripción del negocio (Business Description):**
  > "Faro Biográfico es una plataforma SaaS de análisis de desarrollo personal y biografía humana. Combina algoritmos de efemérides astronómicas con la metodología cronológica de septenios para generar informes automatizados de autoconocimiento asistidos por IA. Comercializa créditos de software y una suscripción matutina de audio para desarrollo personal."
* **URL de Términos de Servicio:** Enlace a tu aplicación con el modal legal o sección correspondiente (accesible en el pie de página de la app).
* **URL de Política de Reembolso:** Accesible en el pie de página ("Política de Reembolso").
* **Política de Entrega:** Entrega digital instantánea para informes y 3 días laborables para rectificación manual.
* **Datos de Contacto:** `rodriguezb.jl@gmail.com` (Tiempo de respuesta: &lt; 24h).
