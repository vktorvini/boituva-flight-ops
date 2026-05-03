import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface OperationalMapProps {
  windSpeed: number;
  windGust: number;
  windDirectionLabel: string;
  windDirectionDegree?: number;
  precipitation: number;
  riskScore?: number;
  status?: "SAFE" | "WARNING" | "PROHIBITED";
  /** true = versão fullscreen (aba Mapa), false = widget na Home */
  fullscreen?: boolean;
}

// Grid 3x3 com variações realistas determinísticas
function generateWindGrid(
  cLat: number, cLon: number, speed: number, gust: number, deg: number
) {
  const spread = 0.022;
  const pts: { lat: number; lon: number; speed: number; gust: number; deg: number }[] = [];
  for (let r = -1; r <= 1; r++) {
    for (let c = -1; c <= 1; c++) {
      const seed = (r + 2) * 5 + (c + 2) * 3;
      const sv = 1 + ((seed % 7) - 3) * 0.08;
      const dv = ((seed % 5) - 2) * 6;
      pts.push({ lat: cLat + r * spread, lon: cLon + c * spread, speed: speed * sv, gust: gust * sv, deg: deg + dv });
    }
  }
  return pts;
}

type MapLayer = "vento" | "rajada" | "risco";

export default function OperationalMap({
  windSpeed, windGust, windDirectionLabel, windDirectionDegree,
  precipitation, riskScore, status, fullscreen = false,
}: OperationalMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);
  const heatCircle = useRef<L.Circle | null>(null);
  const [mapMode, setMapMode] = useState<"operacional" | "windy">("operacional");
  const [activeLayer, setActiveLayer] = useState<MapLayer>("vento");

  const LAT = -23.2833, LON = -47.6667;

  const getHeatColor = (val: number) => {
    if (val <= 12) return "rgba(34,197,94,0.15)";
    if (val <= 20) return "rgba(234,179,8,0.18)";
    return "rgba(244,63,94,0.22)";
  };
  const getHeatBorder = (val: number) => {
    if (val <= 12) return "rgba(34,197,94,0.4)";
    if (val <= 20) return "rgba(234,179,8,0.5)";
    return "rgba(244,63,94,0.5)";
  };

  useEffect(() => {
    if (!mapContainer.current || mapMode !== "operacional") return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapContainer.current, {
        center: [LAT, LON],
        zoom: fullscreen ? 12 : 13,
        zoomControl: fullscreen,
        scrollWheelZoom: fullscreen,
        dragging: fullscreen,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OSM, © CARTO",
      }).addTo(mapInstance.current);
      layerGroup.current = L.layerGroup().addTo(mapInstance.current);
    }

    if (layerGroup.current) layerGroup.current.clearLayers();

    const dirDeg = windDirectionDegree ?? 0;
    const heatVal = activeLayer === "rajada" ? windGust : activeLayer === "risco" ? (riskScore ?? windGust) : windGust;

    // Heatmap circle
    if (heatCircle.current) mapInstance.current.removeLayer(heatCircle.current);
    
    const circleRadius = activeLayer === "risco" ? 4000 : 3000;
    const circleOpacity = activeLayer === "risco" ? 0.9 : 0.7;
    
    heatCircle.current = L.circle([LAT, LON], {
      radius: circleRadius,
      fillColor: activeLayer === "risco"
        ? (riskScore && riskScore > 50 ? "rgba(244,63,94,0.25)" : riskScore && riskScore > 20 ? "rgba(234,179,8,0.2)" : "rgba(34,197,94,0.15)")
        : getHeatColor(heatVal),
      fillOpacity: circleOpacity,
      color: activeLayer === "risco"
        ? (riskScore && riskScore > 50 ? "rgba(244,63,94,0.5)" : riskScore && riskScore > 20 ? "rgba(234,179,8,0.4)" : "rgba(34,197,94,0.3)")
        : getHeatBorder(heatVal),
      weight: 2,
    }).addTo(mapInstance.current);

    // Wind grid arrows
    if (activeLayer !== "risco") {
      const useGust = activeLayer === "rajada";
      const displaySpeed = useGust ? windGust : windSpeed;
      const grid = generateWindGrid(LAT, LON, displaySpeed, windGust, dirDeg);

      grid.forEach((pt, idx) => {
        const rot = pt.deg + 180;
        const isCenter = idx === 4;
        const scale = Math.min((useGust ? pt.gust : pt.speed) / 20, 1.5);
        const base = isCenter ? 38 : 26;
        const size = Math.round(base * (0.7 + scale * 0.5));
        const color = pt.gust > 20 ? "#f43f5e" : pt.gust > 12 ? "#eab308" : "#3b82f6";

        const html = `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${isCenter ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)"};border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,${isCenter ? "0.2" : "0.1"});border:${isCenter ? 2 : 1}px solid ${color}"><svg width="${size * 0.55}" height="${size * 0.55}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${isCenter ? 3.5 : 2.5}" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${rot}deg);transition:transform 1.2s cubic-bezier(0.25,1,0.5,1)"><path d="M12 20V4"/><path d="M5 11l7-7 7 7"/></svg></div>`;

        const icon = L.divIcon({ html, iconSize: [size, size], iconAnchor: [size / 2, size / 2], className: "" });
        const marker = L.marker([pt.lat, pt.lon], { icon, interactive: isCenter }).addTo(layerGroup.current!);

        if (isCenter) {
          marker.bindTooltip(
            `<div style="font-family:system-ui;text-align:center;line-height:1.5;padding:2px 4px"><div style="font-size:15px;font-weight:900;color:${color}">${windSpeed.toFixed(1)} km/h</div><div style="font-size:11px;opacity:0.7">Rajada: ${windGust.toFixed(1)} km/h</div><div style="font-size:11px;opacity:0.7">Direção: ${windDirectionLabel}</div></div>`,
            { permanent: true, direction: "right", offset: [12, 0], className: "shadow-xl rounded-xl border-0" }
          );
        }
      });
    }

    setTimeout(() => mapInstance.current?.invalidateSize(), 100);
    return () => {};
  }, [windSpeed, windGust, windDirectionLabel, windDirectionDegree, mapMode, activeLayer, riskScore]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  const height = fullscreen ? "calc(100vh - 160px)" : "420px";

  return (
    <div className="w-full space-y-3">
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* Map source toggle */}
        <button onClick={() => { setMapMode("operacional"); }} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all duration-300 ${mapMode === "operacional" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-transparent border-slate-300 dark:border-white/10 text-slate-500 dark:text-zinc-400"}`}>
          🗺️ Operacional
        </button>
        <button onClick={() => setMapMode("windy")} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all duration-300 ${mapMode === "windy" ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-transparent border-slate-300 dark:border-white/10 text-slate-500 dark:text-zinc-400"}`}>
          🌊 Windy
        </button>

        {mapMode === "operacional" && (
          <>
            <span className="w-px h-5 bg-slate-300 dark:bg-white/10 mx-1" />
            {(["vento", "rajada", "risco"] as MapLayer[]).map((layer) => (
              <button key={layer} onClick={() => setActiveLayer(layer)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all duration-300 ${activeLayer === layer ? "bg-slate-800 dark:bg-white text-white dark:text-black border-slate-800 dark:border-white shadow-md" : "bg-transparent border-slate-300 dark:border-white/10 text-slate-500 dark:text-zinc-400"}`}>
                {layer === "vento" ? "💨 Vento" : layer === "rajada" ? "🌀 Rajada" : "⚠️ Risco"}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Map */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/10" style={{ height }}>
        {mapMode === "operacional" && (
          <>
            <div ref={mapContainer} className="w-full h-full z-0" />

            {/* Data overlay */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-2xl min-w-[160px]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
                <span className="font-black text-[9px] uppercase tracking-[0.2em] opacity-40">Ao vivo</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-3"><span className="opacity-60 text-xs">Vento</span><span className="font-black text-blue-600 dark:text-blue-400 tabular-nums">{windSpeed.toFixed(1)} <span className="text-[9px] font-normal opacity-50">km/h</span></span></div>
                <div className="flex justify-between gap-3"><span className="opacity-60 text-xs">Rajada</span><span className={`font-black tabular-nums ${windGust > 20 ? "text-rose-500" : ""}`}>{windGust.toFixed(1)} <span className="text-[9px] font-normal opacity-50">km/h</span></span></div>
                <div className="flex justify-between gap-3"><span className="opacity-60 text-xs">Chuva</span><span className={`font-black tabular-nums ${precipitation > 0 ? "text-blue-500" : ""}`}>{precipitation.toFixed(1)} <span className="text-[9px] font-normal opacity-50">mm</span></span></div>
                {status && (
                  <div className={`mt-1 text-center text-[10px] font-black uppercase tracking-wider py-1 rounded-lg ${status === "SAFE" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : status === "WARNING" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"}`}>
                    {status === "SAFE" ? "Seguro" : status === "WARNING" ? "Atenção" : "Risco"}
                  </div>
                )}
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

        {mapMode === "windy" && (
          <iframe title="Windy" width="100%" height="100%" src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=10&overlay=wind&product=ecmwf&level=surface&lat=-23.28&lon=-47.67" frameBorder="0" className="w-full h-full" loading="lazy" />
        )}
      </div>
    </div>
  );
}
