import type { CampaignRecord } from "./types";

const PRODUCTS = [
  {
    id: "epson_g6070", label: "Epson G6070",
    campaigns: ["[EPSON] Conversão - Fundo de Funil", "[EPSON] Consideração - Vídeo", "[EPSON] Remarketing"],
    spend: 244, ctr: 2.51, cpm: 15.38, leads: 262, qualifyRate: 0.60, convValue: 18500,
    sources: ["meta_ads", "google_ads"] as const,
  },
  {
    id: "ppf", label: "PPF (Protection Film)",
    campaigns: ["[PPF] Conversão - Leads Frios", "[PPF] Tráfego - Blog"],
    spend: 96, ctr: 1.74, cpm: 19.87, leads: 85, qualifyRate: 0.45, convValue: 7200,
    sources: ["meta_ads"] as const,
  },
];

const PROFILES = ["Gestor Atuante", "Quer Começar", "Não Trabalha", "No de Negócio"];

function jitter(v: number, pct = 0.25): number {
  return Math.max(0, v * (1 + (Math.random() - 0.5) * 2 * pct));
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

export function generateMockData(days = 30): CampaignRecord[] {
  const records: CampaignRecord[] = [];
  for (let day = days - 1; day >= 0; day--) {
    const date = dateStr(day);
    for (const p of PRODUCTS) {
      for (const campaign of p.campaigns) {
        const source = p.sources[Math.floor(Math.random() * p.sources.length)];
        const spend = +jitter(p.spend / p.campaigns.length).toFixed(2);
        const impressions = Math.max(1, Math.round(jitter(spend / (p.cpm / 1000))));
        const clicks = Math.max(0, Math.round(impressions * (p.ctr / 100) * jitter(1, 0.3)));
        const leadsRaw = Math.max(1, Math.round(jitter(p.leads / p.campaigns.length / 30 * 7)));
        const leadsResponded = Math.min(leadsRaw, Math.round(leadsRaw * jitter(0.985, 0.01)));
        const leadsQualified = Math.min(leadsRaw, Math.round(leadsRaw * jitter(p.qualifyRate, 0.2)));
        const overflow = Math.round(leadsResponded * jitter(0.12, 0.3));
        const convValue = +jitter(p.convValue / p.campaigns.length / 30 * 7).toFixed(2);

        const pos = +jitter(60, 0.15).toFixed(1);
        const neg = +jitter(10, 0.3).toFixed(1);
        const neu = +(100 - pos - neg).toFixed(1);

        const rawP = [jitter(58, 0.2), jitter(14, 0.3), jitter(10, 0.3), jitter(18, 0.2)];
        const total = rawP.reduce((a, b) => a + b, 0);
        const profile: Record<string, number> = {};
        PROFILES.forEach((k, i) => { profile[k] = +(rawP[i] / total * 100).toFixed(1); });

        records.push({
          product_id: p.id, product_label: p.label, campaign_name: campaign,
          source, date, ad_spend: spend, impressions, clicks, reach: Math.round(impressions * 0.85),
          leads_raw: leadsRaw, ai_leads_responded: leadsResponded,
          leads_qualified_by_ai: leadsQualified, ai_overflow_count: overflow,
          ai_avg_response_minutes: +jitter(1.8, 0.4).toFixed(1),
          sentiment_positive: pos, sentiment_neutral: Math.max(0, neu), sentiment_negative: neg,
          lead_profile_breakdown: profile, conversion_value: convValue,
          crm_stage: ["Primeiro Contato","Proposta Enviada","Negociação","Fechado"][Math.floor(Math.random()*4)],
          interest_extended_warranty: +jitter(35, 0.3).toFixed(1),
          interest_ink_recurrence: +jitter(48, 0.25).toFixed(1),
          currency: "BRL",
        });
      }
    }
  }
  return records;
}

// singleton para não regenerar a cada render
let _cache: CampaignRecord[] | null = null;
export function getMockData(): CampaignRecord[] {
  if (!_cache) _cache = generateMockData(30);
  return _cache;
}
