import React from "react";

interface Props {
  status: "SAFE" | "WARNING" | "PROHIBITED";
  riskScore: number;
  mainReason?: string;
}

export default function FlightStatusHero({ status, riskScore, mainReason }: Props) {
  let bgColor = "";
  let icon = "";
  let title = "";
  let message = "";
  let textColor = "";
  let barColor = "";

  if (status === "SAFE") {
    bgColor = "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30";
    textColor = "text-emerald-800 dark:text-emerald-400";
    icon = "🟢";
    title = "VOO LIBERADO";
    message = "Condições ideais para voo";
    barColor = "from-emerald-400 to-emerald-500";
  } else if (status === "WARNING") {
    bgColor = "bg-amber-50 dark:bg-amber-950/40 border-amber-500/30";
    textColor = "text-amber-800 dark:text-amber-400";
    icon = "🟡";
    title = "ATENÇÃO";
    message = "Condições instáveis, monitorar";
    barColor = "from-amber-400 to-amber-500";
  } else {
    bgColor = "bg-rose-50 dark:bg-rose-950/40 border-rose-500/30";
    textColor = "text-rose-800 dark:text-rose-400";
    icon = "🔴";
    title = "VOO CANCELADO";
    message = "Risco elevado, voo não recomendado";
    barColor = "from-rose-400 to-rose-500";
  }

  return (
    <div className={`w-full rounded-[2rem] border-2 p-8 md:p-12 flex flex-col items-center justify-center text-center shadow-xl transition-all duration-500 ${bgColor} ${textColor}`}>
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-4">
        <span className="text-6xl md:text-8xl drop-shadow-md animate-pulse">{icon}</span>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase drop-shadow-sm">
          {title}
        </h1>
      </div>
      
      <p className="text-xl md:text-3xl font-bold opacity-90 mb-2">
        {message}
      </p>
      
      {mainReason && (
        <p className="text-md md:text-lg font-medium opacity-80 max-w-2xl mt-2 mb-8 bg-black/5 dark:bg-white/5 py-2 px-6 rounded-full">
          Motivo principal: {mainReason}
        </p>
      )}

      {/* Barra de Risco Melhorada Visualmente */}
      <div className="w-full max-w-2xl space-y-3 mt-4">
        <div className="flex justify-between text-sm font-black uppercase tracking-widest opacity-80">
          <span>Risco Calculado</span>
          <span className="bg-black/10 dark:bg-white/10 px-3 py-1 rounded-lg">
            {Math.round(riskScore)} / 100
          </span>
        </div>
        <div className="h-4 rounded-full overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/40 shadow-inner p-[2px]">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} shadow-sm transition-all duration-1000 ease-out relative`}
            style={{ width: `${Math.min(riskScore, 100)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[pulse_2s_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
}
