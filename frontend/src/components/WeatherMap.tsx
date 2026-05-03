import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface WeatherMapProps {
  windSpeed: number;
  windGust: number;
  windDirectionLabel: string;
  windDirectionDegree?: number;
  precipitation: number;
  riskScore?: number;
}

// Gera pontos de grid 3x3 ao redor de Boituva com variações realistas
function generateWindGrid(
  centerLat: number,
  centerLon: number,
  windSpeed: number,
  windGust: number,
  dirDeg: number
): { lat: number; lon: number; speed: number; gust: number; deg: number }[] {
  const spread = 0.025; // ~2.5km entre pontos
  const points: { lat: number; lon: number; speed: number; gust: number; deg: number }[] = [];
  
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      // Variação pseudo-aleatória determinística (sem Math.random)
      const seed = (row + 2) * 5 + (col + 2) * 3;
      const speedVariation = 1 + ((seed % 7) - 3) * 0.08; // ±24%
      const dirVariation = ((seed % 5) - 2) * 6; // ±12 graus
      
      points.push({
        lat: centerLat + row * spread,
        lon: centerLon + col * spread,
        speed: windSpeed * speedVariation,
        gust: windGust * speedVariation,
        deg: dirDeg + dirVariation,
      });
    }
  }
  return points;
}

