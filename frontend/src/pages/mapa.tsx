import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { getFlightStatus, FlightStatus } from "@/lib/api";

const BOITUVA_LAT = -23.2833;
const BOITUVA_LON = -47.6667;
const AERODROMO_LAT = -23.3036;
const AERODROMO_LON = -47.6714;

function generateHeatPoints(
  riskScore: number,
  status: string
): [number, number, number][] {
  const points: [number, number, number][] = [];
  const steps = 15;
  const radiusDeg = 0.18; // ~20km

  for (let i = -steps; i <= steps; i++) {
    for (let j = -steps; j <= steps; j++) {
      const lat = AERODROMO_LAT + (i / steps) * radiusDeg;
      const lon = AERODROMO_LON + (j / steps) * radiusDeg;

      const dist = Math.sqrt((i / steps) ** 2 + (j / steps) ** 2);
      if (dist > 1.0) continue;

      const baseIntensity = status === "SAFE" ? 0.6 : status === "WARNING" ? 0.8 : 1.0;
      const falloff = Math.max(0, 1.0 - dist * 0.85);
      const jitter = 0.9 + Math.random() * 0.2;
      const intensity = Math.min(1.0, baseIntensity * falloff * jitter);

      if (intensity > 0.05) {
        points.push([lat, lon, intensity]);
      }
    }
  }
  return points;
}

