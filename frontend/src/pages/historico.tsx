import { useEffect, useState } from "react";
import Head from "next/head";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getHistory, HistoryEntry } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import clsx from "clsx";

export default function HistoricoPage() {
  const [records, setRecords] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(48);

  useEffect(() => {
    setLoading(true);
    getHistory(limit)
      .then((r) => setRecords(r.data))
      .finally(() => setLoading(false));
  }, [limit]);

  const stats = {
    safe: records.filter((r) => r.status === "SAFE").length,
    warning: records.filter((r) => r.status === "WARNING").length,
    prohibited: records.filter((r) => r.status === "PROHIBITED").length,
  };

  return (
    <>
      <Head>
        <title>Boituva Flight Ops – Histórico</title>
      </Head>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Histórico de Registros</h1>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-600"
          >
            <option value={24}>Últimas 24</option>
            <option value={48}>Últimas 48</option>
            <option value={96}>Últimas 96</option>
            <option value={200}>Últimas 200</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center border-green-500/20">
            <p className="text-2xl font-bold text-green-400">{stats.safe}</p>
            <p className="text-zinc-500 text-xs mt-1">SEGURO</p>
            <p className="text-zinc-600 text-xs">
              {records.length ? Math.round((stats.safe / records.length) * 100) : 0}%
            </p>
          </div>
          <div className="card text-center border-yellow-500/20">
            <p className="text-2xl font-bold text-yellow-400">{stats.warning}</p>
            <p className="text-zinc-500 text-xs mt-1">ATENÇÃO</p>
            <p className="text-zinc-600 text-xs">
              {records.length ? Math.round((stats.warning / records.length) * 100) : 0}%
            </p>
          </div>
          <div className="card text-center border-red-500/20">
            <p className="text-2xl font-bold text-red-400">{stats.prohibited}</p>
            <p className="text-zinc-500 text-xs mt-1">PROIBIDO</p>
            <p className="text-zinc-600 text-xs">
              {records.length ? Math.round((stats.prohibited / records.length) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Data/Hora</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-zinc-500 font-medium">Risco</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Motivos</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr
                    key={i}
                    className={clsx(
                      "border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors",
                      i % 2 === 0 ? "" : "bg-zinc-900/30"
                    )}
                  >
                    <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">
                      {format(parseISO(r.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              "h-full rounded-full",
                              r.status === "SAFE"
                                ? "bg-green-500"
                                : r.status === "WARNING"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${Math.round(r.risk_score * 100)}%` }}
                          />
                        </div>
                        <span className="text-zinc-400 text-xs w-8 text-right">
                          {Math.round(r.risk_score * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {r.reasons?.join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 && (
              <p className="text-center text-zinc-600 py-12">
                Nenhum registro encontrado.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
