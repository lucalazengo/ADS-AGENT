import type { AggregatedMetrics } from "../../data/types";
import { fmtNum } from "../../lib/utils";
import { CHART_COLORS } from "../../config/settings";

interface Props { metrics: AggregatedMetrics; }

export function FunnelChart({ metrics }: Props) {
  const stages = [
    { label: "Impressões",        value: metrics.impressions,           color: CHART_COLORS[3] },
    { label: "Cliques",           value: metrics.clicks,                color: CHART_COLORS[4] },
    { label: "Leads Brutos",      value: metrics.leads_raw,             color: CHART_COLORS[1] },
    { label: "Qualificados IA",   value: metrics.leads_qualified_by_ai, color: CHART_COLORS[0] },
    { label: "Oportunidades CRM", value: Math.round(metrics.leads_qualified_by_ai * 0.15), color: "#27AE60" },
  ];

  const max = stages[0].value || 1;

  return (
    <div className="flex flex-col gap-2 py-2">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const pctFromPrev = i === 0 ? 100 : stages[i - 1].value > 0 ? (s.value / stages[i - 1].value * 100) : 0;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-32 text-right text-xs text-slate-500 font-medium shrink-0">{s.label}</div>
            <div className="flex-1 bg-slate-100 rounded-full h-7 relative overflow-hidden">
              <div
                className="h-full rounded-full flex items-center pl-3 transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: s.color }}
              >
                <span className="text-white text-xs font-bold whitespace-nowrap">
                  {fmtNum(s.value)}
                </span>
              </div>
            </div>
            {i > 0 && (
              <div className="w-14 text-xs font-semibold text-slate-400 shrink-0">
                {pctFromPrev.toFixed(0)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
