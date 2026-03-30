import { useMemo } from "react";
import type { CampaignRecord } from "../data/types";
import { aggregate, getByProduct } from "../lib/kpiEngine";
import { fmtBRL, fmtNum } from "../lib/utils";
import { KpiCard } from "../components/cards/KpiCard";
import { AiSuggestions } from "../components/ai/AiSuggestions";
import { generateRecommendations } from "../services/aiEngine";
import { calcLTV, calcCAC, getEconomics } from "../config/settings";

interface Props { records: CampaignRecord[] }

export function InsightsAI({ records }: Props) {
  const m    = useMemo(() => aggregate(records), [records]);
  const pids = useMemo(() => [...new Set(records.map(r => r.product_id))], [records]);
  const pid  = pids.length === 1 ? pids[0] : "default";

  const eco  = getEconomics(pid);
  const ltv  = calcLTV(pid);
  const cac  = calcCAC(m.ad_spend, m.leads_qualified_by_ai, eco.overhead_monthly);
  const cacSimple = m.leads_raw > 0 ? (m.ad_spend + eco.overhead_monthly) / m.leads_raw : 0;
  const ltvCac = cac > 0 ? ltv / cac : 0;

  const recs = useMemo(() => generateRecommendations(m, pid), [m, pid]);

  const byProduct = useMemo(() => getByProduct(records), [records]);

  const ltvCacColor = ltvCac >= 3 ? "ok" : ltvCac >= 1.5 ? "warning" : "critical";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>IA & Insights</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Recomendações automáticas, CAC real e análise de LTV
        </p>
      </div>

      {/* CAC & LTV metrics */}
      <section>
        <p className="section-label">Unit Economics</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="CAC Real"
            value={fmtBRL(cac)}
            prefix="R$"
            status={cac < ltv / 3 ? "ok" : cac < ltv / 1.5 ? "warning" : "critical"}
            help="(Gasto + Overhead) ÷ Leads qualificados"
          />
          <KpiCard
            label="CAC Simples"
            value={fmtBRL(cacSimple)}
            prefix="R$"
            status="info"
            help="(Gasto + Overhead) ÷ Total de leads"
          />
          <KpiCard
            label="LTV Estimado"
            value={fmtBRL(ltv)}
            prefix="R$"
            status="info"
            help="Ticket × Freq. compra × Anos retenção"
          />
          <KpiCard
            label="LTV/CAC"
            value={cac > 0 ? ltvCac.toFixed(1) : "—"}
            suffix="x"
            status={ltvCacColor}
            help="≥ 3x = saudável · < 1.5x = inviável"
          />
          <KpiCard
            label="Overhead Mensal"
            value={fmtBRL(eco.overhead_monthly)}
            prefix="R$"
            status="info"
            help="Custos indiretos configurados"
          />
        </div>
      </section>

      {/* LTV/CAC por produto */}
      {byProduct.length > 1 && (
        <section>
          <p className="section-label">LTV/CAC por Produto</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {byProduct.map(p => {
              const pEco   = getEconomics(p.product_id);
              const pLTV   = calcLTV(p.product_id);
              const pCAC   = calcCAC(p.ad_spend, p.leads_qualified_by_ai, pEco.overhead_monthly);
              const pRatio = pCAC > 0 ? pLTV / pCAC : 0;
              const color  = pRatio >= 3 ? "text-emerald-500" : pRatio >= 1.5 ? "text-amber-500" : "text-red-500";
              return (
                <div key={p.product_id} className="card p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{p.label}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Gasto {fmtBRL(p.ad_spend)} · {fmtNum(p.leads_raw)} leads · ROAS {p.roas.toFixed(1)}x
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-extrabold ${color}`}>
                      {pCAC > 0 ? `${pRatio.toFixed(1)}x` : "—"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>LTV/CAC</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      LTV {fmtBRL(pLTV)} / CAC {fmtBRL(pCAC)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* AI Suggestions */}
      <section>
        <p className="section-label">Recomendações da IA</p>
        <AiSuggestions recommendations={recs} />
      </section>

      {/* Economics explainer */}
      <section className="card p-5 border-l-4 border-brand-500">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Como os valores são calculados</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: "CAC Real",
              formula: "(Gasto Ads + Overhead) ÷ Leads Qualificados",
              note: "Inclui custos indiretos configurados por produto em settings.ts",
            },
            {
              title: "LTV Estimado",
              formula: "Ticket Médio × Freq. Anual × Anos de Retenção",
              note: "Configurável por produto. Representa receita total esperada por cliente.",
            },
            {
              title: "Score de Eficiência",
              formula: "40% ROAS + 30% CTR + 30% CPL (normalizado)",
              note: "Score 0–100 comparando canais entre si. Usado em Análise por Canal.",
            },
          ].map(item => (
            <div key={item.title}>
              <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>{item.title}</p>
              <p className="text-[11px] mt-1 font-mono" style={{ color: "var(--text-2)" }}>{item.formula}</p>
              <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{item.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
