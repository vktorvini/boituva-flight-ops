interface Props {
  confidence: number;             // 0.0 – 1.0
  sourceCount?: number;
}

const LEVELS = [
  { min: 0.8, label: "Alta Confiança", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" },
  { min: 0.5, label: "Confiança Média", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-400" },
  { min: 0,   label: "Baixa Confiança", color: "text-red-400",     bg: "bg-red-500/10",    border: "border-red-500/30",    dot: "bg-red-400"     },
];

export default function ConfidenceBadge({ confidence, sourceCount }: Props) {
  const level = LEVELS.find((l) => confidence >= l.min) ?? LEVELS[LEVELS.length - 1];
  const pct = Math.round(confidence * 100);

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest transition-all ${level.bg} ${level.border} ${level.color}`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${level.dot}`} />
      {level.label}: {pct}%
      {sourceCount != null && (
        <span className="ml-1 opacity-60 font-normal normal-case tracking-normal">
          · {sourceCount} fonte{sourceCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
