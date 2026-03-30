import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CHART_COLORS } from "../../config/settings";

interface Props {
  data: Record<string, number>;
  centerLabel?: string;
}

export function DonutChart({ data, centerLabel }: Props) {
  const entries = Object.entries(data).map(([name, value]) => ({ name, value }));
  const total = entries.reduce((s, e) => s + e.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={entries} cx="40%" cy="50%"
            innerRadius={65} outerRadius={90}
            paddingAngle={2} dataKey="value"
            strokeWidth={2} stroke="#fff"
          >
            {entries.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => [`${Number(v).toFixed(1)}%`, ""]}
            contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }}
          />
          <Legend layout="vertical" align="right" verticalAlign="middle"
            iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, lineHeight: "22px" }} />
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex items-center justify-start pointer-events-none"
           style={{ paddingLeft: "calc(40% - 40px)" }}>
        <div className="text-center">
          <div className="text-xl font-bold text-slate-800">{Math.round(total)}</div>
          <div className="text-[10px] text-slate-400">{centerLabel || "leads"}</div>
        </div>
      </div>
    </div>
  );
}
