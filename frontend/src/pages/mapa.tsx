import { useEffect, useState } from "react";
import Head from "next/head";
import { getFlightStatus, FlightStatus } from "@/lib/api";
import dynamic from "next/dynamic";

const OperationalMap = dynamic(() => import("@/components/OperationalMap"), { ssr: false });

function directionLabel(deg: number): string {
  const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

export default function MapaPage() {
  const [status, setStatus] = useState<FlightStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFlightStatus()
      .then((r) => setStatus(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusConfig = status
    ? {
        SAFE: { label: "VOO LIBERADO", color: "#34d399", emoji: "✅", flag: "Bandeira Verde", textClass: "text-emerald-500" },
        WARNING: { label: "OBSERVAÇÃO", color: "#fbbf24", emoji: "⚠️", flag: "Bandeira Amarela", textClass: "text-amber-500" },
        PROHIBITED: { label: "VOO CANCELADO", color: "#f87171", emoji: "🚫", flag: "Bandeira Vermelha", textClass: "text-rose-500" },
      }[status.status]
    : null;

  return (
    <>
      <Head>
        <title>Boituva Flight Ops – Mapa Operacional</title>
      </Head>

      <div className="space-y-6 max-w-7xl mx-auto px-4 pb-8">
        {/* Header */}
        <div className="text-center space-y-3 py-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
               style={{ backgroundColor: "var(--bg-card)", color: "var(--accent-blue)", border: "1px solid var(--border)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--accent-blue)" }} />
            Mapa Operacional Multi-Camadas
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter" style={{ color: "var(--text-primary)" }}>
            Boituva Live Map
          </h1>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Visualização de Risco vs. Fluxo de Vento
          </p>
        </div>

        {/* Status resumido */}
        {!loading && status && statusConfig && (
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="card px-5 py-3 flex items-center gap-3">
              <span className="text-2xl">{statusConfig.emoji}</span>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>Status Atual</p>
                <p className="font-black text-lg" style={{ color: statusConfig.color }}>
                  {statusConfig.label}
                </p>
              </div>
            </div>
            <div className="card px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>Risco</p>
              <p className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
                {Math.round(status.risk_score)}/100
              </p>
            </div>
            <div className="card px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>Vento</p>
              <p className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
                {status.wind_speed.toFixed(1)} km/h
              </p>
            </div>
            <div className="card px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>Rajada</p>
              <p className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
                {status.wind_gust.toFixed(1)} km/h
              </p>
            </div>
          </div>
        )}

        {/* Mapa Container Unificado */}
        {!loading && status ? (
          <OperationalMap
            windSpeed={status.wind_speed}
            windGust={status.wind_gust}
            windDirectionLabel={status.wind_direction !== undefined ? directionLabel(status.wind_direction) : "N/A"}
            windDirectionDegree={status.wind_direction}
            precipitation={status.precipitation}
            riskScore={status.risk_score}
            status={status.status}
            fullscreen={true}
          />
        ) : (
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl z-0 flex items-center justify-center bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10" style={{ height: "calc(100vh - 160px)" }}>
             <div className="w-10 h-10 border-2 border-transparent border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Legenda do Mapa de Risco */}
        <div className="card p-4 space-y-4">
          <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>
            Guia de Cores e Status Oficial
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 p-3 rounded-lg border" style={{ backgroundColor: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.1)" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-3 rounded bg-gradient-to-r from-emerald-700 to-emerald-400" />
                <span className="text-sm font-black text-emerald-500">VERDE (Liberado)</span>
              </div>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Condições perfeitas: céu limpo, ventos fracos e visibilidade alta.</span>
            </div>
            
            <div className="flex flex-col gap-1 p-3 rounded-lg border" style={{ backgroundColor: "rgba(245, 158, 11, 0.05)", borderColor: "rgba(245, 158, 11, 0.1)" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-3 rounded bg-gradient-to-r from-amber-700 to-amber-400" />
                <span className="text-sm font-black text-amber-500">AMARELA (Observação)</span>
              </div>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Ventos em atenção ou ameaça leve de chuva. Aguardar 30 min.</span>
            </div>

            <div className="flex flex-col gap-1 p-3 rounded-lg border" style={{ backgroundColor: "rgba(244, 63, 94, 0.05)", borderColor: "rgba(244, 63, 94, 0.1)" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-3 rounded bg-gradient-to-r from-rose-700 to-rose-400" />
                <span className="text-sm font-black text-rose-500">VERMELHA (Cancelado)</span>
              </div>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Risco operacional. Ventos fortes acima de 22km/h ou chuva detectada.</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
