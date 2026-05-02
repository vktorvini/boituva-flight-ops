import React from "react";

interface Props {
  degrees: number;
  speed: number;
  gust: number;
  label: string; // Ex: "NO"
}

export default function WindCompass({ degrees, speed, gust, label }: Props) {
  // Arrow rotation. 0 degrees = North = UP.
  const rotation = degrees;

  // Função para retornar o nome completo do vento
  const getFullDirection = (lbl: string) => {
    const map: Record<string, string> = {
      N: "Norte",
      NE: "Nordeste",
      L: "Leste",
      SE: "Sudeste",
      S: "Sul",
      SO: "Sudoeste",
      O: "Oeste",
      NO: "Noroeste",
    };
    return map[lbl] || lbl;
  };

  const isGustCritical = gust > 20;

  return (
    <div className="card flex flex-col items-center justify-center p-8 gap-6 relative overflow-hidden group w-full shadow-md hover:shadow-lg transition-shadow">
      <div 
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-1000"
        style={{
          background: `linear-gradient(${rotation}deg, transparent 0%, var(--accent-blue) 100%)`
        }}
      />
      
      <div className="text-xs font-black uppercase tracking-widest text-center opacity-70">
        Monitoramento de Vento
      </div>

      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Compass Ring */}
        <div 
          className="absolute inset-0 rounded-full border-[6px] shadow-inner"
          style={{ borderColor: "var(--border-strong)" }}
        >
          {/* Compass marks */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold opacity-60">N</div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold opacity-60">S</div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold opacity-60">L</div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold opacity-60">O</div>
        </div>

        {/* Inner Circle displaying speed */}
        <div 
          className="relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-xl backdrop-blur-md"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <span className="text-4xl font-black text-blue-600 dark:text-blue-400">{speed.toFixed(1)}</span>
          <span className="text-xs font-bold uppercase opacity-60">km/h</span>
        </div>

        {/* Rotating Arrow */}
        <div 
          className="absolute inset-0 transition-transform duration-1000 ease-out z-20 pointer-events-none flex justify-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* The arrow itself pointing UP (North) before rotation */}
          <svg 
            width="40" 
            height="40" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="drop-shadow-xl text-blue-600 dark:text-blue-500"
            style={{ transform: "translateY(-12px)" }}
          >
            <path d="M12 21V3" />
            <path d="M5 10l7-7 7 7" />
          </svg>
        </div>
      </div>

      <div className="text-center z-10 space-y-2">
        <div className="text-lg md:text-xl font-bold opacity-90">
          Vento vindo do <span className="font-black text-blue-600 dark:text-blue-400">{getFullDirection(label)}</span> ({label})
        </div>
        <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm border ${
          isGustCritical 
            ? "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400 border-rose-500/50" 
            : "bg-black/5 dark:bg-white/5 text-slate-600 dark:text-zinc-400 border-transparent"
        }`}>
          Rajada máxima: <span className="text-base">{gust.toFixed(1)} km/h</span>
        </div>
      </div>
    </div>
  );
}
