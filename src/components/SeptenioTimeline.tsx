import React, { useState } from 'react';
import { SeptenioData } from '../types';
import { Clock, ShieldAlert, Sparkles, ChevronRight, CheckCircle2, AlertCircle, Compass, History } from 'lucide-react';

interface SeptenioTimelineProps {
  currentSeptenio: SeptenioData;
  allSeptenios: SeptenioData[];
  exactAgeFormatted: string;
  exactAgeYears: number;
}

export const SeptenioTimeline: React.FC<SeptenioTimelineProps> = ({
  currentSeptenio,
  allSeptenios,
  exactAgeFormatted,
  exactAgeYears,
}) => {
  const [selectedSeptenioNumber, setSelectedSeptenioNumber] = useState<number>(currentSeptenio.number);

  const activeViewSeptenio =
    allSeptenios.find((s) => s.number === selectedSeptenioNumber) || currentSeptenio;

  const isCurrentSeptenio = activeViewSeptenio.number === currentSeptenio.number;

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Age & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Edad Exacta: {exactAgeFormatted}
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-stone-800 text-stone-300">
              {activeViewSeptenio.phase}
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 mt-2">
            Guía del Septenio Biográfico Antroposófico
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Basado en los ritmos evolutivos del ser humano de Rudolf Steiner y Bernard Lievegoed
          </p>
        </div>

        {/* Quick button to return to current septenio if viewing another */}
        {!isCurrentSeptenio && (
          <button
            type="button"
            onClick={() => setSelectedSeptenioNumber(currentSeptenio.number)}
            className="self-start sm:self-auto text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            Volver a mi Septenio Actual ({currentSeptenio.ageRange})
          </button>
        )}
      </div>

      {/* Interactive Septenios Selector Bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
          <span>Línea del Tiempo Biográfica (Haz clic en cualquier septenio):</span>
          <span className="text-amber-400 font-medium">
            Septenio {activeViewSeptenio.number} de 10
          </span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 bg-stone-950 p-2 rounded-xl border border-stone-800">
          {allSeptenios.map((s) => {
            const isSelected = s.number === selectedSeptenioNumber;
            const isUserCurrent = s.number === currentSeptenio.number;
            const isPast = exactAgeYears >= s.endAge;

            return (
              <button
                key={s.number}
                type="button"
                onClick={() => setSelectedSeptenioNumber(s.number)}
                className={`flex flex-col items-center py-2 px-1 rounded-lg text-center transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/50 shadow-sm'
                    : isUserCurrent
                    ? 'bg-stone-800 text-stone-100 border border-stone-600'
                    : isPast
                    ? 'text-stone-400 hover:bg-stone-800/50'
                    : 'text-stone-500 hover:bg-stone-800/30'
                }`}
              >
                {isUserCurrent && (
                  <span className="absolute -top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-stone-900" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  S{s.number}
                </span>
                <span className="text-[11px] font-medium leading-tight mt-0.5">
                  {s.startAge}-{s.endAge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Active Septenio Card */}
      <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                {activeViewSeptenio.ageRange}
              </span>
              <span className="text-xs text-stone-400">
                Esfera planetaria: <strong className="text-stone-300">{activeViewSeptenio.planetarySphere}</strong>
              </span>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-100 mt-1.5">
              {activeViewSeptenio.archetypalTitle}
            </h3>
          </div>

          {/* Progress within cycle if current */}
          {isCurrentSeptenio && (
            <div className="bg-stone-900 px-3.5 py-2 rounded-xl border border-stone-800 flex flex-col min-w-[170px]">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-stone-400">Progreso en el ciclo:</span>
                <span className="text-amber-400 font-bold">{activeViewSeptenio.progressPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                  style={{ width: `${activeViewSeptenio.progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Existential Question */}
        <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-400 block mb-0.5">
              Pregunta Arquetípica del Alma en este Septenio:
            </span>
            <p className="text-sm font-serif italic text-stone-200">
              &ldquo;{activeViewSeptenio.coreQuestion}&rdquo;
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="text-sm text-stone-300 leading-relaxed space-y-2">
          <p>{activeViewSeptenio.description}</p>
          <p className="text-xs text-stone-400 pt-1">
            <strong>Concepto antroposófico clave:</strong> {activeViewSeptenio.steinerConcept}
          </p>
        </div>

        {/* Retos de la Edad Actual */}
        <div className="pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 mb-3">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Retos y Desafíos Evolutivos de esta Etapa de Vida
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {activeViewSeptenio.ageSpecificChallenges.map((challenge, idx) => (
              <div
                key={idx}
                className="p-3 bg-stone-900 border border-stone-800/90 rounded-xl text-xs text-stone-300 flex items-start gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>{challenge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hitos Biográficos del Septenio */}
        {activeViewSeptenio.currentMilestones.length > 0 && (
          <div className="pt-3 border-t border-stone-800/80">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5 mb-2.5">
              <History className="w-4 h-4 text-stone-400" />
              Hitos y Encrucijadas Clave del Septenio ({activeViewSeptenio.ageRange})
            </h4>
            <div className="space-y-2">
              {activeViewSeptenio.currentMilestones.map((m) => (
                <div
                  key={m.age}
                  className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    m.isCurrent
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      : m.isPast
                      ? 'bg-stone-900/60 border-stone-800 text-stone-400'
                      : 'bg-stone-900/40 border-stone-800/60 text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {m.isCurrent ? (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : m.isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-stone-600 flex items-center justify-center text-[9px] text-stone-500">
                        ○
                      </div>
                    )}
                    <div>
                      <strong className="text-stone-100 text-sm font-medium">{m.title} (~{m.age} años):</strong>
                      <span className="ml-1.5 text-stone-300">{m.description}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold self-start sm:self-auto shrink-0 ${
                      m.isCurrent
                        ? 'bg-amber-400 text-stone-950'
                        : m.isPast
                        ? 'bg-stone-800 text-stone-400'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {m.isCurrent ? 'HITO ACTIVO AHORA' : m.isPast ? 'Integrado' : 'Próximo umbral'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
