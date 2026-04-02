/**
 * csvLoader.ts — ADS-AGENT
 * Carrega e faz parse dos CSVs estáticos em /public/data/.
 * Mapeia os 4 arquivos para o schema CampaignRecord unificado.
 *
 * Fluxo de dados:
 *   meta_ads.csv  ┐
 *   google_ads.csv ├──→ parseCsv() → merge() → CampaignRecord[]
 *   ai_agent.csv  ┘
 *   salesforce_crm.csv (enriquece com stage + conversion_value)
 */

import type { CampaignRecord } from "../data/types";

// ─── Utilitários ──────────────────────────────────────────────────────────────

async function fetchCsv(filename: string): Promise<string> {
  const res = await fetch(`/data/${filename}`);
  if (!res.ok) throw new Error(`CSV não encontrado: ${filename}`);
  return res.text();
}

function parseCsv(raw: string): Record<string, string>[] {
  const [headerLine, ...lines] = raw.trim().split("\n");
  const headers = headerLine.split(",").map((h) => h.trim());
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(",");
      return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").trim()]));
    });
}

function num(v: string | undefined, fallback = 0): number {
  const n = parseFloat(v ?? "");
  return isNaN(n) ? fallback : n;
}

function int(v: string | undefined, fallback = 0): number {
  const n = parseInt(v ?? "", 10);
  return isNaN(n) ? fallback : n;
}

// ─── Chave de join: date + campaign_name ──────────────────────────────────────
function joinKey(row: Record<string, string>): string {
  return `${row.date}::${(row.campaign_name ?? "").trim()}`;
}

// ─── Loader principal ─────────────────────────────────────────────────────────
export async function loadCsvData(): Promise<CampaignRecord[]> {
  const [metaRaw, googleRaw, aiRaw, crmRaw] = await Promise.all([
    fetchCsv("meta_ads.csv"),
    fetchCsv("google_ads.csv"),
    fetchCsv("ai_agent.csv"),
    fetchCsv("salesforce_crm.csv"),
  ]);

  const metaRows    = parseCsv(metaRaw);
  const googleRows  = parseCsv(googleRaw);
  const aiRows      = parseCsv(aiRaw);
  const crmRows     = parseCsv(crmRaw);

  // Índices para join rápido
  const aiIndex  = new Map(aiRows.map((r)  => [joinKey(r), r]));
  const crmIndex = new Map(crmRows.map((r) => [joinKey(r), r]));

  const records: CampaignRecord[] = [];

  // ── Meta Ads ──
  for (const row of metaRows) {
    const key = joinKey(row);
    const ai  = aiIndex.get(key)  ?? {};
    const crm = crmIndex.get(key) ?? {};

    const leadsRaw  = int(ai["leads_raw"]);
    const posP      = num(ai["sentiment_positive_pct"]);
    const neuP      = num(ai["sentiment_neutral_pct"]);
    const negP      = num(ai["sentiment_negative_pct"]);

    records.push({
      product_id:              row.product_id ?? "outros",
      product_label:           row.product_id ?? "Outros",
      campaign_name:           row.campaign_name ?? "",
      campaign_id:             row.campaign_id,
      source:                  "meta_ads",
      date:                    row.date,
      ad_spend:                num(row.spend),
      impressions:             int(row.impressions),
      clicks:                  int(row.clicks),
      reach:                   int(row.reach),
      leads_raw:               leadsRaw,
      ai_leads_responded:      int(ai["ai_leads_responded"]),
      leads_qualified_by_ai:   int(ai["leads_qualified_by_ai"]),
      ai_overflow_count:       int(ai["ai_overflow_count"]),
      ai_avg_response_minutes: num(ai["ai_avg_response_minutes"]),
      sentiment_positive:      posP,
      sentiment_neutral:       neuP,
      sentiment_negative:      negP,
      lead_profile_breakdown: {
        "Gestor Atuante":  num(ai["profile_gestor_atuante_pct"]),
        "Quer Começar":    num(ai["profile_quer_comecar_pct"]),
        "Não Trabalha":    num(ai["profile_nao_trabalha_pct"]),
        "No de Negócio":   num(ai["profile_no_negocio_pct"]),
      },
      conversion_value:               num(crm["conversion_value_brl"]),
      crm_stage:                      crm["crm_stage"],
      interest_extended_warranty:     num(crm["interest_extended_warranty_pct"]),
      interest_ink_recurrence:        num(crm["interest_ink_recurrence_pct"]),
      currency:                       "BRL",
    });
  }

  // ── Google Ads ──
  for (const row of googleRows) {
    const key = joinKey(row);
    const ai  = aiIndex.get(key)  ?? {};
    const crm = crmIndex.get(key) ?? {};

    const leadsRaw = int(ai["leads_raw"]) || int(row.conversions);
    const posP     = num(ai["sentiment_positive_pct"]);
    const neuP     = num(ai["sentiment_neutral_pct"]);
    const negP     = num(ai["sentiment_negative_pct"]);

    records.push({
      product_id:              row.product_id ?? "outros",
      product_label:           row.product_id ?? "Outros",
      campaign_name:           row.campaign_name ?? "",
      campaign_id:             row.campaign_id,
      source:                  "google_ads",
      date:                    row.date,
      ad_spend:                num(row.spend),
      impressions:             int(row.impressions),
      clicks:                  int(row.clicks),
      reach:                   int(row.impressions), // Google não tem "reach" nativo
      leads_raw:               leadsRaw,
      ai_leads_responded:      int(ai["ai_leads_responded"]) || leadsRaw,
      leads_qualified_by_ai:   int(ai["leads_qualified_by_ai"]),
      ai_overflow_count:       int(ai["ai_overflow_count"]),
      ai_avg_response_minutes: num(ai["ai_avg_response_minutes"]),
      sentiment_positive:      posP,
      sentiment_neutral:       neuP,
      sentiment_negative:      negP,
      lead_profile_breakdown: {
        "Gestor Atuante": num(ai["profile_gestor_atuante_pct"]),
        "Quer Começar":   num(ai["profile_quer_comecar_pct"]),
        "Não Trabalha":   num(ai["profile_nao_trabalha_pct"]),
        "No de Negócio":  num(ai["profile_no_negocio_pct"]),
      },
      conversion_value:               num(crm["conversion_value_brl"]) || num(row.conversion_value_brl),
      crm_stage:                      crm["crm_stage"],
      interest_extended_warranty:     num(crm["interest_extended_warranty_pct"]),
      interest_ink_recurrence:        num(crm["interest_ink_recurrence_pct"]),
      currency:                       "BRL",
    });
  }

  return records;
}
