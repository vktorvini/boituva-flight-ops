import { useEffect, useState } from "react";
import Head from "next/head";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getHistory, HistoryEntry } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

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
    safe:       records.filter((r) => r.status === "SAFE").length,
    warning:    records.filter((r) => r.status === "WARNING").length,
    prohibited: records.filter((r) => r.status === "PROHIBITED").length,
  };
  const total = records.length;

  return (
    <>
      <Head>
        <title>Boituva Flight Ops — Histórico</title>
        <meta name="description" content="Histórico completo de registros de voo em Boituva." />
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-black tracking-tight">Histórico de Registros</h1>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-xl border px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-strong)",
              color: "var(--text-primary)",
            }}
          >
            <option value={24}>Últimas 24</option>
            <option value={48}>Últimas 48</option>
            <option value={96}>Últimas 96</option>
            <option value={200}>Últimas 200</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Seguro", count: stats.safe, color: "text-emerald-500" },
            { label: "Atenção", count: stats.warning, color: "text-amber-500" },
            { label: "Proibido", count: stats.prohibited, color: "text-rose-500" },
          ].map((s) => (
            <div key={s.label} className="card text-center space-y-1">
              <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {s.label}
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {total ? Math.round((s.count / total) * 100) : 0}%
              </p>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="card overflow-x-auto p-0 rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  {["Data/Hora", "Status", "Risco", "Motivos"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b transition-colors hover:bg-black/5 dark:hover:bg-white/3"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                      {format(parseISO(r.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
                          <div
                            className={
                              r.status === "SAFE"
                                ? "bg-emerald-500"
                                : r.status === "WARNING"
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }
                            style={{ width: `${Math.round(r.risk_score)}%`, height: "100%" }}
                          />
                        </div>
                        <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
                          {Math.round(r.risk_score)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {r.reasons?.join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 && (
              <p className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
                Nenhum registro encontrado.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
