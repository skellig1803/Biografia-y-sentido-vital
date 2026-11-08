import React from 'react';
import { Compass, Sparkles, PlusCircle, ShieldCheck, UserCheck } from 'lucide-react';
const logoUrl = '/faro_biografico_logo.jpg';

interface HeaderProps {
  hasCalculated?: boolean;
  creditBalance?: number;
  onOpenCreditsModal?: () => void;
  onOpenLegal?: () => void;
  onOpenRestoreProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  creditBalance = 5,
  onOpenCreditsModal,
  onOpenLegal,
  onOpenRestoreProfile,
}) => {
  return (
    <header className="border-b border-stone-800 bg-stone-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={logoUrl}
              alt="Logo Faro Biográfico"
              className="w-11 h-11 rounded-full object-cover border border-amber-500/50 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/30"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="font-serif text-lg sm:text-xl font-bold text-stone-100 tracking-wide flex items-center gap-2">
              Faro <span className="text-amber-400">Biográfico</span>
            </h1>
            <p className="text-xs text-stone-400 font-sans">
              Efemérides Astronómicas • Cronología de Septenios • Análisis de Desarrollo Personal • Trayectoria Vital
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onOpenRestoreProfile && (
            <button
              type="button"
              onClick={onOpenRestoreProfile}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-950/60 border border-stone-800 hover:border-emerald-500/40 text-stone-300 hover:text-emerald-300 text-xs transition-all cursor-pointer"
              title="Cargar mi perfil natal o recuperar suscripción en este dispositivo"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Mi Perfil</span>
            </button>
          )}

          {onOpenLegal && (
            <button
              type="button"
              onClick={onOpenLegal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-950/60 border border-stone-800 hover:border-purple-500/40 text-stone-400 hover:text-stone-200 text-xs transition-all cursor-pointer"
              title="Centro Legal, Términos y Transparencia"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Legal</span>
            </button>
          )}

          {/* Credit wallet pill & button */}
          {onOpenCreditsModal && (
            <button
              type="button"
              onClick={onOpenCreditsModal}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-950 border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer shadow-sm"
              title="Administrar créditos para lecturas con IA"
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-stone-300 font-medium">
                  {creditBalance} {creditBalance === 1 ? 'Crédito' : 'Créditos'}
                </span>
              </div>
              <div className="flex items-center gap-1 pl-2 border-l border-stone-800 text-[11px] text-amber-400 font-semibold group-hover:text-amber-300">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Recargar</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
