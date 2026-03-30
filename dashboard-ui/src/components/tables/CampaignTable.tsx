import type { CampaignRecord } from "../../data/types";
import { getByCampaign } from "../../lib/kpiEngine";
import { fmtBRL, fmtNum, statusClass } from "../../lib/utils";
import { getBenchmark, getStatus } from "../../config/settings";
import { Download } from "lucide-react";

interface Props { records: CampaignRecord[]; }

const SOURCE_LABEL: Record<string, string> = {
  meta_ads: "Meta", google_ads: "Google", organic: "Orgânico", referral: "Referral", manual: "Manual",
};
const SOURCE_COLOR: Record<string, string> = {
  meta_ads:  "bg-blue-100  text-blue-700  dark:bg-blue-900/40  dark:text-blue-300",
  google_ads:"bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-300",
  organic:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  referral:  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  manual:    "bg-slate-100  text-slate-600  dark:bg-slate-700    dark:text-slate-300",
};

function exportCSV(rows: ReturnType<typeof getByCampaign>) {
  const header = ["Produto","Campanha","Fonte","Gasto","CTR","CPL","Leads","Qualif.","ROAS"];
  const lines = rows.map(r => [
    r.product_label, r.campaign_name, r.source,
    r.ad_spend.toFixed(2), r.ctr.toFixed(2), r.cpl.toFixed(2),
    r.leads_raw, r.leads_qualified_by_ai, r.roas.toFixed(2),
  ].join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "campanhas.csv";
  a.click();
}

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest whitespace-nowrap"
        style={{ color: "var(--text-muted)", backgroundColor: "color-mix(in srgb, var(--border-light) 80%, var(--bg-card))" }}>
      {children}
    </th>
  );
}

export function CampaignTable({ records }: Props) {
  const rows = getByCampaign(records).sort((a, b) => b.ad_spend - a.ad_spend);

  if (!rows.length) return (
    <div className="card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
      Nenhum dado para o período selecionado.
    </div>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>Performance por Campanha</span>
        <button onClick={() => exportCSV(rows)}
          className="flex items-center gap-1.5 text-xs text-brand-600 font-semibold hover:text-brand-800 transition-colors">
          <Download size={13} /> Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <TH>Campanha</TH><TH>Produto</TH><TH>Fonte</TH>
              <TH>Gasto</TH><TH>Impressões</TH><TH>CTR</TH>
              <TH>CPL</TH><TH>Leads</TH><TH>Qualif. IA</TH><TH>ROAS</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="tr-hover transition-colors" style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td className="px-3 py-2.5 font-semibold max-w-[200px] truncate" title={r.campaign_name}
                    style={{ color: "var(--text)" }}>
                  {r.campaign_name}
                </td>
                <td className="px-3 py-2.5 text-xs" style={{ color: "var(--text-2)" }}>{r.product_label}</td>
                <td className="px-3 py-2.5">
                  <span className={`badge ${SOURCE_COLOR[r.source] || "bg-slate-100 text-slate-600"}`}>
                    {SOURCE_LABEL[r.source] || r.source}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-semibold" style={{ color: "var(--text)" }}>R$ {fmtBRL(r.ad_spend)}</td>
                <td className="px-3 py-2.5" style={{ color: "var(--text-2)" }}>{fmtNum(r.impressions)}</td>
                <td className={`px-3 py-2.5 ${statusClass(getStatus(r.ctr, getBenchmark(r.product_id, "ctr")))}`}>
                  {r.ctr.toFixed(2)}%
                </td>
                <td className={`px-3 py-2.5 ${statusClass(getStatus(r.cpl, getBenchmark(r.product_id, "cpl")))}`}>
                  R$ {fmtBRL(r.cpl)}
                </td>
                <td className="px-3 py-2.5" style={{ color: "var(--text-2)" }}>{fmtNum(r.leads_raw)}</td>
                <td className="px-3 py-2.5 font-semibold text-brand-600">{fmtNum(r.leads_qualified_by_ai)}</td>
                <td className={`px-3 py-2.5 ${statusClass(getStatus(r.roas, getBenchmark(r.product_id, "roas")))}`}>
                  {r.roas.toFixed(1)}x
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
