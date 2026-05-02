import React from "react";

interface Props {
  status: "SAFE" | "WARNING" | "PROHIBITED";
}

export default function FlightStatusBanner({ status }: Props) {
  let bgColor = "";
  let icon = "";
  let title = "";
  let message = "";
  let textColor = "";

  if (status === "SAFE") {
    bgColor = "bg-green-100 dark:bg-green-900/30 border-green-500/50";
    textColor = "text-green-800 dark:text-green-400";
    icon = "🟢";
    title = "VOO LIBERADO";
    message = "Condições seguras para voo";
  } else if (status === "WARNING") {
    bgColor = "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500/50";
    textColor = "text-yellow-800 dark:text-yellow-400";
    icon = "🟡";
    title = "ATENÇÃO";
    message = "Condições instáveis, aguardar e observar evolução";
  } else {
    bgColor = "bg-red-100 dark:bg-red-900/30 border-red-500/50";
    textColor = "text-red-800 dark:text-red-400";
    icon = "🔴";
    title = "VOO CANCELADO";
    message = "Risco elevado, voo não recomendado";
  }

  return (
    <div className={`w-full rounded-2xl border-2 p-6 flex flex-col items-center justify-center text-center shadow-lg transition-colors ${bgColor} ${textColor}`}>
      <div className="flex items-center gap-4 mb-2">
        <span className="text-4xl md:text-6xl animate-pulse">{icon}</span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">
          {title}
        </h1>
      </div>
      <p className="text-lg md:text-xl font-bold opacity-90">
        {message}
      </p>
    </div>
  );
}
