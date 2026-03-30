import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import type { CampaignRecord } from "../data/types";
import { aggregate } from "../lib/kpiEngine";
import { fmtBRL, fmtNum, fmtPct } from "../lib/utils";
import { CHART_COLORS } from "../config/settings";

interface Props { records: CampaignRecord[] }

const SOURCE_LABELS: Record<string, string> = {
  meta_ads:   "Meta Ads",
  google_ads: "Google Ads",
  organic:    "Orgânico",
  email:      "E-mail",
};

function getSourceLabel(s: string) { return SOURCE_LABELS[s] ?? s; }

const EFFICIENCY_SCORE = (m: ReturnType<typeof aggregate>) => {
  // Composite score 0–100 weighting ROAS, CTR, and CPL efficiency
  const roasScore    = Math.min(m.roas   / 6,   1) * 40;
  const ctrScore     = Math.min(m.ctr    / 4,   1) * 30;
  const cplScore     = Math.max(1 - m.cpl / 80, 0) * 30;
  return Math.round(roasScore + ctrScore + cplScore);
};

export function ChannelAnalysis({ records }: Props) {
  // Group by source
  const channels = useMemo(() => {
    const map: Record<string, CampaignRecord[]> = {};
    for (const r of records) {
      if (!map[r.source]) map[r.source] = [];
      map[r.source].push(r);
    }
    return Object.entries(map).map(([source, recs]) => ({
      source,
      label: getSourceLabel(source),
      metrics: aggregate(recs),
      spend: recs.reduce((a, r) => a + r.ad_spend, 0),
      leads: recs.reduce((a, r) => a + r.leads_raw, 0),
    })).sort((a, b) => b.spend - a.spend);
  }, [records]);

  const totalSpend = channels.reduce((a, c) => a + c.spend, 0);

  // Data for grouped bar
  const barData = channels.map(c => ({
    name:    c.label,
    "Gasto": +c.spend.toFixed(2),
    "Leads": c.leads,
    "ROAS":  +c.metrics.roas.toFixed(2),
  }));

  // Data for radar (normalize 0–100)
  const maxRoas = Math.max(...channels.map(c => c.metrics.roas), 1);
  const maxCtr  = Math.max(...channels.map(c => c.metrics.ctr),  1);
  const minCpl  = Math.min(...channels.map(c => c.metrics.cpl > 0 ? c.metrics.cpl : 999), 999);
  const maxLeads = Math.max(...channels.map(c => c.leads), 1);

  const radarData = [
    { metric: "ROAS",   ...Object.fromEntries(channels.map(c => [c.label, +(c.metrics.roas / maxRoas * 100).toFixed(0)])) },
    { metric: "CTR",    ...Object.fromEntries(channels.map(c => [c.label, +(c.metrics.ctr  / maxCtr  * 100).toFixed(0)])) },
    { metric: "CPL↓",   ...Object.fromEntries(channels.map(c => [c.label, c.metrics.cpl > 0 ? +(minCpl / c.metrics.cpl * 100).toFixed(0) : 0])) },
    { metric: "Leads",  ...Object.fromEntries(channels.map(c => [c.label, +(c.leads / maxLeads * 100).toFixed(0)])) },
    { metric: "Efic.",  ...Object.fromEntries(channels.map(c => [c.label, EFFICIENCY_SCORE(c.metrics)])) },
  ];

  // Budget recommendation
  const getBudgetRec = (source: string, metrics: ReturnType<typeof aggregate>, share: number) => {
    const score = EFFICIENCY_SCORE(metrics);
    if (score >= 70 && share < 50) return { label: "Aumentar budget ↑", color: "text-emerald-500" };
    if (score <= 30 && share > 15)  return { label: "Reduzir budget ↓",  color: "text-red-500" };
    if (score >= 50)                return { label: "Manter",             color: "text-brand-500" };
    return { label: "Monitorar",    color: "text-amber-500" };
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Análise por Canal</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Comparativo de performance entre canais de mídia
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {channels.map((c, i) => {
          const share = totalSpend > 0 ? c.spend / totalSpend * 100 : 0;
          const score = EFFICIENCY_SCORE(c.metrics);
          return (
            <div key={c.source} className="card p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>{c.label}</span>
              </div>
              <div>
                <p className="text-lg font-extrabold leading-none" style={{ color: "var(--text)" }}>{fmtBRL(c.spend)}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{share.toFixed(0)}% do total</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: "var(--text-2)" }}>{c.leads} leads</span>
                <span className={`text-[11px] font-bold ${score >= 60 ? "text-emerald-500" : score >= 35 ? "text-amber-500" : "text-red-500"}`}>
                  Efic. {score}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Grouped bar: Gasto vs Leads */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Gasto vs Leads por Canal</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--text)" }}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left"  dataKey="Gasto" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="Leads" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar: multi-metric comparison */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Score Multi-Métrica (normalizado)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--text-muted)" }} />
              {channels.map((c, i) => (
                <Radar
                  key={c.source}
                  name={c.label}
                  dataKey={c.label}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.15}
                />
              ))}
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Efficiency table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Métricas Detalhadas por Canal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Canal", "Gasto", "Share", "Leads", "CPL", "CPC", "CTR", "ROAS", "Score Efic.", "Recomendação"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((c, i) => {
                const share = totalSpend > 0 ? c.spend / totalSpend * 100 : 0;
                const score = EFFICIENCY_SCORE(c.metrics);
                const rec   = getBudgetRec(c.source, c.metrics, share);
                return (
                  <tr key={c.source} className="tr-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="font-semibold" style={{ color: "var(--text)" }}>{c.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{fmtBRL(c.spend)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: "var(--border)" }}>
                          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${share}%` }} />
                        </div>
                        <span style={{ color: "var(--text-2)" }}>{share.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-2)" }}>{fmtNum(c.leads)}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-2)" }}>{fmtBRL(c.metrics.cpl)}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-2)" }}>{fmtBRL(c.metrics.cpc)}</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-2)" }}>{fmtPct(c.metrics.ctr)}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: c.metrics.roas >= 3 ? "var(--text)" : "var(--text-2)" }}>
                      {c.metrics.roas.toFixed(2)}x
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full" style={{ backgroundColor: "var(--border)" }}>
                          <div
                            className={`h-1.5 rounded-full ${score >= 60 ? "bg-emerald-500" : score >= 35 ? "bg-amber-400" : "bg-red-500"}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className="font-semibold" style={{ color: "var(--text-2)" }}>{score}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${rec.color}`}>{rec.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget reallocation insight */}
      <div className="card p-5 border-l-4 border-brand-500">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>
          Recomendação de Alocação de Budget
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {channels.map((c, i) => {
            const share = totalSpend > 0 ? c.spend / totalSpend * 100 : 0;
            const score = EFFICIENCY_SCORE(c.metrics);
            const rec   = getBudgetRec(c.source, c.metrics, share);
            return (
              <div key={c.source} className="flex items-center gap-3 p-3 rounded-lg"
                   style={{ backgroundColor: "var(--bg)" }}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{c.label}</p>
                  <p className={`text-[11px] font-medium mt-0.5 ${rec.color}`}>{rec.label}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Score {score}/100 · {share.toFixed(0)}% do budget
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
