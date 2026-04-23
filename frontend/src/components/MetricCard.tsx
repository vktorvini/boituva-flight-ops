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
    <div className="group relative bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col gap-2 hover:bg-zinc-800/40 transition-colors shadow-xl">
      <div className="flex justify-between items-start">
        <div className="text-zinc-400 text-[11px] font-bold uppercase tracking-widest">{label}</div>
        <div className="text-xl opacity-80 mix-blend-luminosity grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1 mt-2">
        <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 tracking-tighter">{value}</span>
        <span className="text-zinc-500 text-sm font-medium">{unit}</span>
      </div>
      {sub && <p className="text-zinc-500 text-xs mt-1 font-medium">{sub}</p>}
    </div>
  );
}
