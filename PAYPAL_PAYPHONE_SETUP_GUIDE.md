# Guía Completa de Configuración: PayPal Business & Payphone (Ecuador)

Esta guía te acompaña paso a paso para configurar **PayPal Business** (cobros internacionales y suscripción recurrente de $7.99 USD/mes) y **Payphone** (cobros locales en Ecuador sin fricciones bancarias) en **Faro Biográfico**.

---

## 1. ¿Por qué PayPal Business + Payphone?

1. **PayPal Business (Mercado Global)**:
   * Acepta pagos de cualquier país del mundo.
   * Tus clientes pueden pagar con tarjeta de crédito/débito (Visa, Mastercard, American Express) o con su saldo PayPal.
   * Permite crear planes de suscripción mensual automáticos ($7.99/mes) sin necesidad de pasar por auditorías restrictivas de *Merchant of Record*.
   * Puedes retirar los fondos directamente a cuentas bancarias vinculadas en bancos de Ecuador (vía Banco Guayaquil o transferencia internacional) o utilizarlos directamente.

2. **Payphone (Mercado Ecuador)**:
   * Pasarela oficial nacional número 1 en Ecuador.
   * Transacciona directamente en **Dólares (USD)**.
   * Acepta todas las tarjetas emitidas en Ecuador: Visa, Mastercard, Diners Club, Discover, American Express, Alia (Banco Solidario), Produbanco, Banco Pichincha, Banco Guayaquil, etc.
   * Tus clientes ecuatorianos pueden pagar con tarjeta o en 1 clic desde su app Payphone.
   * El dinero se acredita directamente y se transfiere a cualquier cuenta bancaria en Ecuador en 24 horas.

---

## 2. Paso a Paso: Configurar PayPal Business

### 2.1 Crear el Plan de Suscripción para Faro Diario ($7.99/mes)

