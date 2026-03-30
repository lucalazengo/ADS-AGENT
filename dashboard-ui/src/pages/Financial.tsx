import type { CampaignRecord } from "../data/types";
import { aggregate } from "../lib/kpiEngine";
import { fmtBRL } from "../lib/utils";
import { KpiCard } from "../components/cards/KpiCard";
import { MonthlyTable } from "../components/tables/MonthlyTable";

interface Props { records: CampaignRecord[]; }

export function Financial({ records }: Props) {
  const m = aggregate(records);
  const profit = m.conversion_value - m.ad_spend;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>Financeiro</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>Gasto mensal, conversão e ROAS histórico</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Gasto Total"    value={fmtBRL(m.ad_spend)}          prefix="R$" status="info" />
        <KpiCard label="Receita Gerada" value={fmtBRL(m.conversion_value)}  prefix="R$" status="ok" />
        <KpiCard label="Resultado"      value={fmtBRL(profit)}              prefix="R$"
          status={profit >= 0 ? "ok" : "critical"} help="Receita − Gasto Ads" />
      </div>
      <MonthlyTable records={records} />
    </div>
  );
}
