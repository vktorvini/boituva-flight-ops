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

      // Intensidade cai com distância e escala com risco
      const baseIntensity = riskScore / 100;
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
        SAFE: { label: "SEGURO", color: "#34d399", emoji: "✅" },
        WARNING: { label: "ATENÇÃO", color: "#fbbf24", emoji: "⚠️" },
        PROHIBITED: { label: "PROIBIDO", color: "#f87171", emoji: "🚫" },
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
        </div>

        {/* Legenda */}
        <div className="bg-zinc-950/40 border border-white/5 rounded-xl p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
            Legenda
          </p>
          <div className="flex flex-wrap gap-6">
            {[
              { label: "Seguro (0–30)", gradient: "from-emerald-900 via-emerald-500 to-emerald-300" },
              { label: "Atenção (31–60)", gradient: "from-amber-900 via-amber-500 to-yellow-300" },
              { label: "Proibido (61–100)", gradient: "from-red-950 via-red-600 to-red-300" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <div
                  className={`w-12 h-3 rounded-full bg-gradient-to-r ${l.gradient}`}
                />
                <span className="text-xs text-zinc-400">{l.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
              <span className="text-xs text-zinc-400">Aeródromo SDBV</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500 border border-white" />
              <span className="text-xs text-zinc-400">Centro de Boituva</span>
            </div>
          </div>
          <p className="text-[10px] text-zinc-600">
            A intensidade do calor é baseada no risk_score atual ({status ? Math.round(status.risk_score) : "–"}/100)
            e diminui radialmente a partir do aeródromo no raio de ~20 km.
          </p>
        </div>
      </div>
    </>
  );
}
