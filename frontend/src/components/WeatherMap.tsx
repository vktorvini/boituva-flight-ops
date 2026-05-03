import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface WeatherMapProps {
  windSpeed: number;
  windGust: number;
  windDirectionLabel: string;
  windDirectionDegree?: number;
  precipitation: number;
}

export default function WeatherMap({
  windSpeed,
  windGust,
  windDirectionLabel,
  windDirectionDegree,
  precipitation,
}: WeatherMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);

  const BOITUVA_LAT = -23.2833;
  const BOITUVA_LON = -47.6667;

  useEffect(() => {
    if (!mapContainer.current) return;

    if (!mapInstance.current) {
      // Inicializar mapa
      mapInstance.current = L.map(mapContainer.current, {
        center: [BOITUVA_LAT, BOITUVA_LON],
        zoom: 12,
        zoomControl: false,
        dragging: false, // Make it more of a dashboard widget
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap contributors, © CARTO",
      }).addTo(mapInstance.current);
    }

    // Criar/atualizar icone dinâmico (Seta Direcional)
    const rotation = windDirectionDegree !== undefined ? windDirectionDegree : 0;
    const arrowColor = windGust > 20 ? "#f43f5e" : "#3b82f6"; // Red se rajada alta, senao Azul
    
    // A seta aponta PARA ONDE o vento vai, 
    // mas a direção do vento é DE ONDE ele vem.
    // Então se o vento vem do NORTE (0 graus), a seta aponta para BAIXO (180 graus).
    const pointerRotation = rotation + 180;

    const iconHtml = `
      <div style="
        width: 40px; 
        height: 40px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        background: rgba(255,255,255,0.8);
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 2px solid ${arrowColor};
        transition: transform 1s cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="${arrowColor}" 
          stroke-width="3" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          style="transform: rotate(${pointerRotation}deg); transition: transform 1s ease-out;"
        >
          <path d="M12 2v20M17 7l-5-5-5 5"/>
        </svg>
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      className: "transition-all duration-1000", // Tailwind transition on the marker container
    });

    if (!markerInstance.current) {
      markerInstance.current = L.marker([BOITUVA_LAT, BOITUVA_LON], { icon: customIcon }).addTo(
        mapInstance.current
      );
    } else {
      markerInstance.current.setIcon(customIcon);
    }

    // Tooltip / Popup fixo de informação
    markerInstance.current.bindTooltip(
      `<div style="font-family:system-ui;text-align:center;line-height:1.4">
        <strong style="color:${arrowColor};font-size:16px;">${windSpeed.toFixed(1)} km/h</strong><br/>
        <span style="opacity:0.8;font-size:12px;">Rajada: ${windGust.toFixed(1)} km/h</span><br/>
        <span style="opacity:0.8;font-size:12px;">De: ${windDirectionLabel}</span>
      </div>`,
      { permanent: true, direction: "right", offset: [15, 0], className: "border-0 shadow-lg rounded-xl font-bold" }
    );

    return () => {
      // Não removemos o mapa inteiro no cleanup para reuso, apenas no desmonte final se precisasse
    };
  }, [windSpeed, windGust, windDirectionLabel, windDirectionDegree]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-white/10 group" style={{ height: "400px" }}>
      {/* Container do Mapa */}
      <div ref={mapContainer} className="w-full h-full z-0 transition-opacity duration-500" />

      {/* Overlay de Animação (Pulso de tempo real) */}
      <div className="absolute inset-0 pointer-events-none z-[100] border-[4px] border-transparent group-hover:border-blue-500/20 transition-all duration-1000 rounded-2xl" />

      {/* Box de Dados Dinâmico Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-white/10 p-4 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[180px] transition-transform duration-500 hover:scale-105">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-400">
            Tempo Real
          </h4>
        </div>
        
        <div className="flex justify-between items-center gap-4 border-b dark:border-white/10 pb-1">
          <span className="font-bold text-xs opacity-70">Vento</span>
          <span className="font-black text-lg text-blue-600 dark:text-blue-400 transition-all">{windSpeed.toFixed(1)} <span className="text-[10px] font-normal">km/h</span></span>
        </div>
        <div className="flex justify-between items-center gap-4 border-b dark:border-white/10 pb-1">
          <span className="font-bold text-xs opacity-70">Rajada</span>
          <span className={`font-black text-lg transition-all ${windGust > 20 ? "text-rose-500" : ""}`}>{windGust.toFixed(1)} <span className="text-[10px] font-normal">km/h</span></span>
        </div>
        <div className="flex justify-between items-center gap-4 border-b dark:border-white/10 pb-1">
          <span className="font-bold text-xs opacity-70">Chuva</span>
          <span className={`font-black text-lg transition-all ${precipitation > 0 ? "text-blue-500" : ""}`}>{precipitation.toFixed(1)} <span className="text-[10px] font-normal">mm</span></span>
        </div>
      </div>
    </div>
  );
}
