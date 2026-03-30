import type { CampaignRecord } from "../data/types";
import { aggregate } from "../lib/kpiEngine";
import { fmtBRL, fmtNum } from "../lib/utils";
import { KpiCard, AlertBanner } from "../components/cards/KpiCard";
import { DailySpendChart } from "../components/charts/DailySpendChart";
import { CampaignTable } from "../components/tables/CampaignTable";
import { getBenchmark, getStatus } from "../config/settings";

interface Props { records: CampaignRecord[]; }

function getAlerts(m: ReturnType<typeof aggregate>, pid: string) {
  const alerts: Array<{ msg: string; level: "ok" | "warning" | "critical" }> = [];
  const cplBm  = getBenchmark(pid, "cpl");
  const roasBm = getBenchmark(pid, "roas");
  const qualBm = getBenchmark(pid, "aiQualifyRate");
  if (cplBm && m.cpl > cplBm.alert)  alerts.push({ msg: `CPL de R$ ${m.cpl.toFixed(2)} acima do limite de sangria (R$ ${cplBm.alert}). Revisar criativos.`, level: "critical" });
  else if (cplBm && m.cpl > cplBm.ok) alerts.push({ msg: `CPL de R$ ${m.cpl.toFixed(2)} em zona de atenção (meta: R$ ${cplBm.ok}).`, level: "warning" });
  if (roasBm && m.roas < roasBm.alert) alerts.push({ msg: `ROAS ${m.roas.toFixed(1)}x abaixo do mínimo (${roasBm.alert}x). Avaliar pausa.`, level: "critical" });
  if (qualBm && m.aiQualifyRate < qualBm.alert) alerts.push({ msg: `Taxa de qualificação da IA ${m.aiQualifyRate.toFixed(1)}% — abaixo do esperado. Revisar fluxo.`, level: "critical" });
  return alerts;
}

export function AdsPerformance({ records }: Props) {
  const m = aggregate(records);
  const pids = [...new Set(records.map(r => r.product_id))];
  const pid  = pids.length === 1 ? pids[0] : "default";
  const alerts = getAlerts(m, pid);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>Ads Performance</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>Relatório de performance de campanhas por produto e fonte</p>
      </div>

      {alerts.map((a, i) => <AlertBanner key={i} message={a.msg} level={a.level} />)}

      <div>
        <p className="section-label">Métricas Gerais</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Valor Gasto" value={fmtBRL(m.ad_spend)} prefix="R$" status="info" />
          <KpiCard label="Alcance"     value={fmtNum(m.reach)}                status="info" />
          <KpiCard label="CTR"         value={m.ctr.toFixed(2)} suffix="%"
            status={getStatus(m.ctr, getBenchmark(pid, "ctr"))} help="Cliques ÷ Impressões" />
          <KpiCard label="CPC"         value={fmtBRL(m.cpc)} prefix="R$"
            status={getStatus(m.cpc, getBenchmark(pid, "cpc"))} help="Custo por Clique" />
          <KpiCard label="CPL"         value={fmtBRL(m.cpl)} prefix="R$"
            status={getStatus(m.cpl, getBenchmark(pid, "cpl"))} help="Custo por Lead" />
          <KpiCard label="ROAS"        value={m.roas.toFixed(1)} suffix="x"
            status={getStatus(m.roas, getBenchmark(pid, "roas"))} help="Retorno sobre gasto" />
        </div>
      </div>

      <div className="card p-5">
        <p className="section-label">Gasto Diário por Produto</p>
        <DailySpendChart records={records} />
      </div>

      <CampaignTable records={records} />
    </div>
  );
}
