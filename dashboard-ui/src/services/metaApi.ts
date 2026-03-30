/**
 * Meta Ads Graph API Integration — ADS-AGENT
 * Conecta à conta real e mapeia para o schema CampaignRecord.
 * Fallback automático para dados mock quando não há campanhas ativas.
 */

import type { CampaignRecord } from "../data/types";

const TOKEN      = import.meta.env.VITE_META_TOKEN      as string;
const ACCOUNT_ID = import.meta.env.VITE_META_ACCOUNT_ID as string;
const API_VER    = import.meta.env.VITE_META_API_VERSION as string ?? "v21.0";
const BASE       = `https://graph.facebook.com/${API_VER}`;

export interface MetaAccountInfo {
  id:           string;
  name:         string;
  currency:     string;
  timezone:     string;
  amountSpent:  number;
  status:       number;   // 1 = ACTIVE
}

export interface MetaConnectionStatus {
  connected:   boolean;
  account:     MetaAccountInfo | null;
  error:       string | null;
}

// ─── Valida token e retorna info da conta ─────────────────────────────────────
export async function fetchAccountInfo(): Promise<MetaConnectionStatus> {
  if (!TOKEN) {
    return { connected: false, account: null, error: "VITE_META_TOKEN não configurado." };
  }

  try {
    const res = await fetch(
      `${BASE}/${ACCOUNT_ID}?fields=id,name,account_status,amount_spent,currency,timezone_name&access_token=${TOKEN}`
    );
    const data = await res.json();

    if (data.error) {
      return { connected: false, account: null, error: data.error.message };
    }

    return {
      connected: true,
      account: {
        id:          data.id,
        name:        data.name,
        currency:    data.currency ?? "BRL",
        timezone:    data.timezone_name ?? "America/Sao_Paulo",
        amountSpent: parseFloat(data.amount_spent ?? "0") / 100,
        status:      data.account_status,
      },
      error: null,
    };
  } catch (e) {
    return { connected: false, account: null, error: String(e) };
  }
}

// ─── Campos de insights por campanha ─────────────────────────────────────────
const INSIGHT_FIELDS = [
  "campaign_id", "campaign_name",
  "spend", "impressions", "clicks", "reach",
  "ctr", "cpm", "cpc",
  "actions",              // leads, purchases, etc.
  "action_values",        // valor das conversões
].join(",");

// ─── Mapear nome de campanha → product_id ────────────────────────────────────
function detectProductId(campaignName: string): { product_id: string; product_label: string } {
  const name = campaignName.toLowerCase();
  if (name.includes("epson") || name.includes("g6070"))
    return { product_id: "epson_g6070", product_label: "Epson G6070" };
  if (name.includes("ppf") || name.includes("protection film"))
    return { product_id: "ppf", product_label: "PPF (Protection Film)" };
  if (name.includes("l3250") || name.includes("l3210"))
    return { product_id: "epson_l3", product_label: "Epson L3 Series" };
  if (name.includes("l6490") || name.includes("l8050"))
    return { product_id: "epson_l6", product_label: "Epson L6/L8 Series" };
  // Genérico: usa o prefixo entre colchetes se existir ex: "[NOME]"
  const match = campaignName.match(/^\[([^\]]+)\]/);
  if (match) {
    const slug = match[1].toLowerCase().replace(/\s+/g, "_");
    return { product_id: slug, product_label: match[1] };
  }
  return { product_id: "outros", product_label: "Outros" };
}

// ─── Extrair valor de uma action específica ───────────────────────────────────
function getActionValue(actions: Array<{ action_type: string; value: string }> | undefined, type: string): number {
  if (!actions) return 0;
  const found = actions.find(a => a.action_type === type);
  return found ? parseFloat(found.value) : 0;
}

// ─── Converter preset de período para time_range da API ──────────────────────
function buildTimeRange(dateStart: string, dateEnd: string): string {
  return encodeURIComponent(JSON.stringify({ since: dateStart, until: dateEnd }));
}

