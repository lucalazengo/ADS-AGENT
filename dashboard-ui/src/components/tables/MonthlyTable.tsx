import type { CampaignRecord } from "../../data/types";
import { getMonthly } from "../../lib/kpiEngine";
import { fmtBRL, fmtNum } from "../../lib/utils";

interface Props { records: CampaignRecord[]; }

const MONTH_PT: Record<string, string> = {
  "01":"Jan","02":"Fev","03":"Mar","04":"Abr","05":"Mai","06":"Jun",
  "07":"Jul","08":"Ago","09":"Set","10":"Out","11":"Nov","12":"Dez",
};

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest"
        style={{ color: "var(--text-muted)", backgroundColor: "color-mix(in srgb, var(--border-light) 80%, var(--bg-card))" }}>
      {children}
    </th>
  );
}

export function MonthlyTable({ records }: Props) {
  const rows = getMonthly(records);
  const totals = rows.reduce(
    (acc, r) => ({ ad_spend: acc.ad_spend + r.ad_spend, conversion_value: acc.conversion_value + r.conversion_value,
                   leads_raw: acc.leads_raw + r.leads_raw, leads_qualified_by_ai: acc.leads_qualified_by_ai + r.leads_qualified_by_ai }),
    { ad_spend: 0, conversion_value: 0, leads_raw: 0, leads_qualified_by_ai: 0 }
  );

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>Histórico Mensal</span>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-3 border-b" style={{ borderColor: "var(--border)" }}>
        {[
          { label: "Gasto Total",    value: `R$ ${fmtBRL(totals.ad_spend)}`,         color: "text-brand-600" },
          { label: "Receita Gerada", value: `R$ ${fmtBRL(totals.conversion_value)}`, color: "text-emerald-500" },
          { label: "ROAS Geral",     value: `${totals.ad_spend > 0 ? (totals.conversion_value / totals.ad_spend).toFixed(1) : "0"}x`, color: "text-brand-500" },
        ].map((t, i) => (
          <div key={t.label} className="px-5 py-4" style={{ borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
            <div className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{t.label}</div>
            <div className={`text-xl font-bold ${t.color}`}>{t.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <TH>Mês</TH><TH>Gasto</TH><TH>Leads Brutos</TH>
              <TH>Qualificados</TH><TH>Valor Convertido</TH><TH>ROAS</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const [y, m] = r.month.split("-");
              const roas = r.ad_spend > 0 ? r.conversion_value / r.ad_spend : 0;
              const rc = roas >= 4 ? "text-emerald-500" : roas >= 2 ? "text-amber-500" : "text-red-500";
              return (
                <tr key={r.month} className="tr-hover transition-colors" style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--text)" }}>{MONTH_PT[m]} {y}</td>
                  <td className="px-4 py-3 font-semibold text-brand-600">R$ {fmtBRL(r.ad_spend)}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-2)" }}>{fmtNum(r.leads_raw)}</td>
                  <td className="px-4 py-3 font-semibold text-brand-500">{fmtNum(r.leads_qualified_by_ai)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-500">R$ {fmtBRL(r.conversion_value)}</td>
                  <td className={`px-4 py-3 font-bold ${rc}`}>{roas.toFixed(1)}x</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
