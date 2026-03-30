import { BarChart2, Brain, TrendingUp, DollarSign, Wifi, WifiOff, Loader2, Lightbulb, BarChart } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Theme } from "../../lib/theme";
import type { MetaConnectionStatus } from "../../services/metaApi";

export type Page = "ads" | "ai_funnel" | "attribution" | "financial" | "insights_ai" | "channels";

const NAV: Array<{ id: Page; label: string; icon: React.ElementType; group?: string }> = [
  { id: "ads",         label: "Ads Performance",   icon: BarChart2,  group: "Relatórios" },
  { id: "ai_funnel",   label: "Funil da IA",       icon: Brain,      group: "Relatórios" },
  { id: "attribution", label: "Atribuição / ROAS", icon: TrendingUp, group: "Relatórios" },
  { id: "financial",   label: "Financeiro",        icon: DollarSign, group: "Relatórios" },
  { id: "insights_ai", label: "IA & Insights",     icon: Lightbulb,  group: "Inteligência" },
  { id: "channels",    label: "Canais",             icon: BarChart,   group: "Inteligência" },
];

interface Props {
  page:       Page;
  onPage:     (p: Page) => void;
  theme:      Theme;
  connection: MetaConnectionStatus;
}

export function Sidebar({ page, onPage, connection }: Props) {
  return (
    <aside className="w-56 min-h-screen flex flex-col shrink-0 border-r"
           style={{ backgroundColor: "var(--bg-sidebar)", borderColor: "var(--border)" }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="text-lg font-extrabold tracking-tight" style={{ color: "var(--text)" }}>
          ADS<span className="text-brand-600">AGENT</span>
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Dashboard Universal</div>
        {connection.account && (
          <div className="mt-2 px-2 py-1 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-500 truncate">
            ● {connection.account.name}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {["Relatórios", "Inteligência"].map(group => (
          <div key={group} className="mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1.5" style={{ color: "var(--text-muted)" }}>
              {group}
            </p>
            {NAV.filter(n => n.group === group).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => onPage(id)}
                className={cn("nav-item w-full text-left", page === id && "active")}>
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Connections */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "var(--border)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          Conexões
        </p>
        <div className="flex flex-col gap-1.5">
          <StatusRow label="Meta Ads"   active={connection.connected} loading={false}
                     sub={connection.connected ? connection.account?.name : connection.error ?? undefined} />
          <StatusRow label="n8n"        active />
          <StatusRow label="Agente IA"  active />
          <StatusRow label="Salesforce" active={false} />
        </div>
      </div>
    </aside>
  );
}

function StatusRow({ label, active, loading, sub }: {
  label: string; active?: boolean; loading?: boolean; sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2 text-[11px]">
        {loading
          ? <Loader2 size={11} className="animate-spin text-amber-400 shrink-0" />
          : active
          ? <Wifi    size={11} className="text-emerald-500 shrink-0" />
          : <WifiOff size={11} className="shrink-0" style={{ color: "var(--text-muted)" }} />
        }
        <span style={{ color: active ? "var(--text-2)" : "var(--text-muted)" }}>{label}</span>
        <span className={cn("ml-auto text-[10px] font-medium shrink-0")}
              style={{ color: loading ? "#F59E0B" : active ? "#10B981" : "var(--text-muted)" }}>
          {loading ? "sync" : active ? "ativo" : "config"}
        </span>
      </div>
      {sub && (
        <p className="text-[10px] pl-5 truncate" style={{ color: "var(--text-muted)" }} title={sub}>{sub}</p>
      )}
    </div>
  );
}
