import { useState, useMemo, useEffect } from "react";
import { Moon, Sun, Menu, X, Bell, RefreshCw } from "lucide-react";
import type { Page } from "./components/layout/Sidebar";
import { Sidebar } from "./components/layout/Sidebar";
import { FilterBar } from "./components/layout/FilterBar";
import { AdsPerformance } from "./pages/AdsPerformance";
import { AiFunnel } from "./pages/AiFunnel";
import { Attribution } from "./pages/Attribution";
import { Financial } from "./pages/Financial";
import { InsightsAI } from "./pages/InsightsAI";
import { ChannelAnalysis } from "./pages/ChannelAnalysis";
import { useMetaData } from "./hooks/useMetaData";
import { filterRecords, aggregate } from "./lib/kpiEngine";
import type { Filters } from "./data/types";
import { getStoredTheme, applyTheme } from "./lib/theme";
import type { Theme } from "./lib/theme";
import { AiSuggestionsCompact } from "./components/ai/AiSuggestions";
import { generateRecommendations } from "./services/aiEngine";

function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return d.toISOString().split("T")[0];
}
const today = new Date().toISOString().split("T")[0];

const USER = { name: "Sir.Lucala", initials: "SL", role: "ConnectAI" };

export default function App() {
  const [page,        setPage]        = useState<Page>("ads");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme,       setTheme]       = useState<Theme>(getStoredTheme);
  const [filters,     setFilters]     = useState<Filters>({
    dateStart: daysAgoStr(7), dateEnd: today,
    products: [], campaigns: [], sources: [],
  });

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { setSidebarOpen(false); }, [page]);

  // ── Dados Meta Ads (real ou mock) ─────────────────────────────────────────
  const { records: allRecords, source, connection, refresh } = useMetaData(
    filters.dateStart, filters.dateEnd
  );

  const records = useMemo(
    () => filterRecords(allRecords, filters),
    [allRecords, filters]
  );

  function toggleTheme() { setTheme(t => t === "light" ? "dark" : "light"); }

  const aiRecs = useMemo(() => {
    if (!records.length) return [];
    const m   = aggregate(records);
    const pid = [...new Set(records.map(r => r.product_id))];
    return generateRecommendations(m, pid.length === 1 ? pid[0] : "default");
  }, [records]);

  const pageContent: Record<string, React.ReactNode> = {
    ads:         <AdsPerformance records={records} />,
    ai_funnel:   <AiFunnel records={records} />,
    attribution: <Attribution records={records} />,
    financial:   <Financial records={records} />,
    insights_ai: <InsightsAI records={records} />,
    channels:    <ChannelAnalysis records={records} />,
  };

  // Badge da fonte de dados
  const sourceBadge = source === "loading"
    ? { label: "Carregando...", dot: "bg-amber-400",   text: "text-amber-500"  }
    : source === "real"
    ? { label: `Meta: ${connection.account?.name ?? ""}`, dot: "bg-emerald-400", text: "text-emerald-500" }
    : { label: "Dados Mock (sem campanhas ativas)", dot: "bg-slate-400", text: "text-slate-400" };

  return (
    <div className="flex min-h-screen w-full" style={{ backgroundColor: "var(--bg)" }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-56 transform transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar page={page} onPage={p => { setPage(p); setSidebarOpen(false); }} theme={theme} connection={connection} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 w-full">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b flex items-center gap-3 px-4 py-2.5"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>

          {/* Hamburger mobile */}
          <button className="lg:hidden p-1.5 rounded-lg transition-colors hover:opacity-70"
                  onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? <X size={18} style={{ color: "var(--text-2)" }} /> : <Menu size={18} style={{ color: "var(--text-2)" }} />}
          </button>

          {/* Filtros */}
          <div className="flex-1 min-w-0">
            <FilterBar data={allRecords} filters={filters} onChange={p => setFilters(prev => ({ ...prev, ...p }))} />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Status da conexão */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs px-2 mr-1">
              <span className={`w-1.5 h-1.5 rounded-full ${sourceBadge.dot} inline-block ${source === "loading" ? "animate-pulse" : ""}`} />
              <span className={`hidden md:inline text-[11px] font-medium ${sourceBadge.text}`}>{sourceBadge.label}</span>
            </div>

            {/* Refresh */}
            <button onClick={refresh}
              className="p-2 rounded-lg hover:opacity-70 transition-all"
              title="Atualizar dados"
              style={{ color: "var(--text-2)" }}>
              <RefreshCw size={15} className={source === "loading" ? "animate-spin" : ""} />
            </button>

            {/* Notificação */}
            <button className="relative p-2 rounded-lg hover:opacity-70 transition-colors" title="Notificações">
              <Bell size={16} style={{ color: "var(--text-2)" }} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>

            {/* Tema */}
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:opacity-70 transition-colors"
                    title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}>
              {theme === "dark"
                ? <Sun  size={16} className="text-amber-400" />
                : <Moon size={16} style={{ color: "var(--text-2)" }} />
              }
            </button>

            {/* Avatar */}
            <div className="relative group">
              <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:opacity-80 transition-all">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                  {USER.initials}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-xs font-semibold leading-none" style={{ color: "var(--text)" }}>{USER.name}</span>
                  <span className="text-[10px] leading-none mt-0.5" style={{ color: "var(--text-muted)" }}>{USER.role}</span>
                </div>
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 overflow-hidden"
                   style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{USER.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{USER.role}</p>
                  {connection.account && (
                    <p className="text-[10px] mt-1 font-medium text-brand-500">{connection.account.name}</p>
                  )}
                </div>
                {[
                  { label: "Meu Perfil" },
                  { label: "Configurações" },
                  { label: "Sair", danger: true },
                ].map(item => (
                  <button key={item.label}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: item.danger ? "#E74C3C" : "var(--text-2)" }}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* AI compact banner — critical/high only */}
        {records.length > 0 && aiRecs.some(r => r.priority === "critical") && (
          <div className="px-4 pt-3">
            <AiSuggestionsCompact recommendations={aiRecs} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 w-full">
          {source === "loading" ? (
            <LoadingScreen />
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
              <p className="text-lg font-semibold">Nenhum dado para o filtro selecionado.</p>
              <p className="text-sm mt-1">Tente ampliar o período ou remover filtros.</p>
            </div>
          ) : pageContent[page]}
        </div>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Conectando à Meta Ads API...</p>
    </div>
  );
}
