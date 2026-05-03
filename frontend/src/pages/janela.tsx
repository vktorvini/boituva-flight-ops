import { useEffect, useState } from "react";
import Head from "next/head";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFlightWindow, WindowEntry } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import clsx from "clsx";

const STATUS_COLOR = {
  SAFE: "border-l-green-500 bg-green-500/5",
  WARNING: "border-l-yellow-500 bg-yellow-500/5",
  PROHIBITED: "border-l-red-500 bg-red-500/5",
};

export default function JanelaPage() {
  const [entries, setEntries] = useState<WindowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFlightWindow()
      .then((r) => setEntries(r.data.window))
      .catch(() => setError("Erro ao carregar janela de voo."))
      .finally(() => setLoading(false));
  }, []);

  const safeCount = entries.filter((e) => e.status === "SAFE").length;
  const warnCount = entries.filter((e) => e.status === "WARNING").length;
  const prohibCount = entries.filter((e) => e.status === "PROHIBITED").length;

  return (
    <>
      <Head>
        <title>Janela de Voo — Boituva Flight Ops</title>
      </Head>

      <div className="space-y-10 max-w-5xl mx-auto py-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tight">Janela de Voo (48h)</h1>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Previsão operacional baseada no consenso multi-modelo (Open-Meteo + NOAA)
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-500 text-center font-bold animate-pulse">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-32">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card text-center group hover:border-emerald-500/30 transition-all">
                <div className="text-5xl font-black text-emerald-500">{safeCount}h</div>
                <div className="text-xs font-bold uppercase tracking-widest mt-2" style={{ color: "var(--text-muted)" }}>Horas Seguras</div>
              </div>
              <div className="card text-center group hover:border-amber-500/30 transition-all">
                <div className="text-5xl font-black text-amber-500">{warnCount}h</div>
                <div className="text-xs font-bold uppercase tracking-widest mt-2" style={{ color: "var(--text-muted)" }}>Horas de Atenção</div>
              </div>
              <div className="card text-center group hover:border-rose-500/30 transition-all">
                <div className="text-5xl font-black text-rose-500">{prohibCount}h</div>
                <div className="text-xs font-bold uppercase tracking-widest mt-2" style={{ color: "var(--text-muted)" }}>Horas Proibidas</div>
              </div>
            </div>

            {/* Visual timeline bar */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Fluxo Operacional Contínuo
                </p>
              </div>
              <div className="flex h-12 rounded-xl overflow-hidden shadow-inner border border-black/10 dark:border-white/5">
                {entries.map((e, i) => (
                  <div
                    key={i}
                    title={`${format(parseISO(e.hour), "HH:mm")} – ${e.status}`}
                    className={clsx(
                      "flex-1 transition-all hover:opacity-80 cursor-help",
                      e.status === "SAFE" ? "bg-emerald-500" : 
                      e.status === "WARNING" ? "bg-amber-400" : "bg-rose-500"
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                <span>Agora</span>
                <span>Próximas 24h</span>
                <span>Próximas 48h</span>
              </div>
            </div>

            {/* Detailed Timeline List */}
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest pl-2" style={{ color: "var(--text-muted)" }}>
                Agenda de Risco Detalhada
              </p>
              <div className="grid grid-cols-1 gap-3">
                {entries.map((e, i) => {
                  const dt = parseISO(e.hour);
                  const isSafe = e.status === "SAFE";
                  const isWarn = e.status === "WARNING";
                  
                  return (
                    <div
                      key={i}
                      className={clsx(
                        "flex flex-col md:flex-row md:items-center gap-4 rounded-2xl border p-5 transition-all hover:translate-x-1",
                        isSafe ? "bg-emerald-500/5 border-emerald-500/20" : 
                        isWarn ? "bg-amber-500/5 border-amber-500/20" : "bg-rose-500/5 border-rose-500/20"
                      )}
                    >
                      <div className="flex-1">
                        <p className="text-lg font-black tracking-tight leading-none mb-1">
                          {format(dt, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-2xl font-bold opacity-60">
                          {format(dt, "HH:mm")}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <StatusBadge status={e.status} size="sm" />
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider">
                        <div className="bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg flex items-center gap-2">
                          <span className="opacity-60 text-[9px]">Vento:</span>
                          <span>{e.wind_speed.toFixed(1)} <span className="text-[8px] font-normal opacity-60">km/h</span></span>
                        </div>
                        <div className="bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg flex items-center gap-2">
                          <span className="opacity-60 text-[9px]">Rajada:</span>
                          <span className={e.wind_gust > 22 ? "text-rose-500" : ""}>{e.wind_gust.toFixed(1)} <span className="text-[8px] font-normal opacity-60">km/h</span></span>
                        </div>
                        <div className="bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg flex items-center gap-2">
                          <span className="opacity-60 text-[9px]">Chuva:</span>
                          <span className={e.precipitation > 0 ? "text-blue-500" : ""}>{e.precipitation.toFixed(1)} <span className="text-[8px] font-normal opacity-60">mm</span></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