export default function WeatherMap({
  windSpeed,
  windGust,
  windDirectionLabel,
  windDirectionDegree,
  precipitation,
  riskScore,
}: WeatherMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);
  const heatCircle = useRef<L.Circle | null>(null);
  const [mapMode, setMapMode] = useState<"operacional" | "windy">("operacional");

  const BOITUVA_LAT = -23.2833;
  const BOITUVA_LON = -47.6667;

  // Determinar cor do heatmap baseado na rajada
  const getHeatColor = (gustVal: number): string => {
    if (gustVal <= 12) return "rgba(34,197,94,0.15)";   // verde
    if (gustVal <= 20) return "rgba(234,179,8,0.18)";   // amarelo
    return "rgba(244,63,94,0.22)";                       // vermelho
  };

  const getHeatBorder = (gustVal: number): string => {
    if (gustVal <= 12) return "rgba(34,197,94,0.4)";
    if (gustVal <= 20) return "rgba(234,179,8,0.5)";
    return "rgba(244,63,94,0.5)";
  };

  useEffect(() => {
    if (!mapContainer.current || mapMode !== "operacional") return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapContainer.current, {
        center: [BOITUVA_LAT, BOITUVA_LON],
        zoom: 13,
        zoomControl: false,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OSM, © CARTO",
      }).addTo(mapInstance.current);

      layerGroup.current = L.layerGroup().addTo(mapInstance.current);
    }

    // Limpar marcadores antigos
    if (layerGroup.current) layerGroup.current.clearLayers();

    const dirDeg = windDirectionDegree ?? 0;

    // ── Heatmap de Risco (Círculo simples) ───────────────────────────────
    if (heatCircle.current) {
      mapInstance.current.removeLayer(heatCircle.current);
    }
    heatCircle.current = L.circle([BOITUVA_LAT, BOITUVA_LON], {
      radius: 3000, // 3km
      fillColor: getHeatColor(windGust),
      fillOpacity: 1,
      color: getHeatBorder(windGust),
      weight: 2,
      className: "transition-all duration-1000",
    }).addTo(mapInstance.current);

    // ── Wind Grid 3×3 com setas ──────────────────────────────────────────
    const grid = generateWindGrid(BOITUVA_LAT, BOITUVA_LON, windSpeed, windGust, dirDeg);

    grid.forEach((pt, idx) => {
      const pointerRot = pt.deg + 180; // apontar para onde vai
      const isCenter = idx === 4;
      const sizeScale = Math.min(pt.speed / 20, 1.5); // escalar pelo vento
      const baseSize = isCenter ? 36 : 24;
      const size = Math.round(baseSize * (0.7 + sizeScale * 0.5));
      const arrowColor = pt.gust > 20 ? "#f43f5e" : pt.gust > 12 ? "#eab308" : "#3b82f6";

      const iconHtml = `
        <div style="
          width:${size}px;height:${size}px;
          display:flex;align-items:center;justify-content:center;
          background:${isCenter ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)"};
          border-radius:50%;
          box-shadow:0 2px 8px rgba(0,0,0,${isCenter ? "0.2" : "0.1"});
          border:${isCenter ? "2" : "1"}px solid ${arrowColor};
        ">
          <svg width="${size * 0.55}" height="${size * 0.55}" viewBox="0 0 24 24" fill="none"
            stroke="${arrowColor}" stroke-width="${isCenter ? 3.5 : 2.5}" 
            stroke-linecap="round" stroke-linejoin="round"
            style="transform:rotate(${pointerRot}deg);transition:transform 1.2s cubic-bezier(0.25,1,0.5,1)">
            <path d="M12 20V4"/><path d="M5 11l7-7 7 7"/>
          </svg>
        </div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        className: "",
      });

      const marker = L.marker([pt.lat, pt.lon], { icon, interactive: isCenter })
        .addTo(layerGroup.current!);

      if (isCenter) {
        marker.bindTooltip(
          `<div style="font-family:system-ui;text-align:center;line-height:1.5;padding:2px 4px;">
            <div style="font-size:15px;font-weight:900;color:${arrowColor}">${windSpeed.toFixed(1)} km/h</div>
            <div style="font-size:11px;opacity:0.7">Rajada: ${windGust.toFixed(1)} km/h</div>
            <div style="font-size:11px;opacity:0.7">Direção: ${windDirectionLabel}</div>
          </div>`,
          { permanent: true, direction: "right", offset: [12, 0], className: "shadow-xl rounded-xl border-0" }
        );
      }
    });

    // Invalidar tamanho do mapa ao montar
    setTimeout(() => mapInstance.current?.invalidateSize(), 100);

    return () => {};
  }, [windSpeed, windGust, windDirectionLabel, windDirectionDegree, mapMode]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full space-y-3">
      {/* Toggle Buttons */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setMapMode("operacional")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-300 ${
            mapMode === "operacional"
              ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
              : "bg-transparent border-slate-300 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:border-blue-500/50"
          }`}
        >
          🗺️ Mapa Operacional
        </button>
        <button
          onClick={() => setMapMode("windy")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-300 ${
            mapMode === "windy"
              ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
              : "bg-transparent border-slate-300 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:border-blue-500/50"
          }`}
        >
          🌊 Mapa Avançado (Windy)
        </button>
      </div>

      {/* Map Container */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/10" style={{ height: "420px" }}>
        
        {/* Leaflet Map */}
        {mapMode === "operacional" && (
          <>
            <div ref={mapContainer} className="w-full h-full z-0" />

            {/* Overlay Box */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-white/10 p-3.5 rounded-xl shadow-2xl min-w-[170px]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-black text-[9px] uppercase tracking-[0.2em] opacity-40">
                  Tempo real
                </span>
              </div>
              
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-baseline gap-3">
                  <span className="opacity-60 text-xs font-medium">Vento</span>
                  <span className="font-black text-blue-600 dark:text-blue-400 tabular-nums">{windSpeed.toFixed(1)} <span className="text-[9px] font-normal opacity-60">km/h</span></span>
                </div>
                <div className="flex justify-between items-baseline gap-3">
                  <span className="opacity-60 text-xs font-medium">Rajada</span>
                  <span className={`font-black tabular-nums ${windGust > 20 ? "text-rose-500" : ""}`}>{windGust.toFixed(1)} <span className="text-[9px] font-normal opacity-60">km/h</span></span>
                </div>
                <div className="flex justify-between items-baseline gap-3">
                  <span className="opacity-60 text-xs font-medium">Chuva</span>
                  <span className={`font-black tabular-nums ${precipitation > 0 ? "text-blue-500" : ""}`}>{precipitation.toFixed(1)} <span className="text-[9px] font-normal opacity-60">mm</span></span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="absolute top-3 right-3 z-[400] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-[10px] font-bold space-y-1">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Seguro</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Atenção</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Risco</div>
            </div>
          </>
        )}

        {/* Windy Iframe */}
        {mapMode === "windy" && (
          <iframe
            title="Windy Weather Map"
            width="100%"
            height="100%"
            src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=10&overlay=wind&product=ecmwf&level=surface&lat=-23.28&lon=-47.67"
            frameBorder="0"
            className="w-full h-full"
            loading="lazy"
          />
        )}
      </div>
    </div>
  );
}
