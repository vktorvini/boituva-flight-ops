import React, { useEffect, useState } from "react";

interface Props {
  degrees: number;
  speed: number;
  gust: number;
  label: string;
  trend?: "aumentando" | "estavel" | "diminuindo" | null;
  trendIntensity?: "leve" | "forte" | null;
}

export default function WindCompass({ degrees, speed, gust, label, trend, trendIntensity }: Props) {
  const rotation = degrees;

  // Subtle refresh flash
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 600);
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

  // Trend text helper
  const getTrendText = () => {
    if (!trend || trend === "estavel") return "Vento estável";
    const intensity = trendIntensity || "leve";
    if (trend === "aumentando") return intensity === "forte" ? "Vento subindo rápido" : "Vento aumentando";
    return intensity === "forte" ? "Vento caindo rápido" : "Vento diminuindo";
  };

  const getTrendIcon = () => {
    if (!trend || trend === "estavel") return "→";
    if (trend === "aumentando") return trendIntensity === "forte" ? "⬆" : "↗";
    return trendIntensity === "forte" ? "⬇" : "↘";
  };

  return (
    <div className="card flex flex-col items-center justify-center p-8 gap-5 relative overflow-hidden group w-full shadow-md hover:shadow-lg transition-all duration-300">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700"
        style={{ background: `linear-gradient(${rotation}deg, transparent 0%, var(--accent-blue) 100%)` }}
      />
      
      {/* Live indicator */}
      <div className="flex items-center gap-2 z-10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
          Ao vivo
        </span>
      </div>

      {/* Compass */}
      <div className="relative w-44 h-44 md:w-52 md:h-52 flex items-center justify-center">
        {/* Ring */}
        <div 
          className="absolute inset-0 rounded-full border-[5px] transition-all duration-700"
          style={{ 
            borderColor: "var(--border-strong)",
            boxShadow: pulse ? "0 0 20px var(--accent-blue)" : "inset 0 2px 8px rgba(0,0,0,0.1)",
            opacity: pulse ? 0.6 : 1
          }}
        >
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[11px] font-black opacity-40 select-none">N</div>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[11px] font-black opacity-40 select-none">S</div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-black opacity-40 select-none">L</div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-black opacity-40 select-none">O</div>
        </div>

        {/* Speed circle */}
        <div 
          className={`relative z-10 w-24 h-24 md:w-28 md:h-28 rounded-full flex flex-col items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-300 ${pulse ? "scale-[1.03]" : "scale-100"}`}
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <span className="text-3xl md:text-4xl font-black text-blue-600 dark:text-blue-400 tabular-nums transition-all duration-300">
            {speed.toFixed(1)}
          </span>
          <span className="text-[10px] font-bold uppercase opacity-50">km/h</span>
        </div>

        {/* Arrow */}
        <div 
          className="absolute inset-0 z-20 pointer-events-none flex justify-center"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transition: "transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)"
          }}
        >
          <svg 
            width="36" height="36" viewBox="0 0 24 24" fill="none" 
            stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            className="text-blue-600 dark:text-blue-400 drop-shadow-lg"
            style={{ transform: "translateY(-14px)" }}
          >
            <path d="M12 20V4" />
            <path d="M5 11l7-7 7 7" />
          </svg>
        </div>
      </div>

      {/* Direction text */}
      <div className="text-center z-10 space-y-3 w-full">
        <p className="text-base md:text-lg font-semibold opacity-80">
          Vento vindo do <span className="font-black text-blue-600 dark:text-blue-400">{getFullDirection(label)}</span> <span className="opacity-50">({label})</span>
        </p>
        
        {/* Tags row */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Gust tag */}
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors duration-300 ${
            isGustCritical 
              ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border-rose-500/40" 
              : "bg-black/5 dark:bg-white/5 text-slate-600 dark:text-zinc-400 border-transparent"
          }`}>
            Rajada {gust.toFixed(1)} km/h
          </span>

          {/* Trend tag with intensity */}
          {trend && (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors duration-300 ${
              trend === "aumentando" 
                ? trendIntensity === "forte"
                  ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-500/30"
                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-500/30"
                : trend === "diminuindo" 
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-black/5 dark:bg-white/5 text-slate-500 dark:text-zinc-400 border-transparent"
            }`}>
              <span className="text-sm">{getTrendIcon()}</span>
              {getTrendText()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
