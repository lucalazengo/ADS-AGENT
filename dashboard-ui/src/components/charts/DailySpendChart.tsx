import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { CampaignRecord } from "../../data/types";
import { getDailySpend } from "../../lib/kpiEngine";
import { CHART_COLORS } from "../../config/settings";

interface Props { records: CampaignRecord[]; }

export function DailySpendChart({ records }: Props) {
  const map = getDailySpend(records);
  const products = [...new Set(records.map(r => r.product_label))];

  const data = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date: date.slice(5),
      ...Object.fromEntries(products.map(p => [p, +(vals[p] || 0).toFixed(2)])),
    }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false}
               tickFormatter={(v) => `R$${v}`} width={52} />
        <Tooltip
          formatter={(v) => [`R$ ${Number(v).toFixed(2)}`, ""]}
          contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {products.map((p, i) => (
          <Line
            key={p} type="monotone" dataKey={p}
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
