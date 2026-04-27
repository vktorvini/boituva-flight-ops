import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

export interface WeatherCurrent {
  timestamp: string;
  wind_speed: number;
  wind_gust: number;
  wind_direction: number;
  temperature: number;
  humidity: number;
  pressure: number;
  precipitation: number;
}

// Phase 4: resultado individual por fonte
export interface SourceDetail {
  source_name: string;
  label: string;
  available: boolean;
  wind_speed: number;
  wind_gust: number;
  precipitation: number;
  visibility: number;
  risk_score: number | null;
  status: "SAFE" | "WARNING" | "PROHIBITED" | null;
  reasons: string[];
  weight: number;
}

export interface FlightStatus {
  timestamp: string;
  status: "SAFE" | "WARNING" | "PROHIBITED";
  risk_score: number;
  reasons: string[];
  wind_speed: number;
  wind_gust: number;
  precipitation: number;
  // Phase 2
  risk_model_version?: string;
  breakdown?: {
    wind_component: number;
    gust_component: number;
    precipitation_component: number;
    visibility_component: number;
    weighted_score: number;
    weight_wind: number;
    weight_gust: number;
    weight_precipitation: number;
    weight_visibility: number;
    uncertainty_factor?: number;
  };
  confidence?: number;
  // Phase 3
  source_count?: number;
  // Phase 4
  sources_detail?: SourceDetail[];
}

export interface WindowEntry {
  hour: string;
  status: "SAFE" | "WARNING" | "PROHIBITED";
  wind_speed: number;
  wind_gust: number;
  precipitation: number;
}

export interface FlightWindow {
  window: WindowEntry[];
}

export interface HistoryEntry {
  timestamp: string;
  status: "SAFE" | "WARNING" | "PROHIBITED";
  risk_score: number;
  reasons: string[];
}

export const getWeather = () => API.get<WeatherCurrent>("/clima/atual");
export const getFlightStatus = () => API.get<FlightStatus>("/voo/status");
export const getFlightWindow = () => API.get<FlightWindow>("/voo/janela");
export const getHistory = (limit = 48) =>
  API.get<HistoryEntry[]>(`/voo/historico?limit=${limit}`);
