import React from 'react';
import { Compass } from 'lucide-react';

interface HeaderProps {
  hasCalculated?: boolean;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="border-b border-stone-800 bg-stone-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-inner">
            <Compass className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="font-serif text-lg sm:text-xl font-bold text-stone-100 tracking-wide flex items-center gap-2">
              Carta Natal <span className="text-amber-400">&</span> Biografía Antroposófica
            </h1>
            <p className="text-xs text-stone-400 font-sans">
              Efemérides Suizas (Plácidus) • Septenios de Steiner • Eje Nodal • Tránsitos Celestes
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
