import { useEffect, useState } from "react";
import Head from "next/head";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getFlightWindow, WindowEntry } from "@/lib/api";

interface ChartData {
  time: string;
  wind: number;
  gust: number;
  rain: number;
  status: string;
}

const STATUS_COLOR: Record<string, string> = {
  SAFE: "#22c55e",
  WARNING: "#eab308",
  PROHIBITED: "#ef4444",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs space-y-1">
        <p className="text-zinc-400 mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function GraficoPage() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFlightWindow()
      .then((r) => {
        const mapped: ChartData[] = r.data.window.slice(0, 24).map((e: WindowEntry) => ({
          time: format(parseISO(e.hour), "dd/MM HH:mm", { locale: ptBR }),
          wind: parseFloat(e.wind_speed.toFixed(1)),
          gust: parseFloat(e.wind_gust.toFixed(1)),
          rain: parseFloat(e.precipitation.toFixed(1)),
          status: e.status,
        }));
        setData(mapped);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );

  return (
    <>
      <Head>
        <title>Boituva Flight Ops – Gráficos</title>
      </Head>

      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-white">Gráficos – Próximas 24h</h1>

        {/* Wind chart */}
        <div className="card space-y-4">
          <h2 className="text-zinc-300 font-semibold">Velocidade do Vento (km/h)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gustGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="time" tick={{ fill: "#71717a", fontSize: 10 }} interval={3} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={15} stroke="#eab308" strokeDasharray="4 4" label={{ value: "15 ⚠️", fill: "#eab308", fontSize: 10 }} />
              <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "20 🚫", fill: "#ef4444", fontSize: 10 }} />
              <Area type="monotone" dataKey="wind" name="Vento" stroke="#3b82f6" fill="url(#windGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="gust" name="Rajada" stroke="#8b5cf6" fill="url(#gustGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Vento</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 inline-block" /> Rajada</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-500 inline-block border-dashed" /> Limite aviso (15)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block border-dashed" /> Limite proibição (20)</span>
          </div>
        </div>

        {/* Rain chart */}
        <div className="card space-y-4">
          <h2 className="text-zinc-300 font-semibold">Precipitação (mm)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="time" tick={{ fill: "#71717a", fontSize: 10 }} interval={3} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rain" name="Chuva (mm)" fill="#38bdf8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status timeline */}
        <div className="card space-y-3">
          <h2 className="text-zinc-300 font-semibold">Status por Hora</h2>
          <div className="grid grid-cols-12 gap-1">
            {data.map((d, i) => (
              <div
                key={i}
                title={`${d.time} – ${d.status}`}
                className="h-10 rounded flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: STATUS_COLOR[d.status] + "33",
                  borderWidth: 1,
                  borderColor: STATUS_COLOR[d.status],
                  color: STATUS_COLOR[d.status],
                }}
              >
                {format(parseISO(/* original index */ i === 0 ? new Date().toISOString() : new Date().toISOString()), "HH")}
              </div>
            ))}
          </div>
          <div className="flex gap-4 text-xs text-zinc-500">
            <span><span className="text-green-400">■</span> SAFE</span>
            <span><span className="text-yellow-400">■</span> WARNING</span>
            <span><span className="text-red-400">■</span> PROHIBITED</span>
          </div>
        </div>
      </div>
    </>
  );
}