export default function MapaPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<FlightStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapMode, setMapMode] = useState<"risk" | "wind">("risk");
  
  const leafletMap = useRef<any>(null);
  const heatLayer = useRef<any>(null);

  useEffect(() => {
    getFlightStatus()
      .then((r) => setStatus(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current || mapMode !== "risk") return;

    const loadLeaflet = async () => {
      if (typeof window === "undefined") return;

      // @ts-ignore
      if (!window.L) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);

        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });

        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      // @ts-ignore
      const L = window.L;
      if (!mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [BOITUVA_LAT, BOITUVA_LON],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      const aerodromoIcon = L.divIcon({
        html: `<div style="background:#3b82f6;border:3px solid white;border-radius:50%;width:18px;height:18px;box-shadow:0 0 12px #3b82f6;"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        className: "",
      });

      L.marker([AERODROMO_LAT, AERODROMO_LON], { icon: aerodromoIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui;padding:4px">
            <strong>✈️ Aeródromo de Boituva (SDBV)</strong><br/>
            <small>-23.3036, -47.6714</small>
          </div>`
        );

      const boituvaIcon = L.divIcon({
        html: `<div style="background:#8b5cf6;border:2px solid white;border-radius:50%;width:12px;height:12px;"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        className: "",
      });
      L.marker([BOITUVA_LAT, BOITUVA_LON], { icon: boituvaIcon })
        .addTo(map)
        .bindPopup("<strong>📍 Boituva – Centro</strong>");

      leafletMap.current = map;
      setMapReady(true);
    };

    loadLeaflet();
  }, [mapMode]);

  useEffect(() => {
    if (mapMode !== "risk" || !mapReady || !status || !leafletMap.current) return;
    // @ts-ignore
    const L = window.L;
    if (!L) return;

    const points = generateHeatPoints(status.risk_score, status.status);

    const gradient =
      status.status === "SAFE"
        ? { 0.0: "#064e3b", 0.4: "#059669", 0.7: "#34d399", 1.0: "#a7f3d0" }
        : status.status === "WARNING"
        ? { 0.0: "#451a03", 0.4: "#d97706", 0.7: "#fbbf24", 1.0: "#fef08a" }
        : { 0.0: "#450a0a", 0.4: "#dc2626", 0.7: "#f87171", 1.0: "#fecaca" };

    if (heatLayer.current) {
      leafletMap.current.removeLayer(heatLayer.current);
    }

    heatLayer.current = L.heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 14,
      max: 1.0,
      gradient,
    }).addTo(leafletMap.current);
  }, [mapReady, status, mapMode]);

  const statusConfig = status
    ? {
        SAFE: { label: "VOO LIBERADO", color: "#34d399", emoji: "✅", flag: "Bandeira Verde", textClass: "text-emerald-500" },
        WARNING: { label: "OBSERVAÇÃO", color: "#fbbf24", emoji: "⚠️", flag: "Bandeira Amarela", textClass: "text-amber-500" },
        PROHIBITED: { label: "VOO CANCELADO", color: "#f87171", emoji: "🚫", flag: "Bandeira Vermelha", textClass: "text-rose-500" },
      }[status.status]
    : null;

  return (
    <>
      <Head>
        <title>Boituva Flight Ops – Mapa Operacional</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-3 py-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
               style={{ backgroundColor: "var(--bg-card)", color: "var(--accent-blue)", border: "1px solid var(--border)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--accent-blue)" }} />
            Mapa Operacional Multi-Camadas
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter" style={{ color: "var(--text-primary)" }}>
            Boituva Live Map
          </h1>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Visualização de Risco vs. Fluxo de Vento
          </p>
        </div>

        {/* Status resumido */}
        {!loading && status && statusConfig && (
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="card px-5 py-3 flex items-center gap-3">
              <span className="text-2xl">{statusConfig.emoji}</span>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>Status Atual</p>
                <p className="font-black text-lg" style={{ color: statusConfig.color }}>
                  {statusConfig.label}
                </p>
              </div>
            </div>
            <div className="card px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>Risco</p>
              <p className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
                {Math.round(status.risk_score)}/100
              </p>
            </div>
            <div className="card px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>Vento</p>
              <p className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
                {status.wind_speed.toFixed(1)} km/h
              </p>
            </div>
            <div className="card px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>Rajada</p>
              <p className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
                {status.wind_gust.toFixed(1)} km/h
              </p>
            </div>
          </div>
        )}

        {/* Map Toggles */}
        <div className="flex justify-center gap-2">
          <button 
            onClick={() => setMapMode("risk")}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
              mapMode === "risk" 
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" 
              : "bg-transparent border border-gray-500 text-gray-500 hover:bg-gray-500/10"
            }`}
          >
            🔥 Mapa de Risco
          </button>
          <button 
            onClick={() => setMapMode("wind")}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
              mapMode === "wind" 
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" 
              : "bg-transparent border border-gray-500 text-gray-500 hover:bg-gray-500/10"
            }`}
          >
            💨 Correntes de Vento
          </button>
        </div>

        {/* Mapa Container */}
        <div className="relative">
          {mapMode === "risk" ? (
            <div
              ref={mapRef}
              id="boituva-risk-map"
              className="w-full rounded-2xl overflow-hidden shadow-2xl z-0"
              style={{ height: "520px", border: "1px solid var(--border)" }}
            />
          ) : (
            <div className="w-full rounded-2xl overflow-hidden shadow-2xl z-0" style={{ height: "520px", border: "1px solid var(--border)" }}>
              <iframe 
                width="100%" 
                height="520" 
                src={`https://embed.windy.com/embed2.html?lat=${BOITUVA_LAT}&lon=${BOITUVA_LON}&zoom=11&level=surface&overlay=wind&menu=&message=&marker=true&calendar=&pressure=&type=map&location=coordinates&detail=&detailLat=${BOITUVA_LAT}&detailLon=${BOITUVA_LON}&metricWind=km%2Fh&metricTemp=%C2%B0C`}
                frameBorder="0"
                style={{ filter: "invert(0.9) hue-rotate(180deg)" }}
                className="dark:filter-none transition-all duration-500"
              />
            </div>
          )}

          {/* Loading overlay for Risk map */}
          {mapMode === "risk" && !mapReady && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl z-10" style={{ backgroundColor: "var(--bg-page)" }}>
              <div className="text-center space-y-3">
                <div className="w-10 h-10 border-2 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Carregando mapa de risco...</p>
              </div>
            </div>
          )}

          {/* Marca d'água no modo Risco */}
          {mapMode === "risk" && status && statusConfig && mapReady && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-[400] opacity-30 drop-shadow-md">
               <span className={`text-6xl md:text-8xl font-black uppercase text-center transform -rotate-12 leading-none ${statusConfig.textClass}`}>
                 {statusConfig.flag}
                 <span className="block text-4xl md:text-6xl mt-2">{statusConfig.label}</span>
               </span>
            </div>
          )}
        </div>

        {/* Legenda (Apenas Risco) */}
        {mapMode === "risk" && (
          <div className="card p-4 space-y-4">
            <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>
              Guia de Cores e Status Oficial
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1 p-3 rounded-lg border" style={{ backgroundColor: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.1)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-3 rounded bg-gradient-to-r from-emerald-700 to-emerald-400" />
                  <span className="text-sm font-black text-emerald-500">VERDE (Liberado)</span>
                </div>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Condições perfeitas: céu limpo, ventos fracos e visibilidade alta.</span>
              </div>
              
              <div className="flex flex-col gap-1 p-3 rounded-lg border" style={{ backgroundColor: "rgba(245, 158, 11, 0.05)", borderColor: "rgba(245, 158, 11, 0.1)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-3 rounded bg-gradient-to-r from-amber-700 to-amber-400" />
                  <span className="text-sm font-black text-amber-500">AMARELA (Observação)</span>
                </div>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Ventos em atenção ou ameaça leve de chuva. Aguardar 30 min.</span>
              </div>

              <div className="flex flex-col gap-1 p-3 rounded-lg border" style={{ backgroundColor: "rgba(244, 63, 94, 0.05)", borderColor: "rgba(244, 63, 94, 0.1)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-3 rounded bg-gradient-to-r from-rose-700 to-rose-400" />
                  <span className="text-sm font-black text-rose-500">VERMELHA (Cancelado)</span>
                </div>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Risco operacional. Ventos fortes acima de 22km/h ou chuva detectada.</span>
              </div>
            </div>
            
            <div className="flex gap-6 pt-3 mt-3 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ borderColor: "var(--bg-card)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Aeródromo de Boituva (SDBV)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500 border" style={{ borderColor: "var(--bg-card)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Centro da Cidade</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
