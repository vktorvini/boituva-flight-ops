import React from "react";

interface Props {
  reasons: string[];
}

export default function AlertsPanel({ reasons }: Props) {
  if (!reasons || reasons.length === 0) return null;

  // Filtramos os motivos mais críticos ou relevantes para gerar os cards
  const alerts: { type: "critical" | "warning"; text: string; icon: string }[] = [];

  reasons.forEach((r) => {
    const text = r.toLowerCase();
    if (text.includes("rajada") && text.includes("limite")) {
      alerts.push({ type: "critical", text: "Rajada acima do limite", icon: "🔴" });
    } else if (text.includes("chuva") || text.includes("precipitação")) {
      alerts.push({ type: "critical", text: "Chuva detectada na região", icon: "🌧️" });
    } else if (text.includes("instabilidade") || (text.includes("rajada") && text.includes("vento"))) {
      alerts.push({ type: "warning", text: "Instabilidade elevada no vento", icon: "⚠️" });
    } else if (text.includes("cancelado") || text.includes("proibido")) {
      alerts.push({ type: "critical", text: r, icon: "⛔" });
    }
  });

  if (alerts.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-3 mt-6">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500 text-center mb-2">
        Avisos Operacionais Ativos
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 shadow-sm transition-transform hover:scale-[1.02] ${
              alert.type === "critical"
                ? "bg-rose-100 dark:bg-rose-950/50 border-rose-500 text-rose-800 dark:text-rose-300"
                : "bg-amber-100 dark:bg-amber-950/50 border-amber-500 text-amber-800 dark:text-amber-300"
            }`}
          >
            <span className="text-3xl">{alert.icon}</span>
            <span className="font-bold text-lg leading-tight">{alert.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