// ─── Buscar insights por campanha ────────────────────────────────────────────
export async function fetchCampaignInsights(
  dateStart: string,
  dateEnd:   string,
): Promise<{ records: CampaignRecord[]; hasRealData: boolean; error: string | null }> {
  if (!TOKEN) {
    return { records: [], hasRealData: false, error: "Token não configurado." };
  }

  try {
    const timeRange = buildTimeRange(dateStart, dateEnd);
    const url = `${BASE}/${ACCOUNT_ID}/insights?fields=${INSIGHT_FIELDS}&time_range=${timeRange}&level=campaign&limit=100&access_token=${TOKEN}`;

    const res  = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return { records: [], hasRealData: false, error: data.error.message };
    }

    const rawInsights: Array<Record<string, unknown>> = data.data ?? [];

    if (rawInsights.length === 0) {
      return { records: [], hasRealData: false, error: null };
    }

    // Paginar se houver mais resultados
    let allInsights = [...rawInsights];
    let nextUrl: string | null = data.paging?.next ?? null;
    while (nextUrl) {
      const nextRes  = await fetch(nextUrl);
      const nextData = await nextRes.json();
      allInsights = [...allInsights, ...(nextData.data ?? [])];
      nextUrl = nextData.paging?.next ?? null;
    }

    // Mapear para CampaignRecord
    const records: CampaignRecord[] = allInsights.map((row) => {
      type ActionRow = { action_type: string; value: string };
      const actions      = (row.actions as ActionRow[] | undefined);
      const actionValues = (row.action_values as ActionRow[] | undefined);

      const spend       = parseFloat(row.spend as string ?? "0");
      const impressions = parseInt(row.impressions as string ?? "0", 10);
      const clicks      = parseInt(row.clicks as string ?? "0", 10);
      const reach       = parseInt(row.reach as string ?? "0", 10);

      // Leads = ação "lead" (Meta Lead Ads) ou "onsite_conversion.lead_grouped"
      const leadsRaw = getActionValue(actions, "lead")
        || getActionValue(actions, "onsite_conversion.lead_grouped")
        || getActionValue(actions, "contact");

      // Valor de conversão
      const convValue = getActionValue(actionValues as ActionRow[] | undefined, "purchase")
        || getActionValue(actionValues as ActionRow[] | undefined, "lead");

      const { product_id, product_label } = detectProductId(row.campaign_name as string ?? "");

      return {
        product_id,
        product_label,
        campaign_name:          (row.campaign_name as string) ?? "",
        campaign_id:            (row.campaign_id  as string) ?? "",
        source:                 "meta_ads",
        date:                   dateStart,
        ad_spend:               spend,
        impressions,
        clicks,
        reach,
        leads_raw:              Math.round(leadsRaw),
        ai_leads_responded:     0,   // vem do Agente de IA (n8n)
        leads_qualified_by_ai:  0,   // vem do Agente de IA (n8n)
        ai_overflow_count:      0,
        ai_avg_response_minutes:0,
        sentiment_positive:     0,
        sentiment_neutral:      0,
        sentiment_negative:     0,
        lead_profile_breakdown: {},
        conversion_value:       convValue,
        interest_extended_warranty: 0,
        interest_ink_recurrence:    0,
        currency:               "BRL",
      } satisfies CampaignRecord;
    });

    return { records, hasRealData: records.length > 0, error: null };
  } catch (e) {
    return { records: [], hasRealData: false, error: String(e) };
  }
}

// ─── Buscar posts/criativos de uma campanha ───────────────────────────────────
export async function fetchCampaignCreatives(campaignId: string): Promise<Array<{
  id: string; name: string; preview_url: string;
}>> {
  try {
    const url = `${BASE}/${campaignId}/ads?fields=id,name,creative{thumbnail_url}&access_token=${TOKEN}`;
    const res  = await fetch(url);
    const data = await res.json();
    return (data.data ?? []).map((ad: Record<string, unknown>) => ({
      id:          ad.id as string,
      name:        ad.name as string,
      preview_url: (ad.creative as Record<string, string>)?.thumbnail_url ?? "",
    }));
  } catch { return []; }
}
