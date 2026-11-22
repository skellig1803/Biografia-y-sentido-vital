import React, { useState } from 'react';
import { BirthData } from '../types';
import {
  X,
  UserCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';

interface RestoreProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileRestored: (birthData: BirthData) => void;
}

export const RestoreProfileModal: React.FC<RestoreProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileRestored,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setFoundUser(null);

    try {
      const q = encodeURIComponent(identifier.trim());
      const res = await fetch(`/api/user/profile?q=${q}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al buscar el perfil.');
      }

      if (!data.found || !data.user) {
        setErrorMsg('No encontramos ningún perfil registrado con ese correo o número de WhatsApp.');
        return;
      }

      setFoundUser(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!foundUser) return;

    const restoredData: BirthData = {
      name: foundUser.nombre,
      birthDate: foundUser.fecha_nacimiento,
      birthTime: foundUser.hora_nacimiento || '12:00',
      placeName: foundUser.lugar_nacimiento || 'Desconocido',
      latitude: typeof foundUser.latitude === 'number' ? foundUser.latitude : 0,
      longitude: typeof foundUser.longitude === 'number' ? foundUser.longitude : 0,
      timezoneOffset: 0,
      ianaTimeZone: foundUser.timezone || 'America/Bogota',
      nodeType: 'mean',
    };

    onProfileRestored(restoredData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950/40 p-5 border-b border-stone-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Dispositivo Nuevo o Reinstalación
              </span>
              <h3 className="font-serif text-lg font-bold text-stone-100">
                Recuperar / Cargar mi Perfil
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

        {/* Search body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-stone-300 leading-relaxed">
            Si te conectas desde otro dispositivo, cambiaste de navegador o borraste las cookies, ingresa tu <strong>correo electrónico</strong> o tu <strong>número de WhatsApp</strong> para cargar tu ficha y calcular tu carta natal al instante:
          </p>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                required
                placeholder="tu-correo@ejemplo.com o +593999429478"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Buscar</span>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User Found Card */}
          {foundUser && (
            <div className="p-4 rounded-xl bg-stone-950 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300">
                    ¡Perfil encontrado!
                  </span>
                </div>
                {foundUser.suscripcion_activa && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Suscripción Activa
                  </span>
                )}
              </div>

              <div className="text-xs space-y-1.5 text-stone-300 pt-1">
                <p>
                  <strong>Nombre:</strong> {foundUser.nombre}
                </p>
                <p className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    {foundUser.fecha_nacimiento} a las {foundUser.hora_nacimiento || '12:00'}
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>{foundUser.lugar_nacimiento || 'Lugar guardado'}</span>
                </p>
                {foundUser.whatsapp && (
                  <p className="flex items-center gap-1.5 text-emerald-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp: {foundUser.whatsapp}</span>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleApply}
                className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-stone-950 text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                <span>Cargar esta Carta y Activar en Pantalla</span>
              </button>
            </div>
          )}

          {/* Direct Support Note */}
          <div className="p-3 rounded-xl bg-stone-950/50 border border-stone-800 text-[11px] text-stone-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span>
                ¿Necesitas ayuda con tu suscripción o cambiar tu WhatsApp? Escríbenos directamente al <strong>+593 99 942 9478</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
