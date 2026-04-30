import clsx from "clsx";

type Status = "SAFE" | "WARNING" | "PROHIBITED";

const CONFIG = {
  SAFE: {
    label: "BANDEIRA VERDE | VOOS LIBERADOS",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    glow: "glow-safe",
    dot: "bg-emerald-500",
  },
  WARNING: {
    label: "BANDEIRA AMARELA | OBSERVAÇÃO (30 MIN)",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-600 dark:text-amber-500",
    glow: "glow-warning",
    dot: "bg-amber-500",
  },
  PROHIBITED: {
    label: "BANDEIRA VERMELHA | VOOS CANCELADOS",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-rose-500" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>,
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    glow: "glow-prohibited",
    dot: "bg-rose-500",
  },
};

interface Props {
  status: Status;
  size?: "sm" | "lg";
}

export default function StatusBadge({ status, size = "lg" }: Props) {
  const c = CONFIG[status];
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-3 rounded-full border font-bold tracking-widest uppercase transition-all",
        c.bg,
        c.border,
        c.text,
        c.glow,
        size === "lg" ? "px-8 py-4 text-lg md:text-xl" : "px-3 py-1.5 text-xs"
      )}
    >
      <span className={clsx("rounded-full animate-pulse shadow-lg", c.dot, size === "lg" ? "w-3 h-3" : "w-2 h-2")} />
      <span className="flex items-center gap-2">{c.icon} {c.label}</span>
    </div>
  );
}
