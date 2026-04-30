import { ReactNode } from "react";

interface Props {
  label: string;
  value: string | number;
  unit: string;
  icon: string | ReactNode;
  sub?: string;
}

export default function MetricCard({ label, value, unit, icon, sub }: Props) {
  return (
    <div className="group relative card flex flex-col gap-2 hover:translate-y-[-2px] transition-all duration-300">
      <div className="flex justify-between items-start">
        <div className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest">{label}</div>
        <div className="text-xl text-zinc-400 group-hover:text-blue-500 transition-colors">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1 mt-2">
        <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</span>
        <span className="text-zinc-400 text-xs font-bold">{unit}</span>
      </div>
      {sub && <p className="text-zinc-500 text-[10px] mt-1 font-bold tracking-tight">{sub}</p>}
    </div>
  );
}
