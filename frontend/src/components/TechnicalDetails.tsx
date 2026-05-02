import React, { useState } from "react";
import { FlightStatus } from "@/lib/api";

interface Props {
  status: FlightStatus;
}

export default function TechnicalDetails({ status }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full mt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-3 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-zinc-900 text-sm font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
      >
        {isOpen ? "Ocultar Dados Técnicos" : "Ver Dados Técnicos"}
      </button>

      {isOpen && (
        <div className="mt-4 p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-zinc-950/50 space-y-6 animate-in fade-in slide-in-from-top-2">
          {/* Confiança e Variância */}
          <div className="flex flex-wrap gap-4 justify-around text-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-500 font-bold">Confiança do Modelo</p>
              <p className="text-xl font-black text-slate-800 dark:text-zinc-200">
                {status.confidence ? `${Math.round(status.confidence * 100)}%` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-500 font-bold">Fontes Consultadas</p>
              <p className="text-xl font-black text-slate-800 dark:text-zinc-200">
                {status.source_count ?? "N/A"}
              </p>
            </div>
            {status.breakdown && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-500 font-bold">Fator de Incerteza</p>
                <p className="text-xl font-black text-slate-800 dark:text-zinc-200">
                  {status.breakdown.uncertainty_factor?.toFixed(2) ?? "1.00"}x
                </p>
              </div>
            )}
          </div>

          {/* Lista de Fontes */}
          {status.sources_detail && status.sources_detail.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-center text-slate-500 dark:text-zinc-500">
                Detalhamento por Fonte
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {status.sources_detail.map((src) => (
                  <div
                    key={src.source_name}
                    className="p-3 rounded-lg border text-sm"
                    style={{
                      borderColor: src.available ? "var(--border)" : "rgba(244,63,94,0.2)",
                      backgroundColor: src.available ? "var(--bg-card)" : "rgba(244,63,94,0.05)",
                    }}
                  >
                    <p className="font-bold uppercase tracking-wider text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                      {src.source_name.replace("_", " ")}
                    </p>
                    {src.available ? (
                      <div className="space-y-1">
                        <div className="flex justify-between"><span>Vento:</span> <span className="font-bold">{src.wind_speed} km/h</span></div>
                        <div className="flex justify-between"><span>Rajada:</span> <span className="font-bold">{src.wind_gust} km/h</span></div>
                        <div className="flex justify-between"><span>Risco:</span> <span className="font-bold">{src.risk_score?.toFixed(1) ?? "-"}</span></div>
                      </div>
                    ) : (
                      <p className="text-rose-500 font-medium text-xs">Offline / Falha na coleta</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
