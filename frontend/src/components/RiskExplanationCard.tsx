import { ReactNode } from "react";

interface Breakdown {
  wind_component: number;
  gust_component: number;
  precipitation_component: number;
  visibility_component: number;
  weighted_score: number;
}

interface Props {
  breakdown: Breakdown;
  reasons: string[];
  riskModelVersion?: string;
  confidence?: number;
}

const FACTORS = [
  {
    key: "wind_component" as keyof Breakdown,
    label: "Vento",
    weight: "40%",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>
      </svg>
    ),
    color: "from-blue-500 to-blue-400",
    text: "text-blue-400",
  },
  {
    key: "gust_component" as keyof Breakdown,
    label: "Rajada",
    weight: "30%",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8a2.5 2.5 0 1 1 2 4H2"/>
      </svg>
    ),
    color: "from-violet-500 to-violet-400",
    text: "text-violet-400",
  },
  {
    key: "precipitation_component" as keyof Breakdown,
    label: "Precipitação",
    weight: "20%",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>
      </svg>
    ),
    color: "from-cyan-500 to-cyan-400",
    text: "text-cyan-400",
  },
  {
    key: "visibility_component" as keyof Breakdown,
    label: "Visibilidade",
    weight: "10%",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    color: "from-amber-500 to-amber-400",
    text: "text-amber-400",
  },
];

export default function RiskExplanationCard({ breakdown, reasons, riskModelVersion, confidence }: Props) {
  return (
    <div className="bg-zinc-950/60 backdrop-blur-xl border border-white/8 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Análise de Decisão</span>
        </div>
        <div className="flex items-center gap-2">
          {riskModelVersion && (
            <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] font-mono text-zinc-500 border border-white/5">
              {riskModelVersion}
            </span>
          )}
          {confidence != null && (
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-bold text-emerald-400">
              {Math.round(confidence * 100)}% conf.
            </span>
          )}
        </div>
      </div>

      {/* Reasons */}
      <div className="space-y-2">
        {reasons.map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-zinc-300">
            <span className="mt-0.5 text-zinc-500">›</span>
            {r}
          </div>
        ))}
      </div>

      {/* Factor breakdown bars */}
      <div className="space-y-4 pt-2 border-t border-white/5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Contribuição por Fator</p>
        {FACTORS.map((f) => {
          const value = breakdown[f.key] as number;
          const pct = Math.min(Math.round(value), 100);
          return (
            <div key={f.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${f.text}`}>
                  {f.icon}
                  {f.label}
                  <span className="text-zinc-600 font-normal">({f.weight})</span>
                </div>
                <span className="text-xs font-bold text-zinc-400">{pct}/100</span>
              </div>
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${f.color} transition-all duration-1000 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
