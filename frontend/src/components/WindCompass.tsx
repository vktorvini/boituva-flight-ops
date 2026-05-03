import React, { useEffect, useState } from "react";

interface Props {
  degrees: number;
  speed: number;
  gust: number;
  label: string; // Ex: "NO"
  trend?: "aumentando" | "estavel" | "diminuindo" | null;
}

export default function WindCompass({ degrees, speed, gust, label, trend }: Props) {
  // Arrow rotation. 0 degrees = North = UP.
  const rotation = degrees;

  // Real-time flash effect when data updates
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [speed, gust, degrees]);

  const getFullDirection = (lbl: string) => {
    const map: Record<string, string> = {
      N: "Norte", NE: "Nordeste", L: "Leste", SE: "Sudeste",
      S: "Sul", SO: "Sudoeste", O: "Oeste", NO: "Noroeste",
    };
    return map[lbl] || lbl;
  };

  const isGustCritical = gust > 20;

  return (
    <div className="card flex flex-col items-center justify-center p-8 gap-6 relative overflow-hidden group w-full shadow-md hover:shadow-lg transition-all duration-500">
      <div 
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-1000"
        style={{
          background: `linear-gradient(${rotation}deg, transparent 0%, var(--accent-blue) 100%)`
        }}
      />
      
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${pulse ? "bg-emerald-500 animate-pulse" : "bg-emerald-500/50"}`} />
        <div className="text-xs font-black uppercase tracking-widest text-center opacity-70 transition-opacity">
          Monitoramento em Tempo Real
        </div>
      </div>

      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Compass Ring */}
        <div 
          className="absolute inset-0 rounded-full border-[6px] shadow-inner transition-colors duration-1000"
          style={{ borderColor: pulse ? "var(--accent-blue)" : "var(--border-strong)", opacity: pulse ? 0.3 : 1 }}
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold opacity-60">N</div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold opacity-60">S</div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold opacity-60">L</div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold opacity-60">O</div>
        </div>

        {/* Inner Circle */}
        <div 
          className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-xl backdrop-blur-md transition-transform duration-500 ${pulse ? "scale-105" : "scale-100"}`}
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <span className="text-4xl font-black text-blue-600 dark:text-blue-400 transition-all">
            {speed.toFixed(1)}
          </span>
          <span className="text-xs font-bold uppercase opacity-60">km/h</span>
        </div>

        {/* Rotating Arrow */}
        <div 
          className="absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-20 pointer-events-none flex justify-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg 
            width="40" 
            height="40" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`drop-shadow-xl text-blue-600 dark:text-blue-500 transition-transform duration-500 ${pulse ? "translate-y-[-16px]" : "translate-y-[-12px]"}`}
          >
            <path d="M12 21V3" />
            <path d="M5 10l7-7 7 7" />
          </svg>
        </div>
      </div>

      <div className="text-center z-10 space-y-3 w-full">
        <div className="text-lg md:text-xl font-bold opacity-90">
          Vento vindo do <span className="font-black text-blue-600 dark:text-blue-400">{getFullDirection(label)}</span> ({label})
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm border transition-colors duration-500 ${
            isGustCritical 
              ? "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400 border-rose-500/50" 
              : "bg-black/5 dark:bg-white/5 text-slate-600 dark:text-zinc-400 border-transparent"
          }`}>
            Rajada max: <span className="text-base">{gust.toFixed(1)} km/h</span>
          </div>

          {trend && (
            <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border flex items-center gap-1.5 transition-colors duration-500 ${
              trend === "aumentando" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-500/30" :
              trend === "diminuindo" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" :
              "bg-black/5 dark:bg-white/5 text-slate-500 dark:text-zinc-400 border-transparent"
            }`}>
              {trend === "aumentando" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>}
              {trend === "diminuindo" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>}
              {trend === "estavel" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>}
              Vento {trend}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
