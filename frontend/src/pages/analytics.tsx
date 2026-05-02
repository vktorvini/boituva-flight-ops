import { useEffect, useState } from "react";
import Head from "next/head";
import {
  getAnalyticsSummary,
  getAnalyticsDaily,
  AnalyticsSummary,
  DayAnalytics,
} from "@/lib/api";

const PERIOD_OPTIONS = [7, 14, 30, 60, 90];

function StatCard({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="card text-center space-y-2">
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--border)" }}
      >
        <div
          className={`h-full rounded-full ${color.replace("text-", "bg-")}`}
          style={{ width: `${Math.min(pct, 100)}%`, transition: "width 1s ease" }}
        />
      </div>
      <div className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [daily, setDaily] = useState<DayAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getAnalyticsSummary(days), getAnalyticsDaily(days)])
      .then(([s, d]) => {
        setSummary(s.data);
        setDaily(d.data.days);
      })
      .finally(() => setLoading(false));
  }, [days]);

  const maxTotal = daily.length ? Math.max(...daily.map((d) => d.total), 1) : 1;

  return (
    <>
      <Head>
        <title>Boituva Flight Ops — Analytics</title>
        <meta name="description" content="Análise histórica de decisões de voo em Boituva." />
      </Head>

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
            <p className="text-sm font-medium mt-1" style={{ color: "var(--text-secondary)" }}>
              Análise histórica das decisões operacionais de voo
            </p>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-strong)",
              color: "var(--text-primary)",
            }}
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p} value={p}>
                Últimos {p} dias
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && summary && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card text-center space-y-1">
                <div className="text-3xl font-black">{summary.total_records}</div>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Registros Totais
                </div>
              </div>
              <StatCard label="Bandeira Verde" value={summary.safe} pct={summary.safe_pct} color="text-emerald-500" />
              <StatCard label="Bandeira Amarela" value={summary.warning} pct={summary.warning_pct} color="text-amber-500" />
              <StatCard label="Bandeira Vermelha" value={summary.prohibited} pct={summary.prohibited_pct} color="text-rose-500" />
            </div>

            {/* Risk Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card text-center space-y-1">
                <div className="text-2xl font-black">{summary.avg_risk_score}%</div>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Risco Médio
                </div>
              </div>
              <div className="card text-center space-y-1">
                <div className="text-2xl font-black text-rose-500">{summary.max_risk_score}%</div>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Risco Máximo Registrado
                </div>
              </div>
            </div>

            {/* Daily Chart */}
            {daily.length > 0 && (
              <div className="card space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Histórico Diário — Últimos {days} dias
                </p>
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-1 min-w-max h-40">
                    {daily.map((d) => {
                      const safeH   = (d.safe       / maxTotal) * 100;
                      const warnH   = (d.warning    / maxTotal) * 100;
                      const probH   = (d.prohibited / maxTotal) * 100;
                      return (
                        <div
                          key={d.date}
                          className="flex flex-col-reverse items-center gap-0.5 group cursor-default"
                          title={`${d.date}: ${d.safe}✅ ${d.warning}⚠️ ${d.prohibited}⛔ (risco médio: ${d.avg_risk}%)`}
                        >
                          {/* Stacked bar */}
                          <div className="flex flex-col-reverse w-5 rounded-sm overflow-hidden" style={{ height: "120px" }}>
                            <div className="bg-emerald-500 w-full transition-all duration-700" style={{ height: `${safeH}%` }} />
                            <div className="bg-amber-400 w-full transition-all duration-700" style={{ height: `${warnH}%` }} />
                            <div className="bg-rose-500 w-full transition-all duration-700" style={{ height: `${probH}%` }} />
                          </div>
                          {/* Label */}
                          <span
                            className="text-[8px] font-bold rotate-90 whitespace-nowrap"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {d.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />Verde (SAFE)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />Amarelo (WARNING)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />Vermelho (PROHIBITED)</span>
                  </div>
                </div>
              </div>
            )}

            {summary.total_records === 0 && (
              <div className="card text-center py-12" style={{ color: "var(--text-muted)" }}>
                Nenhum registro encontrado para o período selecionado.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
