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
        <title>Boituva Flight Ops – Janela de Voo</title>
      </Head>

      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Janela de Voo – 48 Horas</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-3xl font-bold text-green-400">{safeCount}h</p>
                <p className="text-zinc-500 text-xs mt-1">SEGURO</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-yellow-400">{warnCount}h</p>
                <p className="text-zinc-500 text-xs mt-1">ATENÇÃO</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-red-400">{prohibCount}h</p>
                <p className="text-zinc-500 text-xs mt-1">PROIBIDO</p>
              </div>
            </div>

            {/* Visual timeline bar */}
            <div className="card">
              <p className="text-zinc-400 text-xs mb-3 uppercase tracking-wider">
                Linha do Tempo
              </p>
              <div className="flex h-8 rounded-lg overflow-hidden gap-px">
                {entries.map((e, i) => (
                  <div
                    key={i}
                    title={`${e.hour} – ${e.status}`}
                    className={clsx(
                      "flex-1",
                      e.status === "SAFE"
                        ? "bg-green-500"
                        : e.status === "WARNING"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between text-zinc-600 text-xs mt-2">
                <span>Agora</span>
                <span>+24h</span>
                <span>+48h</span>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2">
              {entries.map((e, i) => {
                const dt = parseISO(e.hour);
                return (
                  <div
                    key={i}
                    className={clsx(
                      "flex items-center gap-4 rounded-lg border-l-4 px-4 py-3",
                      STATUS_COLOR[e.status]
                    )}
                  >
                    <div className="w-36 shrink-0">
                      <p className="text-white text-sm font-medium">
                        {format(dt, "EEE, dd/MM", { locale: ptBR })}
                      </p>
                      <p className="text-zinc-400 text-xs">
                        {format(dt, "HH:mm")}
                      </p>
                    </div>

                    <StatusBadge status={e.status} size="sm" />

                    <div className="ml-auto flex gap-6 text-xs text-zinc-400">
                      <span>💨 {e.wind_speed.toFixed(1)} km/h</span>
                      <span>🌀 {e.wind_gust.toFixed(1)} km/h</span>
                      <span>🌧️ {e.precipitation.toFixed(1)} mm</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
