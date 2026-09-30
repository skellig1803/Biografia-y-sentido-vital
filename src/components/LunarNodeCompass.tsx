import React from 'react';
import { LunarNodeData } from '../types';
import { Compass, ArrowUpRight, ArrowDownLeft, Sparkles, Check, X, Milestone } from 'lucide-react';

interface LunarNodeCompassProps {
  lunarNodes: LunarNodeData;
  septenioTitle: string;
}

export const LunarNodeCompass: React.FC<LunarNodeCompassProps> = ({
  lunarNodes,
  septenioTitle,
}) => {
  const { northNode, southNode, nodalCycle } = lunarNodes;

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              Eje Kármico & Dirección Evolutiva
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 mt-2">
            La Brújula del Alma: Dirección del Nodo Lunar
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            El eje nodal señala de dónde viene el alma (Nodo Sur) y la dirección indispensable hacia la que debe caminar (Nodo Norte) para florecer en tu septenio.
          </p>
        </div>

        {/* Nodal Cycle Status */}
        <div className="bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-800 text-xs">
          <div className="text-stone-400 flex items-center gap-1.5 mb-1">
            <Milestone className="w-3.5 h-3.5 text-amber-400" />
            <span>Ciclo Nodal (~18.6 años):</span>
          </div>
          <p className="text-stone-200 font-semibold">
            Próximo retorno: <span className="text-amber-400">{nodalCycle.nextNodalReturnAge} años</span>
            {nodalCycle.yearsUntilReturn > 0 ? ` (en ~${nodalCycle.yearsUntilReturn} años)` : ' (ciclo activo)'}
          </p>
        </div>
      </div>

      {/* Dynamic Nodal Guidance Box */}
      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
        <p className="text-xs text-stone-300 leading-relaxed">
          <strong className="text-emerald-400">Contexto biográfico:</strong> {nodalCycle.cycleMeaning} Al combinarse con tu septenio ({septenioTitle}), el cielo te pide no estancarte en la inercia del pasado y dar un paso consciente hacia tu Nodo Norte.
        </p>
      </div>

      {/* Dual Polar Cards: North Node vs South Node */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* NODO NORTE - DHARMA */}
        <div className="bg-stone-950/90 border border-emerald-500/30 rounded-xl p-5 relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg">
                ☊
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block">
                  Dirección Evolutiva (Dharma)
                </span>
                <h3 className="font-serif text-lg font-bold text-stone-100">
                  Nodo Norte en {northNode.sign}
                </h3>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-stone-300">
              Casa {northNode.house} ({northNode.degree}° {northNode.minute}&apos;)
            </span>
          </div>

          <div className="space-y-2 text-xs text-stone-300">
            <div>
              <strong className="text-emerald-300 block mb-1">El Llamado y la Dirección que Debes Tomar:</strong>
              <p className="leading-relaxed bg-stone-900/60 p-3 rounded-lg border border-stone-800">
                {northNode.dharmaDirection}
              </p>
            </div>

            <div>
              <strong className="text-stone-300 block mb-1">Lección de Vida y Maduración del Alma:</strong>
              <p className="text-stone-400 leading-relaxed">
                {northNode.soulLesson}
              </p>
            </div>

            <div>
              <strong className="text-stone-300 block mb-1">Acción Concreta Recomendada:</strong>
              <p className="text-emerald-200/90 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-900/50">
                {northNode.evolutionaryAction}
              </p>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block mb-2">
              Cualidades a Desarrollar Activamente:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {northNode.strengthsToCultivate.map((str, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs flex items-center gap-1.5"
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  {str}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* NODO SUR - KARMA */}
        <div className="bg-stone-950/90 border border-rose-500/30 rounded-xl p-5 relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-lg">
                ☋
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400 block">
                  Memoria Kármica & Zona de Confort
                </span>
                <h3 className="font-serif text-lg font-bold text-stone-100">
                  Nodo Sur en {southNode.sign}
                </h3>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-stone-300">
              Casa {southNode.house} ({southNode.degree}° {southNode.minute}&apos;)
            </span>
          </div>

          <div className="space-y-2 text-xs text-stone-300">
            <div>
              <strong className="text-amber-300 block mb-1">Dones y Talentos Innatos del Pasado:</strong>
              <p className="leading-relaxed bg-stone-900/60 p-3 rounded-lg border border-stone-800">
                {southNode.pastLifeGifts}
              </p>
            </div>

            <div>
              <strong className="text-rose-300 block mb-1">La Trampa de Confort a Trascender:</strong>
              <p className="text-rose-200/90 bg-rose-950/30 p-2.5 rounded-lg border border-rose-900/50 leading-relaxed">
                {southNode.comfortZoneTrap}
              </p>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 block mb-2">
              Patrones Inconscientes a Soltar:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {southNode.patternsToRelease.map((pat, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs flex items-center gap-1.5"
                >
                  <X className="w-3 h-3 text-rose-400" />
                  {pat}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
