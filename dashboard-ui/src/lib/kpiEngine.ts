import type { CampaignRecord, AggregatedMetrics } from "../data/types";

export function aggregate(records: CampaignRecord[]): AggregatedMetrics {
  const s = {
    ad_spend: 0, impressions: 0, clicks: 0, reach: 0,
    leads_raw: 0, leads_qualified_by_ai: 0, conversion_value: 0,
    ai_leads_responded: 0, ai_overflow_count: 0, ai_avg_response_minutes: 0,
    sentiment_positive: 0, sentiment_neutral: 0, sentiment_negative: 0,
  };
  if (!records.length) return { ...s, ctr: 0, cpc: 0, cpl: 0, cpm: 0, roas: 0, aiRetentionRate: 0, aiQualifyRate: 0, aiOverflowRate: 0 };

  for (const r of records) {
    s.ad_spend += r.ad_spend;
    s.impressions += r.impressions;
    s.clicks += r.clicks;
    s.reach += r.reach;
    s.leads_raw += r.leads_raw;
    s.leads_qualified_by_ai += r.leads_qualified_by_ai;
    s.conversion_value += r.conversion_value;
    s.ai_leads_responded += r.ai_leads_responded;
    s.ai_overflow_count += r.ai_overflow_count;
    s.ai_avg_response_minutes += r.ai_avg_response_minutes;
    s.sentiment_positive += r.sentiment_positive;
    s.sentiment_neutral += r.sentiment_neutral;
    s.sentiment_negative += r.sentiment_negative;
  }

  s.ai_avg_response_minutes /= records.length;
  s.sentiment_positive /= records.length;
  s.sentiment_neutral /= records.length;
  s.sentiment_negative /= records.length;

  return {
    ...s,
    ctr:  s.impressions > 0 ? s.clicks / s.impressions * 100 : 0,
    cpc:  s.clicks > 0 ? s.ad_spend / s.clicks : 0,
    cpl:  s.leads_raw > 0 ? s.ad_spend / s.leads_raw : 0,
    cpm:  s.impressions > 0 ? s.ad_spend / s.impressions * 1000 : 0,
    roas: s.ad_spend > 0 ? s.conversion_value / s.ad_spend : 0,
    aiRetentionRate:  s.leads_raw > 0 ? s.ai_leads_responded / s.leads_raw * 100 : 0,
    aiQualifyRate:    s.leads_raw > 0 ? s.leads_qualified_by_ai / s.leads_raw * 100 : 0,
    aiOverflowRate:   s.ai_leads_responded > 0 ? s.ai_overflow_count / s.ai_leads_responded * 100 : 0,
  };
}

export function filterRecords(
  records: CampaignRecord[],
  { dateStart, dateEnd, products, campaigns, sources }: {
    dateStart: string; dateEnd: string;
    products: string[]; campaigns: string[]; sources: string[];
  }
): CampaignRecord[] {
  return records.filter(r =>
    r.date >= dateStart && r.date <= dateEnd &&
    (products.length === 0 || products.includes(r.product_label)) &&
    (campaigns.length === 0 || campaigns.includes(r.campaign_name)) &&
    (sources.length === 0 || sources.includes(r.source))
  );
}

export function getDailySpend(records: CampaignRecord[]): Record<string, Record<string, number>> {
  const map: Record<string, Record<string, number>> = {};
  for (const r of records) {
    if (!map[r.date]) map[r.date] = {};
    map[r.date][r.product_label] = (map[r.date][r.product_label] || 0) + r.ad_spend;
  }
  return map;
}

export function getByProduct(records: CampaignRecord[]) {
  const map: Record<string, CampaignRecord[]> = {};
  for (const r of records) {
    if (!map[r.product_label]) map[r.product_label] = [];
    map[r.product_label].push(r);
  }
  return Object.entries(map).map(([label, recs]) => ({
    label,
    product_id: recs[0].product_id,
    ...aggregate(recs),
  }));
}

export function getByCampaign(records: CampaignRecord[]) {
  const map: Record<string, CampaignRecord[]> = {};
  for (const r of records) {
    const key = `${r.product_label}||${r.campaign_name}||${r.source}`;
    if (!map[key]) map[key] = [];
    map[key].push(r);
  }
  return Object.entries(map).map(([key, recs]) => {
    const [product_label, campaign_name, source] = key.split("||");
    return { product_label, campaign_name, source, product_id: recs[0].product_id, ...aggregate(recs) };
  });
}

export function getMonthly(records: CampaignRecord[]) {
  const map: Record<string, CampaignRecord[]> = {};
  for (const r of records) {
    const month = r.date.slice(0, 7);
    if (!map[month]) map[month] = [];
    map[month].push(r);
  }
  return Object.entries(map).sort().map(([month, recs]) => ({
    month, ...aggregate(recs),
  }));
}

export function getAggregatedProfiles(records: CampaignRecord[]): Record<string, number> {
  const agg: Record<string, number> = {};
  for (const r of records) {
    for (const [k, v] of Object.entries(r.lead_profile_breakdown || {})) {
      agg[k] = (agg[k] || 0) + v;
    }
  }
  const total = Object.values(agg).reduce((a, b) => a + b, 0);
  if (!total) return agg;
  return Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, +(v / total * 100).toFixed(1)]));
}
