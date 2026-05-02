import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getFlightStatus,
  getWeather,
  FlightStatus,
  WeatherCurrent,
} from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import MetricCard from "@/components/MetricCard";
import RiskExplanationCard from "@/components/RiskExplanationCard";
import ConfidenceBadge from "@/components/ConfidenceBadge";

// ── Theme Helpers ──────────────────────────────────────────────────────────────
function applyTheme(theme: "dark" | "light") {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("theme") as "dark" | "light" | null;
  return saved ?? "dark";
}

// ── Direction Helper ──────────────────────────────────────────────────────────
function directionLabel(deg: number): string {
  const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

// ── Page Component ─────────────────────────────────────────────────────────────
export default function Home() {
  const [status, setStatus] = useState<FlightStatus | null>(null);
  const [weather, setWeather] = useState<WeatherCurrent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Apply saved theme on mount
  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [s, w] = await Promise.all([getFlightStatus(), getWeather()]);
      setStatus(s.data);
      setWeather(w.data);
      setLastUpdate(new Date());
      setError(null);
    } catch {
      setError("Erro ao conectar com o servidor. Tentando novamente...");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Resolve status color for bar
  const barColor =
    status?.status === "SAFE"
      ? "from-emerald-500 to-green-400"
      : status?.status === "WARNING"
      ? "from-amber-500 to-yellow-400"
      : "from-rose-500 to-red-400";

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}
    >
      <Head>
        <title>Boituva Flight Ops — Controle Operacional</title>
        <meta
          name="description"
          content="Sistema de monitoramento meteorológico para operações de balonismo em Boituva/SP."
        />
      </Head>

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in srgb, var(--bg-page) 80%, transparent)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Boituva Flight Ops
            </span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 border"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-strong)",
              color: "var(--text-secondary)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {theme === "dark" ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M22 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
                Modo Claro
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
                Modo Escuro
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">

        {/* Page Title */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Controle Operacional
          </h1>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            {lastUpdate
              ? `Atualizado em ${format(lastUpdate, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}`
              : "Sincronizando dados..."}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-500 text-sm text-center font-medium">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        )}

        {/* Status Section */}
        {!loading && status && (
          <>
            {/* Main Status Card */}
            <div className="card flex flex-col items-center gap-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60" />
              <StatusBadge status={status.status} size="lg" />

              {/* Confidence Badge */}
              {status.confidence != null && (
                <ConfidenceBadge
                  confidence={status.confidence}
                  sourceCount={status.source_count ?? undefined}
                />
              )}

              {/* Reasons */}
              <div className="space-y-2 max-w-xl">
                {status.reasons.map((r, i) => (
                  <p key={i} className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>
                    {r}
                  </p>
                ))}
              </div>

              {/* Risk Meter */}
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  <span>Nível de Risco</span>
                  <span
                    className="px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}
                  >
                    {Math.round(status.risk_score)}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(status.risk_score, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/></svg>}
                label="Vento (Pior Cenário)"
                value={status.wind_speed.toFixed(1)}
                unit="km/h"
                sub={status.wind_speed > 16 ? "⛔ Crítico" : status.wind_speed > 12 ? "⚠️ Atenção" : "✅ Normal"}
              />
              <MetricCard
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8a2.5 2.5 0 1 1 2 4H2"/></svg>}
                label="Rajada (Pior Cenário)"
                value={status.wind_gust.toFixed(1)}
                unit="km/h"
                sub={status.wind_gust > 22 ? "⛔ Cancelamento" : status.wind_gust > 15 ? "⚠️ Elevada" : "✅ Estável"}
              />
              <MetricCard
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>}
                label="Chuva (Pior Cenário)"
                value={status.precipitation.toFixed(1)}
                unit="mm"
                sub={status.precipitation > 0 ? "⛔ Voo Proibido" : "✅ Tempo Seco"}
              />
              {weather && (
                <>
                  <MetricCard
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>}
                    label="Temperatura"
                    value={weather.temperature.toFixed(1)}
                    unit="°C"
                    sub={`Umidade: ${weather.humidity.toFixed(0)}%`}
                  />
                  <MetricCard
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>}
                    label="Direção do Vento"
                    value={weather.wind_direction.toFixed(0)}
                    unit="°"
                    sub={directionLabel(weather.wind_direction)}
                  />
                  <MetricCard
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="M2 12h20"/><path d="m4.93 19.07 14.14-14.14"/></svg>}
                    label="Pressão"
                    value={weather.pressure.toFixed(0)}
                    unit="hPa"
                  />
                </>
              )}
            </div>

            {/* Source Status */}
            {status.sources_detail && status.sources_detail.length > 0 && (
              <div className="card space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Fontes Meteorológicas
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {status.sources_detail.map((src) => (
                    <div
                      key={src.source_name}
                      className="rounded-xl border p-4 space-y-2 transition-all"
                      style={{
                        borderColor: src.available ? "var(--border)" : "rgba(244,63,94,0.2)",
                        backgroundColor: src.available ? "var(--bg-card)" : "rgba(244,63,94,0.05)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                          {src.source_name.replace("_", " ")}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${src.available ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                      </div>
                      {src.available ? (
                        <>
                          <div className="text-2xl font-black">{src.wind_speed.toFixed(1)} <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>km/h</span></div>
                          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            Rajada: {src.wind_gust.toFixed(1)} km/h
                            {src.status && (
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                src.status === "SAFE" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" :
                                src.status === "WARNING" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
                                "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              }`}>
                                {src.status}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-rose-500 font-medium">Fonte offline</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Explanation */}
            {status.breakdown && (
              <RiskExplanationCard
                breakdown={status.breakdown}
                reasons={status.reasons}
                riskModelVersion={status.risk_model_version}
                confidence={status.confidence}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
