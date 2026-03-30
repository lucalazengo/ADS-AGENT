export const COLORS = {
  bgPrimary:    "#F8FAFC",
  bgCard:       "#FFFFFF",
  bgSidebar:    "#EBF4FF",
  bluePrimary:  "#2D7DD2",
  blueMedium:   "#4A9EDF",
  blueLight:    "#B3D4F5",
  blueDark:     "#1A5CA8",
  blueSubtle:   "#E8F4FD",
  green:        "#27AE60",
  red:          "#E74C3C",
  orange:       "#F39C12",
  textPrimary:  "#1A202C",
  textSecondary:"#718096",
  textMuted:    "#A0AEC0",
  border:       "#E2E8F0",
};

export const CHART_COLORS = [
  "#2D7DD2", "#4A9EDF", "#1A5CA8", "#B3D4F5",
  "#6BB8F0", "#8EC9F7", "#3D8FD1", "#0F4C8A",
];

export type BenchmarkKPI = {
  ok: number; alert: number; lowerIsBetter: boolean; unit: string;
};

export const BENCHMARKS: Record<string, Record<string, BenchmarkKPI>> = {
  default: {
    ctr:             { ok: 2.0,  alert: 1.0,  lowerIsBetter: false, unit: "%" },
    cpc:             { ok: 2.50, alert: 5.00, lowerIsBetter: true,  unit: "R$" },
    cpl:             { ok: 20.0, alert: 35.0, lowerIsBetter: true,  unit: "R$" },
    cpm:             { ok: 20.0, alert: 40.0, lowerIsBetter: true,  unit: "R$" },
    roas:            { ok: 4.0,  alert: 2.0,  lowerIsBetter: false, unit: "x" },
    aiRetention:     { ok: 85.0, alert: 65.0, lowerIsBetter: false, unit: "%" },
    aiQualifyRate:   { ok: 60.0, alert: 35.0, lowerIsBetter: false, unit: "%" },
    aiOverflowRate:  { ok: 20.0, alert: 40.0, lowerIsBetter: true,  unit: "%" },
  },
  epson_g6070: {
    cpl:  { ok: 35.0, alert: 55.0, lowerIsBetter: true,  unit: "R$" },
    roas: { ok: 3.0,  alert: 1.5,  lowerIsBetter: false, unit: "x" },
  },
  ppf: {
    cpl:  { ok: 18.0, alert: 28.0, lowerIsBetter: true,  unit: "R$" },
    roas: { ok: 5.0,  alert: 3.0,  lowerIsBetter: false, unit: "x" },
    ctr:  { ok: 2.5,  alert: 1.2,  lowerIsBetter: false, unit: "%" },
  },
};

export function getBenchmark(productId: string, kpi: string): BenchmarkKPI | null {
  return BENCHMARKS[productId]?.[kpi] ?? BENCHMARKS.default?.[kpi] ?? null;
}

export type KPIStatus = "ok" | "warning" | "critical" | "info";

export function getStatus(value: number, bm: BenchmarkKPI | null): KPIStatus {
  if (!bm) return "info";
  if (bm.lowerIsBetter) {
    return value <= bm.ok ? "ok" : value <= bm.alert ? "warning" : "critical";
  }
  return value >= bm.ok ? "ok" : value >= bm.alert ? "warning" : "critical";
}

// ─── Economias do produto para CAC / LTV ─────────────────────────────────────

export type ProductEconomics = {
  avg_ticket:           number;  // R$ ticket médio
  purchase_frequency:   number;  // compras/ano
  retention_years:      number;  // anos de retenção média
  overhead_monthly:     number;  // R$ custos indiretos mensais alocados
};

export const PRODUCT_ECONOMICS: Record<string, ProductEconomics> = {
  default: {
    avg_ticket: 500, purchase_frequency: 1, retention_years: 2, overhead_monthly: 2000,
  },
  epson_g6070: {
    avg_ticket: 3200, purchase_frequency: 1.5, retention_years: 3, overhead_monthly: 3000,
  },
  ppf: {
    avg_ticket: 800, purchase_frequency: 2, retention_years: 2, overhead_monthly: 1500,
  },
};

export function getEconomics(productId: string): ProductEconomics {
  return PRODUCT_ECONOMICS[productId] ?? PRODUCT_ECONOMICS.default;
}

export function calcLTV(productId: string): number {
  const e = getEconomics(productId);
  return e.avg_ticket * e.purchase_frequency * e.retention_years;
}

export function calcCAC(
  adSpend: number,
  customersAcquired: number,
  overheadMonthly: number
): number {
  if (customersAcquired <= 0) return 0;
  return (adSpend + overheadMonthly) / customersAcquired;
}
