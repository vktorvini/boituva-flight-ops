import clsx from "clsx";

type Status = "SAFE" | "WARNING" | "PROHIBITED";

const CONFIG = {
  SAFE: {
    label: "OPERAÇÃO NORMAL",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>,
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-400",
    glow: "shadow-[0_0_40px_rgba(34,197,94,0.3)]",
    dot: "bg-green-400",
  },
  WARNING: {
    label: "ATENÇÃO REQUERIDA",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-yellow-400" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    glow: "shadow-[0_0_40px_rgba(234,179,8,0.3)]",
    dot: "bg-yellow-400",
  },
  PROHIBITED: {
    label: "AFASTAMENTO / PROIBIDO",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    glow: "shadow-[0_0_40px_rgba(239,68,68,0.3)]",
    dot: "bg-red-500",
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
