import type { CampaignRecord } from "../data/types";
import { aggregate, getByProduct, getAggregatedProfiles } from "../lib/kpiEngine";
import { fmtNum } from "../lib/utils";
import { KpiCard } from "../components/cards/KpiCard";
import { FunnelChart } from "../components/charts/FunnelChart";
import { DonutChart } from "../components/charts/DonutChart";
import { AiComparisonChart } from "../components/charts/RoasBarChart";
import { getBenchmark, getStatus } from "../config/settings";

interface Props { records: CampaignRecord[]; }

export function AiFunnel({ records }: Props) {
  const m = aggregate(records);
  const byProduct = getByProduct(records);
  const profiles = getAggregatedProfiles(records);
  const pids = [...new Set(records.map(r => r.product_id))];
  const pid = pids.length === 1 ? pids[0] : "default";

  const sorted = [...byProduct].sort((a, b) => b.aiQualifyRate - a.aiQualifyRate);
  const best  = sorted[0];
  const worst = sorted[sorted.length - 1];

  const totalOverflow = records.reduce((s, r) => s + r.ai_overflow_count, 0);
  const overflowPct = m.leads_raw > 0 ? totalOverflow / m.leads_raw * 100 : 0;
  const ovColor = overflowPct < 20 ? "text-emerald-500" : overflowPct < 40 ? "text-amber-500" : "text-red-500";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>Funil de Atendimento da IA</h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>Eficiência do Agente na qualificação e retenção de leads</p>
      </div>

      {/* KPI Cards IA */}
      <div>
        <p className="section-label">KPIs do Agente de IA</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="Leads Brutos"  value={fmtNum(m.leads_raw)}                status="info"  help="Total que chegou à IA" />
          <KpiCard label="Retenção IA"   value={m.aiRetentionRate.toFixed(1)} suffix="%"
            status={getStatus(m.aiRetentionRate,  getBenchmark(pid, "aiRetention"))} help="Leads que interagiram" />
          <KpiCard label="Taxa Qualif."  value={m.aiQualifyRate.toFixed(1)}   suffix="%"
            status={getStatus(m.aiQualifyRate,    getBenchmark(pid, "aiQualifyRate"))} help="Qualificados pela IA" />
          <KpiCard label="Transbordo"    value={m.aiOverflowRate.toFixed(1)}  suffix="%"
            status={getStatus(m.aiOverflowRate,   getBenchmark(pid, "aiOverflowRate"))} help="IA → Humano" />
          <KpiCard label="Resp. Médio"   value={m.ai_avg_response_minutes.toFixed(1)} suffix=" min" status="info" help="Tempo médio de resposta" />
        </div>
      </div>

      {/* Funil + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <p className="section-label">Funil de Conversão</p>
          <FunnelChart metrics={m} />
        </div>
        <div className="card p-5">
          <p className="section-label">Perfil dos Leads</p>
          {Object.keys(profiles).length > 0
            ? <DonutChart data={profiles} centerLabel="leads" />
            : <p className="text-sm text-center mt-8" style={{ color: "var(--text-muted)" }}>Sem dados de perfil</p>
          }
        </div>
      </div>

      {/* Comparativo IA */}
      <div className="card p-5">
        <p className="section-label">Eficiência da IA por Produto</p>
        <AiComparisonChart records={records} />
      </div>

      {/* Insights */}
      <div>
        <p className="section-label">Insights Acionáveis</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {best && (
            <InsightCard color="emerald" title="Melhor Produto (IA)" name={best.label}
              metric={`${best.aiQualifyRate.toFixed(1)}% de qualificação`} tip="→ Escalar orçamento neste produto" />
          )}
          {worst && worst.label !== best?.label && (
            <InsightCard color="red" title="Revisar Fluxo IA" name={worst.label}
              metric={`${worst.aiQualifyRate.toFixed(1)}% de qualificação`} tip="→ Otimizar perguntas de qualificação" />
          )}
          <div className="card border-t-[3px] border-t-brand-400 p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Transbordo Total</div>
            <div className="text-base font-bold" style={{ color: "var(--text)" }}>{fmtNum(totalOverflow)} atend.</div>
            <div className={`text-sm font-semibold mt-0.5 ${ovColor}`}>{overflowPct.toFixed(1)}% dos leads</div>
            <div className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>→ Meta: &lt; 20%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ color, title, name, metric, tip }: {
  color: "emerald" | "red"; title: string; name: string; metric: string; tip: string;
}) {
  const borderColor = color === "emerald" ? "border-t-emerald-500" : "border-t-red-400";
  const metricColor = color === "emerald" ? "text-emerald-500" : "text-red-500";
  return (
    <div className={`card border-t-[3px] ${borderColor} p-4`}>
      <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>{title}</div>
      <div className="text-base font-bold" style={{ color: "var(--text)" }}>{name}</div>
      <div className={`text-sm font-semibold mt-0.5 ${metricColor}`}>{metric}</div>
      <div className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{tip}</div>
    </div>
  );
}
