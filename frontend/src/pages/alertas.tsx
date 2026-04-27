import { useEffect, useState } from "react";
import Head from "next/head";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertHook,
  AlertLog,
  getAlertHooks,
  getAlertLogs,
  createAlertHook,
  deleteAlertHook,
  triggerBotTest,
} from "@/lib/api";

export default function AlertasPage() {
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [hooks, setHooks] = useState<AlertHook[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [testing, setTesting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resLogs, resHooks] = await Promise.all([
        getAlertLogs(),
        getAlertHooks(),
      ]);
      setLogs(resLogs.data);
      setHooks(resHooks.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddHook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl) return;
    try {
      await createAlertHook({ name: newName, url: newUrl });
      setNewName("");
      setNewUrl("");
      fetchData();
    } catch (e) {
      alert("Erro ao adicionar integração.");
    }
  };

  const handleDeleteHook = async (id: number) => {
    if (!confirm("Remover esta integração?")) return;
    try {
      await deleteAlertHook(id);
      fetchData();
    } catch (e) {
      alert("Erro ao remover.");
    }
  };

  const handleTestBot = async () => {
    try {
      setTesting(true);
      await triggerBotTest();
      alert("Teste disparado! As integrações devem apitar agora.");
      // Atualiza os logs para mostrar o disparo recém-criado
      setTimeout(fetchData, 1000);
    } catch (e) {
      alert("Erro ao testar o bot. Verifique se o banco tem histórico.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Boituva Flight Ops – Alertas & Webhooks</title>
      </Head>

      <div className="space-y-10 py-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Agent 7 Actived
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500 tracking-tighter">
            Central do Bot
          </h1>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto">
            Acompanhe o disparo de notificações de mudança de clima e gerencie 
            quais canais e aplicativos (Discord, Zapier, Bots) recebem os avisos.
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleTestBot}
            disabled={testing}
            className="px-6 py-3 bg-white text-black font-black uppercase tracking-wider text-sm rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? "Simulando Rajada..." : "⚡ Disparar Teste Manual"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Feed de Logs */}
          <div className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-zinc-300">
              Linha do Tempo
            </h2>
            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 h-[500px] overflow-y-auto space-y-4">
              {loading && logs.length === 0 ? (
                <p className="text-sm text-zinc-600 text-center py-10">Carregando feed...</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-zinc-600 text-center py-10">
                  Nenhum alerta disparado pelo Bot ainda.
                </p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                        {format(new Date(log.timestamp), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </span>
                      {log.success === 1 ? (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                          ENVIADO
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-bold bg-zinc-800 px-2 py-0.5 rounded">
                          SEM DESTINO
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-zinc-300 bg-black/40 p-3 rounded-lg flex gap-2">
                      <div className="w-1 bg-zinc-800 rounded-full" />
                      <pre className="whitespace-pre-wrap flex-1">{log.message_sent}</pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Gerenciador de Webhooks */}
          <div className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-zinc-300">
              Integrações (Webhooks)
            </h2>
            <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 space-y-6">
              
              <form onSubmit={handleAddHook} className="space-y-3 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
                  + Adicionar Nova Conexão
                </p>
                <input
                  type="text"
                  placeholder="Nome (ex: Discord Pista 1)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  required
                />
                <input
                  type="url"
                  placeholder="https://sua-url-de-alerta.com/hook"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 rounded-lg transition-colors"
                >
                  Salvar Webhook
                </button>
              </form>

              <div className="space-y-3">
                {hooks.map((hook) => (
                  <div key={hook.id} className="flex flex-col gap-2 p-4 bg-zinc-800/20 border border-zinc-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-zinc-200">{hook.name}</span>
                      <button
                        onClick={() => handleDeleteHook(hook.id)}
                        className="text-xs text-red-400 hover:text-red-300 bg-red-400/10 px-2 py-1 rounded"
                      >
                        REMOVER
                      </button>
                    </div>
                    <code className="text-[10px] text-zinc-500 truncate bg-zinc-900 p-2 rounded">
                      {hook.url}
                    </code>
                  </div>
                ))}
                {hooks.length === 0 && (
                  <p className="text-sm text-zinc-600 text-center py-4">
                    Nenhuma integração ativa. Adicione uma acima.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