1. Inicia sesión en tu cuenta Business de [PayPal](https://www.paypal.com/).
2. En el menú superior o lateral, ve a **Herramientas de Pago &gt; Suscripciones** (o busca *Crear un plan de suscripción*).
3. Haz clic en **Crear plan**:
   * **Nombre del producto:** `Faro Diario`
   * **Descripción:** `Suscripción mensual de audio matutino personalizado y tránsitos diarios generados con IA.`
   * **Tipo de producto:** `Servicio digital`
   * **Precio:** `$7.99 USD`
   * **Ciclo de facturación:** `Cada 1 mes` (Mensual)
   * **Cobrar tarifa de activación:** No.
4. Guarda y activa el plan.
5. PayPal te mostrará el **Plan ID** (ejemplo: `P-5ML4271244454362WXNWU5NQ`) y te dará un enlace directo de suscripción:
   ```
   https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-5ML4271244454362WXNWU5NQ
   ```
6. Copia ese enlace en tu variable de entorno:
   ```env
   PAYPAL_CHECKOUT_URL_FARO_DIARIO="https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=TU_PLAN_ID"
   PAYPAL_PLAN_ID_FARO_DIARIO="TU_PLAN_ID"
   ```

---

### 2.2 Obtener Client ID y Secret para Paquetes de Créditos

Para que los clientes puedan comprar paquetes de 1, 5 o 15 reportes y la plataforma acredite los créditos automáticamente vía API:

1. Ve a [developer.paypal.com](https://developer.paypal.com/) e inicia sesión con tu cuenta de PayPal Business.
2. En el menú, ve a **Apps & Credentials**.
3. Selecciona la pestaña **Live** (para producción) o **Sandbox** (para pruebas).
4. Haz clic en **Create App**:
   * **App Name:** `FaroBiografico`
   * **Merchant / Platform:** Merchant
5. Al crear la app, verás tu **Client ID** y tu **Secret**:
   ```env
   PAYPAL_CLIENT_ID="AX...tu_client_id..."
   PAYPAL_CLIENT_SECRET="EL...tu_secret..."
   PAYPAL_MODE="live"
   ```

---

### 2.3 Configurar el Webhook de PayPal (Opcional pero recomendado)

Para que las renovaciones o cancelaciones de suscripción se sincronicen en tiempo real con Supabase:

1. En la misma pantalla de tu app en [developer.paypal.com](https://developer.paypal.com/), baja a la sección **Webhooks** y haz clic en **Add Webhook**.
2. **Webhook URL:**
   ```
   https://tu-dominio.com/api/paypal/webhook
   ```
3. En **Event types**, selecciona:
   * `Payment sale completed`
   * `Billing subscription activated`
   * `Billing subscription cancelled`
   * `Billing subscription suspended`
   * `Checkout order approved`
4. Guarda el webhook.

---

## 3. Paso a Paso: Configurar Payphone (Ecuador)

Tienes **dos opciones**: la rápida (sin código, lista en 3 minutos) o la automatizada por API.

### Opción A (Recomendada y más rápida): Links de Cobro Fijos

1. Abre la app **Payphone** en tu teléfono o entra a [live.payphone.app](https://live.payphone.app/).
2. Ve a **Cobrar &gt; Links de Pago**.
3. Crea un link para cada producto:
   * **Link 1:** `1 Reporte de Trayectoria Vital` -> `$3.99 USD`
   * **Link 2:** `Pack 5 Reportes de Análisis` -> `$14.99 USD`
   * **Link 3:** `Pack Profesional 15 Reportes` -> `$29.99 USD`
   * **Link 4:** `Faro Diario - Audio Matutino` -> `$7.99 USD`
   * **Link 5:** `Rectificación Biográfica Manual` -> `$80.00 USD`
4. Copia los links generados y pégalos en tus variables de entorno en Vercel o en `.env`:
   ```env
   PAYPHONE_URL_SINGLE="https://payphone.app/link/tu_link_1"
   PAYPHONE_URL_PACK5="https://payphone.app/link/tu_link_2"
   PAYPHONE_URL_PACK15="https://payphone.app/link/tu_link_3"
   PAYPHONE_URL_FARO_DIARIO="https://payphone.app/link/tu_link_4"
   PAYPHONE_URL_RECTIFICACION="https://payphone.app/link/tu_link_5"
   ```

---

### Opción B: Integración Automatizada con Token de Desarrollador

Si deseas que el botón de cobro de Payphone se genere automáticamente en pantalla:

1. Ingresa a [developer.payphone.app](https://developer.payphone.app/) con tu cuenta Payphone.
2. Ve a **Aplicaciones &gt; Crear Aplicación**.
3. Copia el **Token de Desarrollador** y colócalo en tu variable:
   ```env
   PAYPHONE_TOKEN="tu_token_de_desarrollador"
   ```
4. El servidor de Faro Biográfico llamará automáticamente a la API de Payphone (`/api/button/Prepare` y `/api/button/Confirm`) para validar las transacciones.

---

## 4. Resumen de Variables de Entorno (.env / Vercel)

Copia este bloque a tus **Environment Variables** en Vercel o en tu archivo `.env`:

```env
# URL de producción de la aplicación
APP_URL="https://www.farobiografico.com"

# --------------------------------------------------------
# 1. PayPal Business (Cobros Globales)
# --------------------------------------------------------
PAYPAL_CLIENT_ID=""
PAYPAL_CLIENT_SECRET=""
PAYPAL_MODE="live"

# Suscripción mensual Faro Diario ($7.99 USD/mes)
PAYPAL_CHECKOUT_URL_FARO_DIARIO="https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=..."
PAYPAL_PLAN_ID_FARO_DIARIO=""

# Enlaces directos opcionales de PayPal
PAYPAL_CHECKOUT_URL_SINGLE=""
PAYPAL_CHECKOUT_URL_PACK5=""
PAYPAL_CHECKOUT_URL_PACK15=""
PAYPAL_CHECKOUT_URL_RECTIFICACION=""

# --------------------------------------------------------
# 2. Payphone (Cobros en Ecuador)
# --------------------------------------------------------
# Token de API Payphone (opcional para cobro dinámico)
PAYPHONE_TOKEN=""

# Links de cobro directos Payphone
PAYPHONE_URL_SINGLE=""
PAYPHONE_URL_PACK5=""
PAYPHONE_URL_PACK15=""
PAYPHONE_URL_FARO_DIARIO=""
PAYPHONE_URL_RECTIFICACION=""
```

---

## 5. Experiencia del Usuario en la Web

Una vez configurado:
* Cuando un usuario abre el monedero o decide suscribirse a **Faro Diario**, tiene un selector intuitivo:
  * 🌎 **PayPal / Tarjetas Internacionales**: para visitantes de cualquier parte de Latinoamérica, Europa, EE.UU., etc.
  * 🇪🇨 **Payphone**: para usuarios en Ecuador que desean pagar con su tarjeta de débito/crédito local o saldo Payphone.
* El sistema guarda su perfil y número de WhatsApp en la base de datos de Supabase antes de abrir la pasarela.
* Al completar el pago, la pasarela regresa a la aplicación con el parámetro de confirmación y los créditos o la suscripción se activan de inmediato.
