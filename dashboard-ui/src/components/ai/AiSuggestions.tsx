import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Pause, Activity, Zap } from "lucide-react";
import type { AiRecommendation, RecommendationPriority, RecommendationAction } from "../../services/aiEngine";
import { cn } from "../../lib/utils";

const PRIORITY_CONFIG: Record<RecommendationPriority, { label: string; dot: string; badge: string; border: string }> = {
  critical: { label: "Crítico",  dot: "bg-red-500",    badge: "bg-red-500/10 text-red-500",    border: "border-red-500/30" },
  high:     { label: "Alto",     dot: "bg-orange-400",  badge: "bg-orange-400/10 text-orange-400", border: "border-orange-400/30" },
  medium:   { label: "Médio",    dot: "bg-amber-400",   badge: "bg-amber-400/10 text-amber-400",  border: "border-amber-400/30" },
  low:      { label: "Baixo",    dot: "bg-emerald-400", badge: "bg-emerald-400/10 text-emerald-500", border: "border-emerald-400/30" },
};

const ACTION_CONFIG: Record<RecommendationAction, { icon: React.ElementType; color: string; bg: string }> = {
  PAUSAR:    { icon: Pause,      color: "text-red-500",    bg: "bg-red-500" },
  ESCALAR:   { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500" },
  AJUSTAR:   { icon: Activity,   color: "text-amber-500",   bg: "bg-amber-500" },
  MONITORAR: { icon: Zap,        color: "text-brand-500",   bg: "bg-brand-500" },
};

interface Props {
  recommendations: AiRecommendation[];
}

export function AiSuggestions({ recommendations }: Props) {
  const [expanded, setExpanded] = useState<string | null>(recommendations[0]?.id ?? null);

  const criticalCount = recommendations.filter(r => r.priority === "critical").length;

  return (
    <section className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="p-2 rounded-lg bg-brand-500/10">
          <Brain size={16} className="text-brand-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              IA — Sugestões de Decisão
            </h3>
            {criticalCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 animate-pulse">
                {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            {recommendations.length} recomendação{recommendations.length !== 1 ? "ões" : ""} geradas automaticamente
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {recommendations.map(rec => {
          const pCfg = PRIORITY_CONFIG[rec.priority];
          const aCfg = ACTION_CONFIG[rec.action];
          const ActionIcon = aCfg.icon;
          const isOpen = expanded === rec.id;

          return (
            <div key={rec.id} className={cn("border-l-2", pCfg.border)}>
              <button
                className="w-full text-left px-5 py-3.5 flex items-start gap-3 hover:opacity-80 transition-opacity"
                onClick={() => setExpanded(isOpen ? null : rec.id)}
              >
                {/* Action badge */}
                <span className={cn("shrink-0 mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded text-white", aCfg.bg)}>
                  {rec.action}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{rec.title}</span>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", pCfg.badge)}>
                      {pCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {rec.metric}: <span className={aCfg.color + " font-semibold"}>{rec.currentValue}</span>
                      {" → "}<span style={{ color: "var(--text-2)" }}>{rec.targetValue}</span>
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Confiança: {rec.confidence}%
                    </span>
                  </div>
                </div>

                <ActionIcon size={14} className={cn("shrink-0 mt-1", aCfg.color)} />
                {isOpen
                  ? <ChevronUp size={13} className="shrink-0 mt-1" style={{ color: "var(--text-muted)" }} />
                  : <ChevronDown size={13} className="shrink-0 mt-1" style={{ color: "var(--text-muted)" }} />
                }
              </button>

              {isOpen && (
                <div className="px-5 pb-4 pt-0 ml-[76px]">
                  <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                    {rec.description}
                  </p>
                  {/* Confidence bar */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Confiança do modelo</span>
                    <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "var(--border)" }}>
                      <div
                        className={cn("h-1 rounded-full transition-all", aCfg.bg)}
                        style={{ width: `${rec.confidence}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: "var(--text-2)" }}>{rec.confidence}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AiSuggestionsCompact({ recommendations }: Props) {
  const criticals = recommendations.filter(r => r.priority === "critical" || r.priority === "high").slice(0, 3);

  if (!criticals.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {criticals.map(rec => {
        const pCfg = PRIORITY_CONFIG[rec.priority];
        const aCfg = ACTION_CONFIG[rec.action];
        return (
          <div key={rec.id} className={cn("flex items-start gap-2 px-3 py-2.5 rounded-lg border", pCfg.border)}
               style={{ backgroundColor: "var(--bg-card)" }}>
            <span className={cn("shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full", pCfg.dot)} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate" style={{ color: "var(--text)" }}>{rec.title}</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                {rec.metric}: {rec.currentValue}
              </p>
            </div>
            <span className={cn("text-[10px] font-bold shrink-0", aCfg.color)}>{rec.action}</span>
          </div>
        );
      })}
    </div>
  );
}

// Confidence bar visual helper (standalone)
export function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: "var(--border)" }}>
        <div className={cn("h-1.5 rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{value}%</span>
    </div>
  );
}
