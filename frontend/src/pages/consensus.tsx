import { useEffect, useState } from "react";
import Head from "next/head";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFlightStatus, FlightStatus, SourceDetail } from "@/lib/api";

// ── Cores por status ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  SAFE: {
    label: "SEGURO",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    bar: "bg-gradient-to-r from-emerald-600 to-emerald-400",
    dot: "bg-emerald-400",
    emoji: "✅",
  },
  WARNING: {
    label: "ATENÇÃO",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    bar: "bg-gradient-to-r from-yellow-600 to-yellow-400",
    dot: "bg-yellow-400",
    emoji: "⚠️",
  },
  PROHIBITED: {
    label: "PROIBIDO",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    bar: "bg-gradient-to-r from-red-700 to-red-500",
    dot: "bg-red-400",
    emoji: "🚫",
  },
};

function SourceCard({ source }: { source: SourceDetail }) {
  const cfg = source.status
    ? STATUS_CONFIG[source.status as keyof typeof STATUS_CONFIG]
    : null;
  const scoreWidth = source.risk_score != null ? Math.round(source.risk_score) : 0;

  return (
    <div
      className={`relative rounded-2xl border p-6 space-y-5 transition-all duration-300 ${
        source.available
          ? `${cfg?.bg ?? "bg-zinc-900/60"} ${cfg?.border ?? "border-white/10"}`
          : "bg-zinc-950/40 border-zinc-800/50 opacity-60"
      }`}
    >
      {/* Cabeçalho da fonte */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                source.available ? (cfg?.dot ?? "bg-zinc-500") : "bg-zinc-600"
              }`}
            />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              {source.source_name === "inmet" ? "INMET" : "Open-Meteo"}
            </span>
          </div>
          <p className="text-xs text-zinc-500">{source.label}</p>
          <p className="text-[10px] text-zinc-600">
            Peso no consenso: {Math.round(source.weight * 100)}%
          </p>
        </div>

        {/* Badge de status */}
        {source.available && cfg ? (
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${cfg.bg} ${cfg.border} border ${cfg.color}`}
          >
            {cfg.emoji} {cfg.label}
          </div>
        ) : (
          <div className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-zinc-800/60 border border-zinc-700/40 text-zinc-500">
            ⊘ INDISPONÍVEL
          </div>
        )}
      </div>

      {/* Dados meteorológicos */}
      {source.available && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Vento", value: source.wind_speed.toFixed(1), unit: "km/h" },
            { label: "Rajada", value: source.wind_gust.toFixed(1), unit: "km/h" },
            { label: "Chuva", value: source.precipitation.toFixed(1), unit: "mm" },
          ].map((m) => (
            <div key={m.label} className="bg-zinc-900/50 rounded-xl p-3 text-center">
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">
                {m.label}
              </p>
              <p className="text-lg font-black text-white">{m.value}</p>
              <p className="text-[9px] text-zinc-600">{m.unit}</p>
            </div>
          ))}
        </div>
      )}

      {/* Risk Score */}
      {source.available && source.risk_score != null && (
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase text-zinc-500">
            <span>Risco Calculado</span>
            <span className="text-white bg-zinc-800/80 px-2 py-0.5 rounded-md">
              {scoreWidth}/100
            </span>
          </div>
          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${cfg?.bar}`}
              style={{ width: `${scoreWidth}%` }}
            />
          </div>
        </div>
      )}

      {/* Motivos */}
      <div className="space-y-1.5 pt-1 border-t border-white/5">
        <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">
          Justificativa
        </p>
        {source.reasons.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
            <span className="text-zinc-600 mt-0.5">›</span>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ConsensusPage() {
  const [status, setStatus] = useState<FlightStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const res = await getFlightStatus();
      setStatus(res.data);
      setLastUpdate(new Date());
      setError(null);
    } catch {
      setError("Erro ao conectar com o backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, []);

  const sources = status?.sources_detail ?? [];

  return (
    <>
      <Head>
        <title>Boituva Flight Ops – Análise de Consenso</title>
      </Head>

      <div className="space-y-10">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold uppercase tracking-widest">
            <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
            Análise Multi-Fonte
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 tracking-tighter">
            Consenso Meteorológico
          </h1>
          <p className="text-zinc-500 text-sm">
            {lastUpdate
              ? `Atualizado: ${format(lastUpdate, "dd/MM/yyyy • HH:mm:ss", { locale: ptBR })}`
              : "Sincronizando fontes..."}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : status ? (
          <>
            {/* Resumo do Consenso Final */}
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute -inset-0.5 bg-gradient-to-b from-violet-500/20 to-indigo-500/10 rounded-2xl blur opacity-40" />
              <div className="relative bg-zinc-950/80 border border-white/10 rounded-2xl p-6 flex items-center justify-between gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">
                    Decisão Final do Consenso
                  </p>
                  <p className="text-2xl font-black text-white">
                    {status.status === "SAFE"
                      ? "✅ SEGURO"
                      : status.status === "WARNING"
                      ? "⚠️ ATENÇÃO"
                      : "🚫 PROIBIDO"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {status.source_count ?? 0} fonte(s) no consenso • Risco {Math.round(status.risk_score)}/100
                  </p>
                </div>
                {status.confidence != null && (
                  <div className="text-center">
                    <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-1">
                      Confiança
                    </p>
                    <div className="text-3xl font-black text-violet-400">
                      {Math.round(status.confidence * 100)}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cards por fonte */}
            {sources.length > 0 ? (
              <div className="space-y-4">
                <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold">
                  Resultado por Fonte
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sources.map((src) => (
                    <SourceCard key={src.source_name} source={src} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
                Aguardando próxima coleta de dados para exibir detalhes por fonte.
                <br />
                <span className="text-zinc-600 text-xs">
                  (sources_detail disponível após o próximo ciclo de ingestão)
                </span>
              </div>
            )}

            {/* Legenda de fontes */}
            <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                Fontes de Dados
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  <span>
                    <strong className="text-zinc-300">INMET – A713/Ipero:</strong> Estação automática oficial, ~17km de Boituva. Peso 50%.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>
                    <strong className="text-zinc-300">Open-Meteo:</strong> Modelo global NWP, lat/lon exato de Boituva. Peso 30%.
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 pt-1">
                ⚠️ Fontes indisponíveis não entram no cálculo do consenso.
                O risco final usa apenas dados reais coletados no momento.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
