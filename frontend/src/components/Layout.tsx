import Link from "next/link";
import { useRouter } from "next/router";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Status" },
  { href: "/janela", label: "Janela de Voo" },
  { href: "/grafico", label: "Gráfico" },
  { href: "/historico", label: "Histórico" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useRouter();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#0a0a0a] to-black text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6L3 8l5.5 5.5-2.8 2.8-3.2-.8L1 17l4.5 1.5L7 23l1.5-1.5-.8-3.2 2.8-2.8L16 21l1.2-.7c.4-.2.7-.6.6-1.1Z"/></svg>
            </div>
            <div>
              <p className="font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 text-xl leading-tight">
                BOITUVA
              </p>
              <p className="text-blue-400/90 font-bold text-[10px] uppercase tracking-widest mt-0.5">Capital do Paraquedismo e Balonismo</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 hide-scrollbar scroll-smooth">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 whitespace-nowrap",
                  pathname === n.href
                    ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-12 min-h-[80vh]">{children}</main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-zinc-600 text-xs font-medium">
          Boituva Controle Operacional Meteorológico · Atualização live a cada 60s
        </div>
      </footer>
    </div>
  );
}
