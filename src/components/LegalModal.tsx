import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  RotateCcw,
  Lock,
  Mail,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';

export type LegalTab = 'terms' | 'refund' | 'privacy' | 'compliance' | 'polar_guide';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2
                id="legal-modal-title"
                className="text-base sm:text-xl font-serif font-bold text-stone-100 flex items-center gap-2"
              >
                Centro Legal, Transparencia & Cumplimiento
              </h2>
              <p className="text-xs text-stone-400">
                Faro Biográfico • Plataforma SaaS de Informes Biográficos y Desarrollo Personal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 transition-colors cursor-pointer"
            aria-label="Cerrar ventana legal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-stone-950/40 px-3 sm:px-6 overflow-x-auto scrollbar-none gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'terms'
                ? 'border-purple-400 text-purple-300 bg-purple-500/5'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Términos de Servicio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('refund')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'refund'
                ? 'border-purple-400 text-purple-300 bg-purple-500/5'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Política de Reembolso</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-purple-400 text-purple-300 bg-purple-500/5'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacidad y Datos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compliance')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'compliance'
                ? 'border-purple-400 text-purple-300 bg-purple-500/5'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Aviso Legal & Pasarelas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('polar_guide')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'polar_guide'
                ? 'border-blue-400 text-blue-300 bg-blue-500/5'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>Guía Polar.sh</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs sm:text-sm leading-relaxed text-stone-300">
          {/* TAB 1: TÉRMINOS DE SERVICIO */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-stone-200">
                <h3 className="font-semibold text-purple-300 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Naturaleza del Software y Licencia de Uso
                </h3>
                <p className="text-xs text-stone-300">
                  <strong>Faro Biográfico</strong> es una plataforma de software como servicio (SaaS) diseñada para la generación automatizada de informes de análisis biográfico, ciclos temporales de septenios y cálculo de efemérides astronómicas asistidas por modelos de lenguaje de inteligencia artificial.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">1. Objeto del Servicio y No Adivinación</h4>
                <p className="text-stone-300 mb-2">
                  La plataforma opera como una herramienta computacional y analítica orientada al desarrollo personal, la auto-observación y la estructuración de la trayectoria vital individual basada en la metodología de septenios (desarrollada en la psicología humanista y antropológica por autores como Bernard Lievegoed y Rudolf Steiner), combinada con cálculos efemérides astronómicos de alta precisión matemática.
                </p>
                <div className="p-3 rounded-lg bg-stone-950 border border-stone-800 text-stone-400 text-xs">
                  <strong className="text-amber-400 block mb-1">Exclusión explícita de servicios regulados y esoterismo:</strong>
                  Faro Biográfico <strong>no proporciona</strong> servicios de adivinación, predicción determinista del futuro, tarot, hechicería, curanderismo ni consultas ocultistas o de naturaleza similar. Tampoco sustituye en ningún caso la atención, diagnóstico o tratamiento médico, psiquiátrico, psicológico ni el asesoramiento legal o financiero profesional.
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">2. Modelo de Tarifas y Licencias de Uso</h4>
                <ul className="list-disc pl-5 space-y-1.5 text-stone-300 text-xs sm:text-sm">
                  <li>
                    <strong>Créditos de Informes con IA:</strong> Se adquieren en modalidad de pago único (one-time purchase). Cada crédito autoriza el procesamiento computacional de 1 Informe de Trayectoria Vital con IA. Los créditos no caducan.
                  </li>
                  <li>
                    <strong>Pack Profesional (15 Reportes):</strong> Incluye autorización expresa para que consultores, coaches, psicólogos y mentores de desarrollo personal utilicen los informes generados como material de apoyo en sus sesiones privadas.
                  </li>
                  <li>
                    <strong>Suscripción «Faro Diario»:</strong> Modalidad recurrente mensual ($7.99 USD/mes). Concede acceso prioritario a micro-audios diarios de 45 segundos analizando la coyuntura del día. Puede cancelarse en cualquier momento desde el portal de facturación de Polar.sh sin penalización.
                  </li>
                  <li>
                    <strong>Rectificación Biográfica Artesanal:</strong> Servicio individualizado de entrega diferida en un plazo estimado de 3 días laborables, llevado a cabo mediante análisis técnico de atacires y cronología vital comprobable.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">3. Entrega Digital de los Productos</h4>
                <p className="text-stone-300 text-xs sm:text-sm">
                  Los informes con IA se generan de forma instantánea y digital tras la confirmación de la transacción en la pasarela de pago o tras la redención del crédito correspondiente. El usuario puede visualizar el contenido en pantalla, exportarlo a PDF o guardarlo en su navegador.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">4. Pasarela de Pago y Comerciante Registrado</h4>
                <p className="text-stone-300 text-xs sm:text-sm">
                  Los cobros son procesados a través de <strong>Polar.sh</strong> (Polar Software Inc.), actuando como <em>Merchant of Record (MoR)</em>. Polar.sh se encarga de la recaudación segura de fondos, el cálculo y remisión automática de impuestos (IVA, Sales Tax, GST) y la emisión de facturas oficiales válidas para deducción fiscal.
                </p>
              </div>

              <div className="pt-2 text-stone-500 text-xs border-t border-stone-800">
                Última actualización de los Términos: Octubre de 2026.
              </div>
            </div>
          )}

          {/* TAB 2: POLÍTICA DE REEMBOLSO */}
          {activeTab === 'refund' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-stone-200">
                <h3 className="font-semibold text-emerald-300 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  Política de Cancelación y Reembolsos Transparentes
                </h3>
                <p className="text-xs text-stone-300">
                  Queremos que operes con total tranquilidad. Nuestra política cumple estrictamente los estándares internacionales del comercio electrónico y las directrices de Polar.sh, Stripe y las redes de tarjetas Visa y Mastercard.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">1. Paquetes de Créditos para Informes</h4>
                <div className="space-y-2 text-xs sm:text-sm text-stone-300">
                  <p>
                    <strong>Garantía de 14 días para créditos no utilizados:</strong> Si adquieres un paquete de créditos (1, 5 o 15 reportes) y por cualquier razón decides no utilizarlos, puedes solicitar un reembolso íntegro durante los primeros <strong>14 días naturales</strong> posteriores a la compra, siempre que los créditos no hayan sido consumidos.
                  </p>
                  <p className="p-3 rounded-lg bg-stone-950 border border-stone-800 text-stone-400 text-xs">
                    <em>Consumo y costes computacionales:</em> Una vez que un crédito es ejecutado y el modelo de IA genera el informe solicitado en pantalla, el coste de computación en tiempo real se perfecciona y dicho informe individual no será reembolsable, salvo que ocurra un error técnico verificable en el sistema.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">2. Suscripciones Recurrentes («Faro Diario»)</h4>
                <p className="text-stone-300 text-xs sm:text-sm mb-2">
                  Puedes cancelar tu suscripción mensual en cualquier instante con un solo clic a través del <strong>Portal de Clientes de Polar.sh</strong> o enviando una solicitud a nuestro correo de soporte.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-stone-300 text-xs">
                  <li>No existen cláusulas de permanencia ni penalizaciones por cancelación.</li>
                  <li>Al cancelar, mantendrás acceso completo a los audios y funciones hasta el término del ciclo mensual facturado.</li>
                  <li>Si se te cobró una renovación involuntaria por olvido, puedes solicitar el reembolso dentro de las primeras 48 horas tras el cargo si no hiciste uso del servicio en ese ciclo.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">3. Rectificación Biográfica Manual</h4>
                <p className="text-stone-300 text-xs sm:text-sm">
                  Al tratarse de una labor artesanal de investigación cronológica realizada por un especialista técnico, el reembolso es aplicable al 100% si se cancela dentro de las primeras <strong>24 horas</strong> tras la contratación. Una vez comenzado el trabajo de cotejo técnico y redacción, se evaluará el reembolso proporcional según el estado de avance.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">4. Garantía por Incidencias Técnicas</h4>
                <p className="text-stone-300 text-xs sm:text-sm">
                  Si un informe no se genera correctamente por un fallo en el servidor o caída del servicio de la API de IA, el sistema restaurará automáticamente el crédito a tu balance. Si lo prefieres, nuestro equipo de soporte te repondrá el crédito de forma inmediata o emitirá el reembolso completo si no deseas continuar.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-stone-200 font-semibold block text-xs">¿Cómo solicitar un reembolso?</span>
                  <span className="text-stone-400 text-xs">Escríbenos con el ID de tu orden o correo de compra. Respuesta garantizada en &lt; 24h.</span>
                </div>
                <a
                  href="mailto:soporte@farobiografico.com?subject=Solicitud%20de%20Reembolso%20Faro%20Biogr%C3%A1fico"
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-purple-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contactar Soporte</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: POLÍTICA DE PRIVACIDAD */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-stone-200">
                <h3 className="font-semibold text-blue-300 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-blue-400" />
                  Privacidad Estricta y Cero Venta de Datos Personales
                </h3>
                <p className="text-xs text-stone-300">
                  Tu fecha, hora y ciudad de nacimiento son datos sensibles de carácter privado. En Faro Biográfico aplicamos principios de minimización de datos conforme al RGPD (Europa) y la CCPA (California).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">1. Qué Datos Recolectamos y Para Qué</h4>
                <ul className="list-disc pl-5 space-y-1.5 text-stone-300 text-xs sm:text-sm">
                  <li>
                    <strong>Datos cronológicos y geográficos:</strong> Fecha, hora y coordenadas (latitud/longitud) del lugar de nacimiento. Se utilizan <em>únicamente</em> para calcular las posiciones astronómicas exactas en las efemérides y deducir la cronología de septenios.
                  </li>
                  <li>
                    <strong>Dirección de correo electrónico:</strong> Solicitada al realizar el pago a través de Polar.sh con el fin de enviar los recibos de compra, facturas legales y permitir la gestión del balance de créditos o suscripciones.
                  </li>
                  <li>
                    <strong>Datos de navegación anónimos:</strong> Métricas agregadas de rendimiento provistas por Vercel Analytics, sin rastreadores invasivos de publicidad ni cookies de terceros para venta de datos.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">2. Seguridad en las Transacciones de Pago</h4>
                <p className="text-stone-300 text-xs sm:text-sm">
                  Faro Biográfico <strong>nunca almacena, procesa ni tiene acceso a tus números de tarjeta de crédito, CVV o credenciales bancarias</strong>. Todos los datos de pago son gestionados directamente por los servidores seguros y certificados PCI-DSS Nivel 1 de <strong>Polar.sh</strong> y sus proveedores de infraestructura bancaria.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">3. Derechos del Usuario (ARCO)</h4>
                <p className="text-stone-300 text-xs sm:text-sm">
                  Tienes pleno derecho a solicitar el acceso, rectificación, portabilidad o supresión total de tus datos personales e informes generados en cualquier momento contactándonos en <code>privacidad@farobiografico.com</code>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: AVISO LEGAL & COMPLIANCE */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-stone-200">
                <h3 className="font-semibold text-amber-300 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  Identificación Comercial y Declaración de Cumplimiento
                </h3>
                <p className="text-xs text-stone-300">
                  Esta información está diseñada para la verificación y auditoría por parte de los equipos de Risk & Compliance de pasarelas de pago (Polar.sh, Stripe, Paddle, Lemon Squeezy).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5">
                  <span className="text-stone-400 font-medium block">Nombre Comercial del Producto:</span>
                  <span className="text-stone-100 font-bold text-sm block">Faro Biográfico (Biographical Lighthouse SaaS)</span>
                  <span className="text-stone-400 font-medium block mt-2">Categoría del Software:</span>
                  <span className="text-purple-300 font-semibold block">SaaS / Herramienta Digital de Desarrollo Personal</span>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5">
                  <span className="text-stone-400 font-medium block">Modelo de Negocio:</span>
                  <span className="text-stone-100 font-bold block">Pago por uso (Créditos de Informes) + Suscripción</span>
                  <span className="text-stone-400 font-medium block mt-2">Moneda de Facturación:</span>
                  <span className="text-emerald-300 font-semibold block">Dólares Estadounidenses (USD)</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">Descripción del Negocio para Revisión de Compliance:</h4>
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 leading-relaxed font-mono">
                  &ldquo;Faro Biográfico is a personal development and biographical analysis SaaS platform. It combines astronomical ephemeris algorithms and biographical septennial life cycle methodologies to generate automated, AI-assisted self-reflection reports for individuals, coaches, and counselors. The business sells digital software credits for automated reports and an optional daily personal development audio subscription processed via Polar.sh as Merchant of Record. It does not provide fortune-telling, occultism, or medical advice.&rdquo;
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-100 text-sm mb-2">Canal de Contacto y Asistencia Oficial</h4>
                <p className="text-stone-300 text-xs">
                  Para consultas administrativas, corporativas o verificación de cuentas de pago:
                </p>
                <div className="mt-2 text-xs text-stone-300 space-y-1">
                  <div><strong>Email de Soporte:</strong> soporte@farobiografico.com / rodriguezb.jl@gmail.com</div>
                  <div><strong>Tiempo de Respuesta Estimado:</strong> Máximo 24 a 48 horas laborables.</div>
                  <div><strong>Plataforma de Facturación:</strong> Polar Software Inc. (Merchant of Record).</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GUÍA PARA ACTIVAR POLAR.SH */}
          {activeTab === 'polar_guide' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-stone-200">
                <h3 className="font-semibold text-blue-300 text-sm sm:text-base flex items-center gap-2 mb-1">
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  Guía Paso a Paso: Cómo Obtener los Datos Requeridos de Polar.sh
                </h3>
                <p className="text-xs text-stone-300">
                  Sigue estos pasos sencillos en tu panel de <a href="https://polar.sh" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">polar.sh</a> para crear los productos y obtener los enlaces directos o claves de integración.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-stone-950 font-bold text-xs flex items-center justify-center">1</span>
                    <h4 className="font-bold text-stone-100 text-sm">Crea tu Organización en Polar.sh</h4>
                  </div>
                  <p className="text-xs text-stone-300 pl-7">
                    Ve a <strong>polar.sh</strong> e inicia sesión (puedes usar GitHub o correo). Crea una organización, por ejemplo: <code>faro-biografico</code>. El nombre o identificador que elijas es tu <strong>POLAR_ORGANIZATION_SLUG</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-stone-950 font-bold text-xs flex items-center justify-center">2</span>
                    <h4 className="font-bold text-stone-100 text-sm">Crea los Productos según tu Tabla de Precios</h4>
                  </div>
                  <div className="text-xs text-stone-300 pl-7 space-y-2">
                    <p>En el menú lateral de Polar.sh, haz clic en <strong>Products &gt; New Product</strong> para cada uno de los siguientes:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                      <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                        <strong className="text-stone-200 block">1. Reporte Vital</strong>
                        <span className="text-emerald-400 font-bold">$3.99 USD</span>
                        <div className="text-[11px] text-stone-400">Tipo: One-time payment</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                        <strong className="text-stone-200 block">2. Pack 5 Reportes</strong>
                        <span className="text-emerald-400 font-bold">$14.99 USD</span>
                        <div className="text-[11px] text-stone-400">Tipo: One-time payment</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                        <strong className="text-stone-200 block">3. Pack Profesional (15)</strong>
                        <span className="text-emerald-400 font-bold">$29.99 USD</span>
                        <div className="text-[11px] text-stone-400">Tipo: One-time payment</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                        <strong className="text-stone-200 block">4. Faro Diario (Audio PWA)</strong>
                        <span className="text-cyan-400 font-bold">$7.99 USD / mes</span>
                        <div className="text-[11px] text-stone-400">Tipo: Recurring Subscription (Monthly)</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                        <strong className="text-stone-200 block">5. Rectificación Artesanal</strong>
                        <span className="text-amber-400 font-bold">$80.00 USD</span>
                        <div className="text-[11px] text-stone-400">Tipo: One-time payment</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-stone-950 font-bold text-xs flex items-center justify-center">3</span>
                    <h4 className="font-bold text-stone-100 text-sm">Obtén los Enlaces de Checkout (Checkout URLs)</h4>
                  </div>
                  <div className="text-xs text-stone-300 pl-7 space-y-1">
                    <p>
                      Al publicar cada producto, Polar te brinda un enlace directo como:
                    </p>
                    <code className="block p-2 rounded bg-stone-900 border border-stone-800 text-blue-300 font-mono text-[11px]">
                      https://polar.sh/checkout/prod_xxxxxx o https://polar.sh/tu-organizacion/products/slug-del-producto
                    </code>
                    <p className="text-stone-400 text-[11px] mt-1">
                      Esos enlaces se configuran en tus variables de entorno (<code>.env</code> o en el panel de Vercel/Render) como <code>POLAR_CHECKOUT_URL_SINGLE</code>, <code>POLAR_CHECKOUT_URL_PACK5</code>, etc.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-stone-950 font-bold text-xs flex items-center justify-center">4</span>
                    <h4 className="font-bold text-stone-100 text-sm">Obtén tu Access Token y Webhook Secret</h4>
                  </div>
                  <div className="text-xs text-stone-300 pl-7 space-y-2">
                    <p>
                      Para la confirmación automática por backend:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-stone-300 text-xs">
                      <li>
                        <strong>Access Token:</strong> En tu panel de Polar, ve a <strong>Settings &gt; Developers &gt; Personal Access Tokens</strong> y genera uno con permisos sobre tu organización. Asígnalo a <code>POLAR_ACCESS_TOKEN</code>.
                      </li>
                      <li>
                        <strong>Webhooks:</strong> Ve a <strong>Settings &gt; Developers &gt; Webhooks &gt; Add Endpoint</strong>. Introduce la URL de tu app: <code>https://tu-dominio.com/api/webhooks/polar</code> y selecciona los eventos <code>order.created</code> y <code>subscription.created</code>. Copia el secreto asignado en <code>POLAR_WEBHOOK_SECRET</code>.
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-stone-950 font-bold text-xs flex items-center justify-center">5</span>
                    <h4 className="font-bold text-stone-100 text-sm">Aprobación de la Cuenta en Polar.sh</h4>
                  </div>
                  <p className="text-xs text-stone-300 pl-7">
                    Cuando Polar te solicite los enlaces de tu sitio para verificar tu cumplimiento comercial, solo debes ingresar la URL de tu aplicación. Los auditores de Polar podrán revisar directamente en el pie de página los <strong>Términos de Servicio</strong>, la <strong>Política de Reembolso</strong> y la <strong>Política de Privacidad</strong> que acabamos de implementar.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-800 bg-stone-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span>Documentos conformes con normativas de comercio digital y Merchant of Record.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium transition-colors cursor-pointer"
          >
            Entendido y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
