import type { CampaignRecord } from "../data/types";
import { aggregate } from "../lib/kpiEngine";
import { fmtBRL } from "../lib/utils";
import { KpiCard } from "../components/cards/KpiCard";
import { RoasBarChart, CplTrendChart } from "../components/charts/RoasBarChart";
import { getBenchmark, getStatus } from "../config/settings";

interface Props { records: CampaignRecord[]; }

export function Attribution({ records }: Props) {
  const m = aggregate(records);
  const pids = [...new Set(records.map(r => r.product_id))];
  const pid = pids.length === 1 ? pids[0] : "default";
  const cplQual = m.leads_qualified_by_ai > 0 ? m.ad_spend / m.leads_qualified_by_ai : 0;
  const profit  = m.conversion_value - m.ad_spend;
  const warranty   = records.length ? records.reduce((s, r) => s + r.interest_extended_warranty, 0) / records.length : 0;
  const recurrence = records.length ? records.reduce((s, r) => s + r.interest_ink_recurrence,     0) / records.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>Atribuição & ROAS Real</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>Cruzamento de gasto em Ads com valor gerado no CRM via IA</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Gasto Total"      value={fmtBRL(m.ad_spend)}         prefix="R$" status="info" />
        <KpiCard label="Valor Convertido" value={fmtBRL(m.conversion_value)} prefix="R$" status="ok" />
        <KpiCard label="ROAS Real"        value={m.roas.toFixed(1)} suffix="x"
          status={getStatus(m.roas, getBenchmark(pid, "roas"))} help="Valor CRM ÷ Gasto Ads" />
        <KpiCard label="CPL Qualificado"  value={fmtBRL(cplQual)} prefix="R$"
          status="info" help="Custo por lead qualificado" />
      </div>

      {/* Lucro estimado */}
      <div className={`card border-t-[3px] ${profit >= 0 ? "border-t-emerald-500" : "border-t-red-500"} p-5 flex flex-wrap items-center gap-4`}>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Lucro Estimado (Receita − Gasto Ads)
          </div>
          <div className={`text-3xl font-extrabold mt-1 ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            R$ {fmtBRL(profit)}
          </div>
        </div>
        <p className="ml-auto text-xs max-w-xs text-right" style={{ color: "var(--text-muted)" }}>
          * Valor estimado — receita real depende das margens registradas no Salesforce.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <p className="section-label">ROAS por Produto</p>
          <RoasBarChart records={records} />
        </div>
        <div className="card p-5">
          <p className="section-label">Evolução do CPL</p>
          <CplTrendChart records={records} />
        </div>
      </div>

      <div>
        <p className="section-label">Programas de Benefícios — Interesse dos Leads</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BenefitCard label="Garantia Estendida"    value={warranty}   description="dos leads demonstraram interesse" primary />
          <BenefitCard label="Recorrência de Tintas" value={recurrence} description="dos leads interessados em plano de tintas" />
        </div>
      </div>
    </div>
  );
}

function BenefitCard({ label, value, description, primary }: {
  label: string; value: number; description: string; primary?: boolean;
}) {
  return (
    <div className={`card border-t-[3px] ${primary ? "border-t-brand-600" : "border-t-brand-400"} p-5`}>
      <div className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className={`text-3xl font-extrabold leading-tight ${primary ? "text-brand-600" : "text-brand-500"}`}>{value.toFixed(1)}%</div>
      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{description}</div>
      <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
        <div className={`h-full rounded-full ${primary ? "bg-brand-600" : "bg-brand-400"}`}
             style={{ width: `${Math.min(value, 100)}%`, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
}
