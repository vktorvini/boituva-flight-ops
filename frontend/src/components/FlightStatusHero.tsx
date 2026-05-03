import React from "react";

interface Props {
  status: "SAFE" | "WARNING" | "PROHIBITED";
  riskScore: number;
  mainReason?: string;
  confidence?: number;
  sourceCount?: number;
}

export default function FlightStatusHero({ status, riskScore, mainReason, confidence, sourceCount }: Props) {
  let bgColor = "";
  let icon = "";
  let title = "";
  let message = "";
  let textColor = "";
  let barColor = "";
  let glowColor = "";

  if (status === "SAFE") {
    bgColor = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/30";
    textColor = "text-emerald-800 dark:text-emerald-300";
    icon = "🟢";
    title = "VOO LIBERADO";
    message = "Condições ideais para voo";
    barColor = "from-emerald-400 to-emerald-500";
    glowColor = "shadow-emerald-500/10";
  } else if (status === "WARNING") {
    bgColor = "bg-amber-50 dark:bg-amber-950/30 border-amber-500/30";
    textColor = "text-amber-800 dark:text-amber-300";
    icon = "🟡";
    title = "ATENÇÃO";
    message = "Condições instáveis, monitorar";
    barColor = "from-amber-400 to-amber-500";
    glowColor = "shadow-amber-500/10";
  } else {
    bgColor = "bg-rose-50 dark:bg-rose-950/30 border-rose-500/30";
    textColor = "text-rose-800 dark:text-rose-300";
    icon = "🔴";
    title = "VOO CANCELADO";
    message = "Risco elevado, voo não recomendado";
    barColor = "from-rose-400 to-rose-500";
    glowColor = "shadow-rose-500/10";
  }

  const confidencePct = confidence != null ? Math.round(confidence * 100) : null;

  return (
    <div className={`w-full rounded-3xl border-2 p-8 md:p-10 flex flex-col items-center justify-center text-center shadow-2xl ${glowColor} transition-all duration-700 ${bgColor} ${textColor}`}>
      {/* Status Principal */}
      <div className="flex flex-col items-center gap-3 mb-3">
        <span className="text-5xl md:text-6xl drop-shadow-md">{icon}</span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
          {title}
        </h1>
      </div>
      
      {/* Frase Operacional */}
      <p className="text-lg md:text-2xl font-semibold opacity-80 mb-1">
        {message}
      </p>
      
      {/* Motivo Principal — Destaque */}
      {mainReason && (
        <div className="mt-3 mb-4 px-5 py-2.5 rounded-2xl bg-black/8 dark:bg-white/8 border border-black/5 dark:border-white/5 max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-0.5">Motivo principal</p>
          <p className="text-sm md:text-base font-black leading-snug">
            {mainReason}
          </p>
        </div>
      )}

      {/* KPIs: Confidence + Fontes */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
        {confidencePct != null && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
            confidencePct >= 75 ? "bg-emerald-100/50 dark:bg-emerald-900/20 border-emerald-500/30" :
            confidencePct >= 50 ? "bg-amber-100/50 dark:bg-amber-900/20 border-amber-500/30" :
            "bg-rose-100/50 dark:bg-rose-900/20 border-rose-500/30"
          }`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
            Confiança: {confidencePct}%
          </span>
        )}
        {sourceCount != null && sourceCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            {sourceCount} fontes ativas
          </span>
        )}
      </div>

      {/* Barra de Risco */}
      <div className="w-full max-w-lg space-y-2">
        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest opacity-70">
          <span>Risco</span>
          <span className="tabular-nums bg-black/8 dark:bg-white/8 px-2.5 py-0.5 rounded-lg text-sm">
            {Math.round(riskScore)}%
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden border border-black/8 dark:border-white/8 bg-black/5 dark:bg-black/30 shadow-inner">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000 ease-out`}
            style={{ width: `${Math.min(riskScore, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
