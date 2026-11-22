import React, { useState, useEffect } from 'react';
import { BirthData } from '../types';
import {
  X,
  Sparkles,
  Headphones,
  Check,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Volume2,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
} from 'lucide-react';

interface SubscriptionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBirthData: BirthData;
  onApplyBirthData?: (data: BirthData) => void;
  checkoutUrl?: string | null;
}

export const SubscriptionConfirmModal: React.FC<SubscriptionConfirmModalProps> = ({
  isOpen,
  onClose,
  currentBirthData,
  onApplyBirthData,
  checkoutUrl,
}) => {
  const isDefaultDemo = currentBirthData.name === 'Rudolf Steiner';

  const [name, setName] = useState(isDefaultDemo ? '' : currentBirthData.name);
  const [birthDate, setBirthDate] = useState(isDefaultDemo ? '' : currentBirthData.birthDate);
  const [birthTime, setBirthTime] = useState(isDefaultDemo ? '12:00' : currentBirthData.birthTime);
  const [placeName, setPlaceName] = useState(isDefaultDemo ? '' : currentBirthData.placeName);
  const [latitude, setLatitude] = useState<number>(currentBirthData.latitude);
  const [longitude, setLongitude] = useState<number>(currentBirthData.longitude);
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Audio preview state
  const [isGeneratingTestAudio, setIsGeneratingTestAudio] = useState(false);
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentBirthData.name === 'Rudolf Steiner') {
        setName('');
        setBirthDate('');
        setBirthTime('12:00');
        setPlaceName('');
      } else {
        setName(currentBirthData.name);
        setBirthDate(currentBirthData.birthDate);
        setBirthTime(currentBirthData.birthTime);
        setPlaceName(currentBirthData.placeName);
        setLatitude(currentBirthData.latitude);
        setLongitude(currentBirthData.longitude);
      }
      setStatusMsg(null);
      setTestAudioUrl(null);
    }
  }, [isOpen, currentBirthData]);

  if (!isOpen) return null;

  const handleTestAudio = async () => {
    if (!name.trim() || !birthDate) {
      setStatusMsg({
        type: 'error',
        text: 'Por favor ingresa al menos tu nombre y fecha de nacimiento para generar el audio de prueba.',
      });
      return;
    }

    setIsGeneratingTestAudio(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/scheduler/test-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: name.trim(),
          fecha_nacimiento: birthDate,
          hora_nacimiento: birthTime || '12:00',
          lugar_nacimiento: placeName || 'Desconocido',
          latitude: latitude || 0,
          longitude: longitude || 0,
          timezone: currentBirthData.ianaTimeZone || 'America/Bogota',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo generar el audio de prueba.');
      }

      setTestAudioUrl(data.audioDataUrl);
      setStatusMsg({
        type: 'success',
        text: '¡Audio de prueba generado exitosamente con el cielo de hoy!',
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Error al probar audio: ${err.message}`,
      });
    } finally {
      setIsGeneratingTestAudio(false);
    }
  };

  const handleSaveAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setStatusMsg({ type: 'error', text: 'Por favor ingresa tu nombre completo.' });
      return;
    }
    if (!birthDate) {
      setStatusMsg({ type: 'error', text: 'Por favor ingresa tu fecha de nacimiento.' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setStatusMsg({
        type: 'error',
        text: 'Por favor ingresa un correo electrónico válido (el mismo con el que te suscribirás en Polar).',
      });
      return;
    }
    if (!whatsapp.trim() || whatsapp.trim().length < 8) {
      setStatusMsg({
        type: 'error',
        text: 'Por favor ingresa tu número de WhatsApp con código de país (ej. +593 99 942 9478).',
      });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        nombre: name.trim(),
        fecha_nacimiento: birthDate,
        hora_nacimiento: birthTime || '12:00',
        lugar_nacimiento: placeName || 'Desconocido',
        latitude: latitude || 0,
        longitude: longitude || 0,
        timezone: currentBirthData.ianaTimeZone || 'America/Bogota',
        whatsapp: whatsapp.trim(),
      };

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar perfil en el servidor.');
      }

      // Update in local client state too
      if (onApplyBirthData) {
        onApplyBirthData({
          name: name.trim(),
          birthDate,
          birthTime: birthTime || '12:00',
          placeName: placeName || 'Desconocido',
          latitude: latitude || 0,
          longitude: longitude || 0,
          timezoneOffset: currentBirthData.timezoneOffset || 0,
          ianaTimeZone: currentBirthData.ianaTimeZone || 'America/Bogota',
          nodeType: currentBirthData.nodeType || 'mean',
        });
      }

      // Open Polar Checkout if available
      const targetCheckout =
        checkoutUrl ||
        'https://polar.sh/checkout'; // Fallback
      
      window.open(targetCheckout, '_blank', 'noopener,noreferrer');
      onClose();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Error al vincular tus datos: ${err.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-stone-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950/40 p-5 border-b border-stone-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Faro Diario • Suscripción Mensual ($7.99 USD)
              </span>
              <h3 className="font-serif text-lg font-bold text-stone-100">
                Confirmación de Ficha Natal y WhatsApp
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSaveAndProceed} className="p-6 space-y-4">
          {/* Default Steiner Demo Warning Banner */}
          {isDefaultDemo ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Aún no has configurado tus datos personales.</strong>
                <p className="text-[11px] text-stone-300 mt-0.5">
                  La pantalla tenía cargada la carta de ejemplo de Rudolf Steiner. Ingresa tus datos reales para que el audio diario corresponda a tu mapa biográfico.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-300 flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span>
                  Confirmando datos natales para <strong>{name || currentBirthData.name}</strong>. Puedes corregir cualquier dato antes de proceder al pago.
                </span>
              </div>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nombre */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Nombre del Titular del Audio
              </label>
              <input
                type="text"
                required
                placeholder="Ej: María Elena Gómez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            {/* Hora de Nacimiento */}
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Hora de Nacimiento (Aprox.)
              </label>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            {/* Ciudad / Lugar */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Lugar / Ciudad de Nacimiento
              </label>
              <input
                type="text"
                placeholder="Ej: Quito, Ecuador o Bogotá, Colombia"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            {/* Correo Electrónico (para Polar y recuperación) */}
            <div className="sm:col-span-2 border-t border-stone-800 pt-3">
              <label className="block text-xs font-medium text-stone-200 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                Correo Electrónico (Mismo de tu suscripción en Polar)
              </label>
              <input
                type="email"
                required
                placeholder="tu-correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500/60"
              />
              <span className="text-[10px] text-stone-500 mt-1 block">
                Este correo te servirá para recuperar tu perfil en cualquier dispositivo nuevo.
              </span>
            </div>

            {/* WhatsApp para entrega matutina */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-emerald-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                Número de WhatsApp para Entrega Matutina
              </label>
              <input
                type="tel"
                required
                placeholder="+593 99 942 9478 o +34 612 345 678"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-emerald-500/40 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Incluye siempre el código de país (+593 para Ecuador, +57 Colombia, +34 España, etc.)
              </span>
            </div>
          </div>

          {/* Test Audio Section */}
          <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-200">
                <Volume2 className="w-4 h-4 text-amber-400" />
                ¿Quieres escuchar cómo sonará tu audio de hoy?
              </div>
              <button
                type="button"
                disabled={isGeneratingTestAudio}
                onClick={handleTestAudio}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isGeneratingTestAudio ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Calculando cielo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Probar Audio Ahora</span>
                  </>
                )}
              </button>
            </div>

            {testAudioUrl && (
              <div className="mt-2 pt-2 border-t border-stone-800">
                <audio controls src={testAudioUrl} className="w-full h-8" autoPlay />
                <span className="text-[10px] text-emerald-400 mt-1 block">
                  ✓ Generado con Swiss Ephemeris y voz Gemini TTS para el día de hoy.
                </span>
              </div>
            )}
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-lg text-xs ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl font-semibold text-xs bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando perfil...</span>
                </>
              ) : (
                <>
                  <span>Guardar y Proceder a Polar ($7.99/mes)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
