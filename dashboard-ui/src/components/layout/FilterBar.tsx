import type { CampaignRecord, Filters } from "../../data/types";

interface Props {
  data: CampaignRecord[];
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
}

const PERIOD_OPTIONS = [
  { label: "Hoje",    days: 1 },
  { label: "7 dias",  days: 7 },
  { label: "14 dias", days: 14 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return d.toISOString().split("T")[0];
}

export function FilterBar({ data, filters, onChange }: Props) {
  const allProducts = [...new Set(data.map(r => r.product_label))].sort();
  const sourceLabel: Record<string, string> = {
    meta_ads: "Meta Ads", google_ads: "Google Ads", organic: "Orgânico",
  };
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Period pills */}
      <div className="period-group flex gap-0.5">
        {PERIOD_OPTIONS.map(o => {
          const start = daysAgoStr(o.days);
          const active = filters.dateStart === start && filters.dateEnd === today;
          return (
            <button
              key={o.days}
              onClick={() => onChange({ dateStart: start, dateEnd: today })}
              className={`period-btn ${active ? "active" : ""}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      <select
        value={filters.products[0] || ""}
        onChange={e => onChange({ products: e.target.value ? [e.target.value] : [] })}
        className="theme-select"
      >
        <option value="">Todos os produtos</option>
        {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <select
        value={filters.sources[0] || ""}
        onChange={e => onChange({ sources: e.target.value ? [e.target.value] : [] })}
        className="theme-select"
      >
        <option value="">Todas as fontes</option>
        {["meta_ads","google_ads","organic"].map(s => (
          <option key={s} value={s}>{sourceLabel[s]}</option>
        ))}
      </select>
    </div>
  );
}
