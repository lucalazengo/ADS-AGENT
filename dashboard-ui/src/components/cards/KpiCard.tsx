import type { KPIStatus } from "../../config/settings";
import { cn, statusBorderClass } from "../../lib/utils";

interface Props {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  status?: KPIStatus;
  help?: string;
  delta?: string;
  deltaPositive?: boolean;
}

export function KpiCard({ label, value, prefix = "", suffix = "", status = "info", help, delta, deltaPositive }: Props) {
  const statusIcon = { ok: "▲", warning: "◆", critical: "▼", info: "●" }[status];

  return (
    <div className={cn("card border-t-[3px] p-4 flex flex-col gap-1 min-h-[100px]", statusBorderClass(status))}>
      <span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--text-muted)" }}>
        {statusIcon} {label}
      </span>
      <span className="text-2xl font-bold leading-tight" style={{ color: "var(--text)" }}>
        {prefix && <span className="text-lg font-semibold mr-0.5" style={{ color: "var(--text-2)" }}>{prefix}</span>}
        {value}
        {suffix && <span className="text-base font-semibold ml-0.5" style={{ color: "var(--text-muted)" }}>{suffix}</span>}
      </span>
      {delta && (
        <span className={cn("text-xs font-semibold", deltaPositive ? "text-emerald-500" : "text-red-400")}>
          {delta}
        </span>
      )}
      {help && <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{help}</span>}
    </div>
  );
}

export function AlertBanner({ message, level }: { message: string; level: "ok" | "warning" | "critical" }) {
  const cfg = {
    ok:       { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-400", icon: "🟢", text: "text-emerald-800 dark:text-emerald-300" },
    warning:  { bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-400",   icon: "🟡", text: "text-amber-800 dark:text-amber-300" },
    critical: { bg: "bg-red-50 dark:bg-red-950/30",         border: "border-red-400",     icon: "🔴", text: "text-red-800 dark:text-red-300" },
  }[level];
  return (
    <div className={cn("flex items-start gap-2 border-l-4 rounded-lg px-4 py-3 text-sm", cfg.bg, cfg.border, cfg.text)}>
      <span>{cfg.icon}</span>
      <span><strong>Alerta de Performance:</strong> {message}</span>
    </div>
  );
}
