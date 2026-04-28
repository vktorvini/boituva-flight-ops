import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import { getFlightStatus, FlightStatus } from "@/lib/api";

// Boituva – coordenadas centrais e aeródromo
const BOITUVA_LAT = -23.2833;
const BOITUVA_LON = -47.6667;
// Aeródromo de Boituva (SDBV) – ~2km ao sul do centro
const AERODROMO_LAT = -23.3036;
const AERODROMO_LON = -47.6714;

/**
 * Gera uma grade de pontos de calor ao redor de Boituva.
 * O risco diminui gradualmente com a distância radial do aeródromo.
 */
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

      // Distância radial normalizada 0-1
      const dist = Math.sqrt((i / steps) ** 2 + (j / steps) ** 2);
      if (dist > 1.0) continue;

      // Base intensity fixa dependendo do status para colorir bem o mapa
      const baseIntensity = status === "SAFE" ? 0.6 : status === "WARNING" ? 0.8 : 1.0;
      const falloff = Math.max(0, 1.0 - dist * 0.85);
      // Adicionar variação aleatória suave para aspecto orgânico
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
  const leafletMap = useRef<any>(null);
  const heatLayer = useRef<any>(null);

  // Buscar status de voo
  useEffect(() => {
    getFlightStatus()
      .then((r) => setStatus(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Inicializar mapa Leaflet (client-side only)
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Carregar Leaflet e leaflet-heat dinamicamente
    const loadLeaflet = async () => {
      if (typeof window === "undefined") return;

      // @ts-ignore
      if (!window.L) {
        // Injetar CSS do Leaflet
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);

        // Injetar JS do Leaflet
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });

        // Injetar leaflet-heat
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

      // Tile layer – OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      // Marcador do Aeródromo
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

      // Marcador de Boituva Centro
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
  }, []);

  // Atualizar camada de calor quando status muda
  useEffect(() => {
    if (!mapReady || !status || !leafletMap.current) return;
    // @ts-ignore
    const L = window.L;
    if (!L) return;

    const points = generateHeatPoints(status.risk_score, status.status);

    // Gradiente baseado no status
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
  }, [mapReady, status]);

  const statusConfig = status
    ? {
        SAFE: { label: "VOO LIBERADO", color: "#34d399", emoji: "✅", flag: "Bandeira Verde", textClass: "text-green-500" },
        WARNING: { label: "OBSERVAÇÃO", color: "#fbbf24", emoji: "⚠️", flag: "Bandeira Amarela", textClass: "text-yellow-500" },
        PROHIBITED: { label: "VOO CANCELADO", color: "#f87171", emoji: "🚫", flag: "Bandeira Vermelha", textClass: "text-red-500" },
      }[status.status]
    : null;

  return (
    <>
      <Head>
        <title>Boituva Flight Ops – Mapa de Risco</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-3 py-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Mapa de Calor Operacional
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 tracking-tighter">
            Risco em Boituva
          </h1>
          <p className="text-zinc-500 text-sm">
            Mapa de calor de risco para voo no raio de ~20km do aeródromo
          </p>
        </div>

        {/* Status resumido */}
        {!loading && status && statusConfig && (
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="bg-zinc-950/60 border border-white/10 rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-2xl">{statusConfig.emoji}</span>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Status Atual</p>
                <p
                  className="font-black text-lg"
                  style={{ color: statusConfig.color }}
                >
                  {statusConfig.label}
                </p>
              </div>
            </div>
            <div className="bg-zinc-950/60 border border-white/10 rounded-xl px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Risco</p>
              <p className="font-black text-lg text-white">
                {Math.round(status.risk_score)}/100
              </p>
            </div>
            <div className="bg-zinc-950/60 border border-white/10 rounded-xl px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Vento</p>
              <p className="font-black text-lg text-white">
                {status.wind_speed.toFixed(1)} km/h
              </p>
            </div>
            <div className="bg-zinc-950/60 border border-white/10 rounded-xl px-5 py-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Rajada</p>
              <p className="font-black text-lg text-white">
                {status.wind_gust.toFixed(1)} km/h
              </p>
            </div>
          </div>
        )}

        {/* Mapa */}
        <div className="relative">
          <div
            ref={mapRef}
            id="boituva-risk-map"
            className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
            style={{ height: "520px" }}
          />

          {/* Loading overlay */}
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 rounded-2xl">
              <div className="text-center space-y-3">
                <div className="w-10 h-10 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                <p className="text-zinc-400 text-sm">Carregando mapa...</p>
              </div>
            </div>
          )}

          {/* Marca d'água */}
          {status && statusConfig && mapReady && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-[400] opacity-30 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
               <span className={`text-6xl md:text-8xl font-black uppercase text-center transform -rotate-12 leading-none ${statusConfig.textClass}`}>
                 {statusConfig.flag}
                 <span className="block text-4xl md:text-6xl mt-2">{statusConfig.label}</span>
               </span>
            </div>
          )}
        </div>

        {/* Legenda Clara */}
        <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-4 space-y-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
            Guia de Cores e Status Oficial
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-3 rounded bg-gradient-to-r from-green-700 to-green-400" />
                <span className="text-sm font-black text-green-400">VERDE (Liberado)</span>
              </div>
              <span className="text-xs text-zinc-400">Condições perfeitas: céu limpo, ventos fracos e visibilidade alta.</span>
            </div>
            
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-3 rounded bg-gradient-to-r from-yellow-700 to-yellow-400" />
                <span className="text-sm font-black text-yellow-500">AMARELA (Observação)</span>
              </div>
              <span className="text-xs text-zinc-400">Ventos em atenção ou ameaça leve de chuva. Aguardar 30 min.</span>
            </div>

            <div className="flex flex-col gap-1 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-3 rounded bg-gradient-to-r from-red-700 to-red-400" />
                <span className="text-sm font-black text-red-500">VERMELHA (Cancelado)</span>
              </div>
              <span className="text-xs text-zinc-400">Risco operacional. Ventos fortes acima de 22km/h ou chuva detectada.</span>
            </div>
          </div>
          
          <div className="flex gap-6 pt-3 mt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_10px_#3b82f6]" />
              <span className="text-xs text-zinc-400">Aeródromo de Boituva (SDBV)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500 border border-white" />
              <span className="text-xs text-zinc-400">Centro da Cidade</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
