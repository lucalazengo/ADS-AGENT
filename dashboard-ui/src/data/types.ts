export interface CampaignRecord {
  product_id: string;
  product_label: string;
  campaign_name: string;
  campaign_id?: string;
  source: "meta_ads" | "google_ads" | "organic" | "referral" | "manual";
  date: string;
  ad_spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  leads_raw: number;
  ai_leads_responded: number;
  leads_qualified_by_ai: number;
  ai_overflow_count: number;
  ai_avg_response_minutes: number;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  lead_profile_breakdown: Record<string, number>;
  conversion_value: number;
  crm_stage?: string;
  interest_extended_warranty: number;
  interest_ink_recurrence: number;
  currency: string;
}

export interface AggregatedMetrics {
  ad_spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  leads_raw: number;
  leads_qualified_by_ai: number;
  conversion_value: number;
  ai_leads_responded: number;
  ai_overflow_count: number;
  ai_avg_response_minutes: number;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  // computed
  ctr: number;
  cpc: number;
  cpl: number;
  cpm: number;
  roas: number;
  aiRetentionRate: number;
  aiQualifyRate: number;
  aiOverflowRate: number;
}

export interface DailyPoint {
  date: string;
  [product: string]: number | string;
}

export interface Filters {
  dateStart: string;
  dateEnd: string;
  products: string[];
  campaigns: string[];
  sources: string[];
}
