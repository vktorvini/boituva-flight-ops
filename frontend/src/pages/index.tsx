import React, { useEffect, useState, useCallback, useRef } from "react";
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
import FlightStatusHero from "@/components/FlightStatusHero";
import AlertsPanel from "@/components/AlertsPanel";
import TechnicalDetails from "@/components/TechnicalDetails";
import WindCompass from "@/components/WindCompass";
import dynamic from "next/dynamic";

const WeatherMap = dynamic(() => import("@/components/WeatherMap"), { ssr: false });

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
  const [refreshPulse, setRefreshPulse] = useState(false);

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

  // Wind trend tracking with intensity
  const prevWindRef = useRef<number | null>(null);
  const [windTrend, setWindTrend] = useState<"aumentando" | "estavel" | "diminuindo" | null>(null);
  const [trendIntensity, setTrendIntensity] = useState<"leve" | "forte" | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [s, w] = await Promise.all([getFlightStatus(), getWeather()]);
      
      const newStatus = s.data || s;
      
      // Calculate trend with intensity
      if (prevWindRef.current !== null && newStatus.wind_speed !== undefined) {
        const diff = newStatus.wind_speed - prevWindRef.current;
        const absDiff = Math.abs(diff);
        
        if (diff > 0.5) {
          setWindTrend("aumentando");
          setTrendIntensity(absDiff > 3 ? "forte" : "leve");
        } else if (diff < -0.5) {
          setWindTrend("diminuindo");
          setTrendIntensity(absDiff > 3 ? "forte" : "leve");
        } else {
          setWindTrend("estavel");
          setTrendIntensity(null);
        }
      } else {
        setWindTrend("estavel");
        setTrendIntensity(null);
      }
      
      prevWindRef.current = newStatus.wind_speed;

      setStatus(newStatus as FlightStatus);
      setWeather(w.data || w);
      setLastUpdate(new Date());
      setError(null);

      // Visual refresh pulse
      setRefreshPulse(true);
      setTimeout(() => setRefreshPulse(false), 800);
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

  return (
    <div
      className="min-h-screen transition-colors duration-500"
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
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${refreshPulse ? "" : "hidden"}`} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Boituva Flight Ops
            </span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-95 border"
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
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Page Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Controle Operacional
          </h1>
          <p className="text-xs font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
            {lastUpdate
              ? `Atualizado em ${format(lastUpdate, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}`
              : "Sincronizando dados..."}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-500 text-sm text-center font-medium">
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
            {/* 1. Hero — Status do Voo */}
            <FlightStatusHero 
              status={status.status} 
              riskScore={status.risk_score}
              mainReason={status.reasons[0]} 
            />

            {/* 2. Bússola */}
            {status.wind_direction !== undefined && (
              <div className="flex justify-center items-center w-full max-w-md mx-auto">
                <WindCompass 
                  degrees={status.wind_direction} 
                  speed={status.wind_speed} 
                  gust={status.wind_gust} 
                  label={directionLabel(status.wind_direction)}
                  trend={windTrend}
                  trendIntensity={trendIntensity}
                />
              </div>
            )}

            {/* 3. Alertas Críticos */}
            <AlertsPanel reasons={status.reasons} />

            {/* 4. Mapa Operacional + Windy (toggle dentro do componente) */}
            <div className="w-full">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-center mb-4 opacity-40">
                Visualização Geográfica
              </h3>
              <WeatherMap 
                windSpeed={status.wind_speed} 
                windGust={status.wind_gust} 
                windDirectionLabel={status.wind_direction !== undefined ? directionLabel(status.wind_direction) : "N/A"}
                windDirectionDegree={status.wind_direction}
                precipitation={status.precipitation}
                riskScore={status.risk_score}
              />
            </div>

            {/* 5. Métricas Detalhadas */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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

            {/* 6. Dados Técnicos (Colapsável) */}
            <TechnicalDetails status={status} />
          </>
        )}
      </main>
    </div>
  );
}
