import React from "react";

interface Props {
  degrees: number;
  speed: number;
  gust: number;
  label: string;
}

export default function WindCompass({ degrees, speed, gust, label }: Props) {
  // Arrow rotation. 0 degrees = North = UP.
  const rotation = degrees;

  return (
    <div className="card flex flex-col items-center justify-center p-6 gap-4 relative overflow-hidden group">
      {/* Subtle animated background representing wind */}
      <div 
        className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-1000"
        style={{
          background: `linear-gradient(${rotation}deg, transparent 0%, var(--accent-blue) 100%)`
        }}
      />
      
      <div className="text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: "var(--text-muted)" }}>
        Vento Atual
      </div>

      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Compass Ring */}
        <div 
          className="absolute inset-0 rounded-full border-[4px] shadow-inner"
          style={{ borderColor: "var(--border-strong)" }}
        >
          {/* Compass marks */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>N</div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>S</div>
          <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>L</div>
          <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>O</div>
        </div>

        {/* Inner Circle displaying speed */}
        <div 
          className="relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-lg backdrop-blur-sm"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          <span className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{speed.toFixed(1)}</span>
          <span className="text-[9px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>km/h</span>
        </div>

        {/* Rotating Arrow */}
        <div 
          className="absolute inset-0 transition-transform duration-1000 ease-out z-20 pointer-events-none flex justify-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* The arrow itself pointing UP (North) before rotation */}
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="var(--accent-blue)" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="drop-shadow-lg"
            style={{ transform: "translateY(-4px)" }}
          >
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </div>
      </div>

      <div className="text-center z-10">
        <div className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
          Vento {label}
        </div>
        <div className="text-[10px] font-bold uppercase" style={{ color: "var(--text-secondary)" }}>
          Rajada max: <span style={{ color: "var(--accent-rose)" }}>{gust.toFixed(1)} km/h</span>
        </div>
      </div>
    </div>
  );
}
