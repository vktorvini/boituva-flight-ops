import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Status" },
  { href: "/janela", label: "Janela de Voo" },
  { href: "/consensus", label: "Consenso" },
  { href: "/analytics", label: "Analytics" },
  { href: "/historico", label: "Histórico" },
  { href: "/grafico", label: "Gráfico" },
  { href: "/alertas", label: "Alertas" },
  { href: "/mapa", label: "Mapa" },
];

// ── Theme helpers (shared across all pages via Layout) ────────────────────────
function applyTheme(theme: "dark" | "light") {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}
function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return (localStorage.getItem("theme") as "dark" | "light") || "dark";
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  return (
    <div
      className="min-h-screen font-sans transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "color-mix(in srgb, var(--bg-page) 85%, transparent)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6L3 8l5.5 5.5-2.8 2.8-3.2-.8L1 17l4.5 1.5L7 23l1.5-1.5-.8-3.2 2.8-2.8L16 21l1.2-.7c.4-.2.7-.6.6-1.1Z"/>
              </svg>
            </div>
            <div>
              <p className="font-black tracking-tight text-base leading-tight">Boituva Flight Ops</p>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Controle Meteorológico
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1 overflow-x-auto flex-1 md:justify-center pb-1 md:pb-0">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all whitespace-nowrap",
                  pathname === n.href
                    ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                )}
                style={pathname !== n.href ? { color: "var(--text-secondary)" } : {}}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all hover:scale-105 active:scale-95 shrink-0"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border-strong)",
              color: "var(--text-secondary)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {theme === "dark" ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M22 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
                Claro
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
                Escuro
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-8 min-h-[80vh]">
        {children}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t mt-12 py-6 text-center text-xs font-medium" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
        Boituva Flight Ops · Atualização automática a cada 60s · Lógica Worst-Case para segurança máxima
      </footer>
    </div>
  );
}
