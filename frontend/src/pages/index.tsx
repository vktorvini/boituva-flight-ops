import { useEffect, useState } from "react";
import Head from "next/head";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFlightStatus, getWeather, FlightStatus, WeatherCurrent } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import MetricCard from "@/components/MetricCard";
import RiskExplanationCard from "@/components/RiskExplanationCard";
import ConfidenceBadge from "@/components/ConfidenceBadge";

export default function Home() {
  const [status, setStatus] = useState<FlightStatus | null>(null);
  const [weather, setWeather] = useState<WeatherCurrent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const [s, w] = await Promise.all([getFlightStatus(), getWeather()]);
      setStatus(s.data);
      setWeather(w.data);
      setLastUpdate(new Date());
      setError(null);
    } catch {
      setError("Erro ao conectar com o backend. Verifique se o servidor está rodando.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>Boituva Flight Ops – Status</title>
      </Head>

      <div className="space-y-12">
        {/* Title */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2" /> Monitoramento em Tempo Real
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 tracking-tighter">
            Controle Operacional
          </h1>
          <p className="text-zinc-400 text-sm md:text-base font-medium">
            {lastUpdate
              ? `Atualizado: ${format(lastUpdate, "dd/MM/yyyy • HH:mm:ss", { locale: ptBR })}`
              : "Sincronizando sistemas..."}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Status */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          status && (
            <>
              {/* Main Status Card */}
              <div className="relative group max-w-3xl mx-auto w-full">
                <div className="absolute -inset-0.5 bg-gradient-to-b from-blue-500/20 to-indigo-500/20 rounded-[2.5rem] blur opacity-40 group-hover:opacity-70 transition duration-1000"></div>
                <div className="relative bg-zinc-950/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-14 flex flex-col items-center gap-10 shadow-2xl">
                  <StatusBadge status={status.status} size="lg" />

                  {/* Phase 3: Confidence badge */}
                  {status.confidence != null && (
                    <ConfidenceBadge
                      confidence={status.confidence}
                      sourceCount={status.source_count ?? undefined}
                    />
                  )}
                  <div className="flex flex-col items-center gap-2 text-center">
                    {status.reasons.map((r, i) => (
                      <p key={i} className="text-zinc-300 font-medium text-lg">
                        {r}
                      </p>
                    ))}
                  </div>

                  {/* Risk meter */}
                  <div className="w-full max-w-sm space-y-3 mt-4">
                    <div className="flex justify-between text-xs font-bold tracking-widest uppercase text-zinc-500">
                      <span>Nível de Risco</span>
                      <span className="text-white bg-zinc-800 px-2 py-0.5 rounded-md">{Math.round(status.risk_score)}%</span>
                    </div>
                    <div className="h-3 bg-zinc-900 rounded-full overflow-hidden border border-white/5 shadow-inner p-px">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                          status.status === "SAFE"
                            ? "bg-gradient-to-r from-emerald-500 to-green-400"
                            : status.status === "WARNING"
                            ? "bg-gradient-to-r from-yellow-600 to-yellow-400"
                            : "bg-gradient-to-r from-red-600 to-rose-500"
                        }`}
                        style={{ width: `${Math.round(status.risk_score)}%` }}
                      >
                         <div className="absolute inset-0 bg-white/20 w-full h-full animate-[pulse_2s_infinite]"></div>
                      </div>
                    </div>
                  </div>

                  {/* Fontes Individuais (Evitar Média) */}
                  {status.sources_detail && status.sources_detail.length > 0 && (
                    <div className="w-full flex flex-col items-center mt-2 pt-6 border-t border-white/5">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3">Vento reportado pelas fontes ativas</p>
                      <div className="flex flex-wrap justify-center gap-3">
                        {status.sources_detail.filter(s => s.available).map(s => {
                          const name = s.source_name === "open_meteo" ? "Open-Meteo" : s.source_name === "inmet" ? "INMET" : "Norway";
                          const isRed = s.wind_speed > 22;
                          const isYellow = s.wind_speed > 12 && !isRed;
                          return (
                            <div key={s.source_name} className="bg-zinc-900/80 border border-white/5 rounded-lg px-4 py-2 flex flex-col items-center shadow-lg">
                              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                                {name}
                              </span>
                              <span className={`text-sm font-black ${isRed ? 'text-red-400' : isYellow ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                {s.wind_speed.toFixed(1)} km/h
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                <MetricCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/></svg>}
                  label="Vento (Pior Cenário)"
                  value={status.wind_speed.toFixed(1)}
                  unit="km/h"
                  sub={status.wind_speed > 22 ? "⛔ Limite excedido" : status.wind_speed > 12 ? "⚠️ Elevado" : "Operação Padrão"}
                />
                <MetricCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8a2.5 2.5 0 1 1 2 4H2"/></svg>}
                  label="Rajada (Pior Cenário)"
                  value={status.wind_gust.toFixed(1)}
                  unit="km/h"
                  sub={status.wind_gust > 30 ? "⛔ Limite excedido" : status.wind_gust > 15 ? "⚠️ Elevada" : "Estável"}
                />
                <MetricCard
                  icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>}
                  label="Chuva (Pior Cenário)"
                  value={status.precipitation.toFixed(1)}
                  unit="mm"
                  sub={status.precipitation > 0 ? "⛔ Voo proibido" : "Tempo Seco"}
                />
                {weather && (
                  <MetricCard
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>}
                    label="Temperatura"
                    value={weather.temperature.toFixed(1)}
                    unit="°C"
                    sub={`Umidade: ${weather.humidity.toFixed(0)}%`}
                  />
                )}
              </div>

              {/* Extra weather */}
              {weather && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <MetricCard
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>}
                    label="Direção do Vento"
                    value={weather.wind_direction.toFixed(0)}
                    unit="°"
                    sub={directionLabel(weather.wind_direction)}
                  />
                  <MetricCard
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="M2 12h20"/><path d="m4.93 19.07 14.14-14.14"/></svg>}
                    label="Pressão Atmosférica"
                    value={weather.pressure.toFixed(0)}
                    unit="hPa"
                  />
                  <MetricCard
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a5 5 0 0 0 5-5c0-2-2.5-7-5-12-2.5 5-5 10-5 12a5 5 0 0 0 5 5Z"/></svg>}
                    label="Umidade Relativa"
                    value={weather.humidity.toFixed(0)}
                    unit="%"
                  />
                </div>
              )}
              {/* Risk Explanation Card – Phase 2 */}
              {status.breakdown && (
                <RiskExplanationCard
                  breakdown={status.breakdown}
                  reasons={status.reasons}
                  riskModelVersion={status.risk_model_version}
                  confidence={status.confidence}
                />
              )}
            </>
          )
        )}
      </div>
    </>
  );
}

function directionLabel(deg: number): string {
  const dirs = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}
