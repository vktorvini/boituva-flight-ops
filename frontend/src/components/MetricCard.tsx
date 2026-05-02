import { ReactNode } from "react";

interface Props {
  label: string;
  value: string | number;
  unit: string;
  icon: ReactNode;
  sub?: string;
}

export default function MetricCard({ label, value, unit, icon, sub }: Props) {
  return (
    <div
      className="card group flex flex-col gap-2 hover:scale-[1.01] transition-all duration-200"
    >
      <div className="flex justify-between items-start">
        <div
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </div>
        <div className="text-lg transition-colors group-hover:text-blue-500" style={{ color: "var(--text-muted)" }}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
          {value}
        </span>
        <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{unit}</span>
      </div>
      {sub && (
        <p className="text-[10px] font-bold tracking-tight" style={{ color: "var(--text-secondary)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
