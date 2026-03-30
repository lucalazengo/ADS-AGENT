import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from "recharts";
import type { CampaignRecord } from "../../data/types";
import { getByProduct } from "../../lib/kpiEngine";

interface Props { records: CampaignRecord[]; }

const barColor = (roas: number) =>
  roas >= 4 ? "#27AE60" : roas >= 2 ? "#F39C12" : "#E74C3C";

export function RoasBarChart({ records }: Props) {
  const byProduct = getByProduct(records)
    .map(p => ({ name: p.label, roas: +p.roas.toFixed(2) }))
    .sort((a, b) => b.roas - a.roas);

  return (
    <ResponsiveContainer width="100%" height={Math.max(140, byProduct.length * 56)}>
      <BarChart data={byProduct} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false}
               tickFormatter={(v) => `${v}x`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#4A5568" }}
               tickLine={false} axisLine={false} width={120} />
        <Tooltip
          formatter={(v) => [`${Number(v)}x`, "ROAS"]}
          contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }}
        />
        <Bar dataKey="roas" radius={[0, 6, 6, 0]}
             label={{ position: "right", fontSize: 12, fontWeight: 700, formatter: (v: unknown) => `${v}x` }}>
          {byProduct.map((entry, i) => (
            <Cell key={i} fill={barColor(entry.roas)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AiComparisonChart({ records }: Props) {
  const byProduct = getByProduct(records).map(p => ({
    name: p.label,
    "Qualificação (%)": +p.aiQualifyRate.toFixed(1),
    "Transbordo (%)":   +p.aiOverflowRate.toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={byProduct} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false}
               tickFormatter={(v) => `${v}%`} />
        <Tooltip
          formatter={(v, name) => [`${Number(v)}%`, name]}
          contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Qualificação (%)" fill="#2D7DD2" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Transbordo (%)"   fill="#F39C12" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CplTrendChart({ records }: Props) {
  const byDate: Record<string, Record<string, { spend: number; leads: number }>> = {};
  for (const r of records) {
    if (!byDate[r.date]) byDate[r.date] = {};
    const p = r.product_label;
    if (!byDate[r.date][p]) byDate[r.date][p] = { spend: 0, leads: 0 };
    byDate[r.date][p].spend += r.ad_spend;
    byDate[r.date][p].leads += r.leads_raw;
  }

  const products = [...new Set(records.map(r => r.product_label))];
  const TREND_COLORS = ["#2D7DD2", "#F39C12", "#27AE60", "#E74C3C"];

  const data = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, vals]) => ({
    date: date.slice(5),
    ...Object.fromEntries(
      products.map(p => [p, vals[p] ? +(vals[p].spend / Math.max(vals[p].leads, 1)).toFixed(2) : 0])
    ),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false}
               tickFormatter={(v) => `R$${v}`} width={48} />
        <Tooltip
          formatter={(v) => [`R$ ${Number(v)}`, ""]}
          contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {products.map((p, i) => (
          <Line key={p} type="monotone" dataKey={p}
            stroke={TREND_COLORS[i % TREND_COLORS.length]}
            strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
