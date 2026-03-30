import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { KPIStatus } from "../config/settings";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtNum(v: number) {
  return v.toLocaleString("pt-BR");
}

export function fmtPct(v: number, decimals = 1) {
  return `${v.toFixed(decimals)}%`;
}

export function statusColor(s: KPIStatus): string {
  return { ok: "#27AE60", warning: "#F39C12", critical: "#E74C3C", info: "#2D7DD2" }[s];
}

export function statusClass(s: KPIStatus): string {
  return { ok: "badge-ok", warning: "badge-warning", critical: "badge-critical", info: "text-brand-600 font-semibold" }[s];
}

export function statusBorderClass(s: KPIStatus): string {
  return {
    ok:       "border-t-emerald-500",
    warning:  "border-t-amber-400",
    critical: "border-t-red-500",
    info:     "border-t-brand-600",
  }[s];
}
