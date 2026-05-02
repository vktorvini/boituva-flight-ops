import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface WeatherMapProps {
  windSpeed: number;
  windGust: number;
  windDirectionLabel: string;
  precipitation: number;
}

export default function WeatherMap({
  windSpeed,
  windGust,
  windDirectionLabel,
  precipitation,
}: WeatherMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  // Centralizado em Boituva conforme requisito
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
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapInstance.current);

      // Ícone customizado simples
      const icon = L.divIcon({
        html: `<div style="background:#3b82f6;border:3px solid white;border-radius:50%;width:18px;height:18px;box-shadow:0 0 12px #3b82f6;"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        className: "",
      });

      // Adicionar marcador e tooltip (sempre visível ou click)
      const marker = L.marker([BOITUVA_LAT, BOITUVA_LON], { icon }).addTo(
        mapInstance.current
      );

      marker.bindTooltip(
        `<div style="font-family:system-ui;padding:4px;text-align:center">
          <strong>Vento:</strong> ${windSpeed.toFixed(1)} km/h<br/>
          <strong>Rajada:</strong> ${windGust.toFixed(1)} km/h<br/>
          <strong>Direção:</strong> ${windDirectionLabel}
        </div>`,
        { permanent: true, direction: "top", offset: [0, -10] }
      );
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [windSpeed, windGust, windDirectionLabel]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-white/10" style={{ height: "400px" }}>
      {/* Container do Mapa */}
      <div ref={mapContainer} className="w-full h-full z-0" />

      {/* Overlay Simples Fixo (Sem animação complexa) */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-xl flex flex-col gap-1 text-sm text-slate-800 dark:text-zinc-200">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
          Condições Locais
        </h4>
        <div className="flex justify-between gap-4">
          <span className="font-medium">Vento</span>
          <span className="font-black">{windSpeed.toFixed(1)} km/h</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="font-medium">Rajada</span>
          <span className="font-black">{windGust.toFixed(1)} km/h</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="font-medium">Chuva</span>
          <span className="font-black">{precipitation.toFixed(1)} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="font-medium">Direção</span>
          <span className="font-black">{windDirectionLabel}</span>
        </div>
      </div>
    </div>
  );
}
