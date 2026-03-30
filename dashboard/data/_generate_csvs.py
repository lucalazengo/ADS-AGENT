"""
Gerador de CSVs de amostra — ADS-AGENT
Execute uma vez para popular as planilhas de dados:
    python dashboard/data/_generate_csvs.py
"""

import csv
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(42)
OUT = Path(__file__).parent


def jitter(val: float, pct: float = 0.20) -> float:
    return max(0.0, val * (1 + random.uniform(-pct, pct)))


def r2(v: float) -> float:
    return round(v, 2)


def ri(v: float) -> int:
    return max(0, int(round(v)))


START = date(2026, 2, 26)
DAYS = 30
DATES = [START + timedelta(days=i) for i in range(DAYS)]

# ──────────────────────────────────────────────────────────────────────────────
# Configurações por campanha
# ──────────────────────────────────────────────────────────────────────────────
META_CAMPAIGNS = [
    # (campaign_id, campaign_name, adset_name, ad_name, product_id, spend/day, cpm, ctr)
    ("23851001", "[EPSON] Conversão - Fundo de Funil", "Público Quente - Retargeting", "Ad_FdF_Video30s", "epson_g6070", 85.0, 15.20, 2.55),
    ("23851002", "[EPSON] Consideração - Vídeo",       "Interesse em Impressão",        "Ad_Video_15s",   "epson_g6070", 82.0, 16.10, 2.40),
    ("23851003", "[EPSON] Remarketing - Carrinho",     "Visitantes do Site",            "Ad_Remarket_Img","epson_g6070", 78.0, 14.80, 2.65),
    ("23852001", "[PPF] Conversão - Leads Frios",      "Gestores - Lookalike 2%",       "Ad_PPF_Conv1",   "ppf",         50.0, 20.10, 1.80),
    ("23852002", "[PPF] Tráfego - Blog",               "Interesse em Proteção",         "Ad_PPF_Blog",    "ppf",         46.0, 19.60, 1.70),
]

GOOGLE_CAMPAIGNS = [
    # (campaign_id, campaign_name, ad_group_name, product_id, spend/day, cpm, ctr)
    ("9001001", "[EPSON] Search - Marca",        "Epson G6070 - Exact",   "epson_g6070", 40.0, 12.50, 3.10),
    ("9001002", "[EPSON] Search - Concorrente",  "Impressoras A3 - Broad","epson_g6070", 38.0, 13.20, 2.85),
]

AI_LEADS_CONFIG = [
    # (campaign_name, product_id, source, leads/day, qualify_rate, overflow_rate, avg_resp)
    ("[EPSON] Conversão - Fundo de Funil", "epson_g6070", "meta_ads",   22, 0.62, 0.11, 1.7),
    ("[EPSON] Consideração - Vídeo",       "epson_g6070", "meta_ads",   18, 0.58, 0.13, 1.9),
    ("[EPSON] Remarketing - Carrinho",     "epson_g6070", "meta_ads",   20, 0.65, 0.10, 1.6),
    ("[EPSON] Search - Marca",             "epson_g6070", "google_ads", 14, 0.70, 0.09, 1.4),
    ("[EPSON] Search - Concorrente",       "epson_g6070", "google_ads", 11, 0.55, 0.14, 2.1),
    ("[PPF] Conversão - Leads Frios",      "ppf",         "meta_ads",   22, 0.46, 0.18, 2.3),
    ("[PPF] Tráfego - Blog",               "ppf",         "meta_ads",   20, 0.43, 0.20, 2.5),
]

CRM_CONFIG = [
    # (campaign_name, product_id, base_conv_value/day, warranty_pct, recurrence_pct)
    ("[EPSON] Conversão - Fundo de Funil", "epson_g6070", 2100, 38.0, 52.0),
    ("[EPSON] Consideração - Vídeo",       "epson_g6070", 1800, 32.0, 47.0),
    ("[EPSON] Remarketing - Carrinho",     "epson_g6070", 1950, 35.0, 50.0),
    ("[EPSON] Search - Marca",             "epson_g6070", 1600, 40.0, 55.0),
    ("[EPSON] Search - Concorrente",       "epson_g6070", 1200, 28.0, 44.0),
    ("[PPF] Conversão - Leads Frios",      "ppf",          750, 22.0, 18.0),
    ("[PPF] Tráfego - Blog",               "ppf",          680, 20.0, 16.0),
]

CRM_STAGES = ["Primeiro Contato", "Proposta Enviada", "Negociação", "Fechado"]

# ──────────────────────────────────────────────────────────────────────────────
# 1. meta_ads.csv
# ──────────────────────────────────────────────────────────────────────────────
meta_rows = []
for d in DATES:
    for cid, cname, adset, ad, pid, spend_base, cpm_base, ctr_base in META_CAMPAIGNS:
        spend = r2(jitter(spend_base))
        cpm   = r2(jitter(cpm_base))
        impressions = ri(spend / (cpm / 1000))
        ctr   = r2(jitter(ctr_base))
        clicks = ri(impressions * ctr / 100)
        reach = ri(impressions * 0.85)
        cpc   = r2(spend / clicks) if clicks > 0 else 0.0
        freq  = r2(jitter(1.35, 0.10))
        meta_rows.append({
            "date":          d.isoformat(),
            "campaign_id":   cid,
            "campaign_name": cname,
            "adset_name":    adset,
            "ad_name":       ad,
            "product_id":    pid,
            "spend":         spend,
            "impressions":   impressions,
            "clicks":        clicks,
            "reach":         reach,
            "ctr_pct":       ctr,
            "cpc_brl":       cpc,
            "cpm_brl":       cpm,
            "frequency":     freq,
        })

with open(OUT / "meta_ads.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=meta_rows[0].keys())
    w.writeheader()
    w.writerows(meta_rows)

print(f"meta_ads.csv — {len(meta_rows)} linhas")

# ──────────────────────────────────────────────────────────────────────────────
# 2. google_ads.csv
# ──────────────────────────────────────────────────────────────────────────────
google_rows = []
for d in DATES:
    for cid, cname, adgroup, pid, spend_base, cpm_base, ctr_base in GOOGLE_CAMPAIGNS:
        spend = r2(jitter(spend_base))
        cpm   = r2(jitter(cpm_base))
        impressions = ri(spend / (cpm / 1000))
        ctr   = r2(jitter(ctr_base))
        clicks = ri(impressions * ctr / 100)
        cpc    = r2(spend / clicks) if clicks > 0 else 0.0
        # Google tracks conversions natively
        conversions = ri(clicks * jitter(0.04, 0.30))
        conv_value  = r2(conversions * jitter(850, 0.25))
        quality_score = ri(jitter(7.5, 0.15))
        google_rows.append({
            "date":            d.isoformat(),
            "campaign_id":     cid,
            "campaign_name":   cname,
            "ad_group_name":   adgroup,
            "product_id":      pid,
            "spend":           spend,
            "impressions":     impressions,
            "clicks":          clicks,
            "ctr_pct":         ctr,
            "cpc_brl":         cpc,
            "cpm_brl":         cpm,
            "quality_score":   min(10, quality_score),
            "conversions":     conversions,
            "conversion_value_brl": conv_value,
        })

with open(OUT / "google_ads.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=google_rows[0].keys())
    w.writeheader()
    w.writerows(google_rows)

print(f"google_ads.csv — {len(google_rows)} linhas")

# ──────────────────────────────────────────────────────────────────────────────
# 3. ai_agent.csv  (exportado pelo n8n / sistema de atendimento)
# ──────────────────────────────────────────────────────────────────────────────
ai_rows = []
PROFILES = ["Gestor Atuante", "Quer Começar", "Não Trabalha", "No de Negócio"]

for d in DATES:
    for cname, pid, src, leads_base, qual_rate, overflow_rate, avg_resp in AI_LEADS_CONFIG:
        leads_raw   = max(1, ri(jitter(leads_base)))
        responded   = max(0, min(leads_raw, ri(leads_raw * jitter(0.985, 0.01))))
        qualified   = max(0, min(leads_raw, ri(leads_raw * jitter(qual_rate, 0.15))))
        overflow    = max(0, ri(responded * jitter(overflow_rate, 0.25)))
        resp_time   = r2(jitter(avg_resp, 0.30))

        pos = r2(jitter(62, 0.12))
        neg = r2(jitter(9,  0.25))
        neu = r2(max(0, 100 - pos - neg))

        raw_p = [jitter(56, 0.18), jitter(15, 0.28), jitter(11, 0.28), jitter(18, 0.18)]
        tot_p = sum(raw_p)
        profiles = {p: r2(v / tot_p * 100) for p, v in zip(PROFILES, raw_p)}

        ai_rows.append({
            "date":                        d.isoformat(),
            "campaign_name":               cname,
            "product_id":                  pid,
            "source":                      src,
            "leads_raw":                   leads_raw,
            "ai_leads_responded":          responded,
            "leads_qualified_by_ai":       qualified,
            "ai_overflow_count":           overflow,
            "ai_avg_response_minutes":     resp_time,
            "sentiment_positive_pct":      pos,
            "sentiment_neutral_pct":       neu,
            "sentiment_negative_pct":      neg,
            "profile_gestor_atuante_pct":  profiles["Gestor Atuante"],
            "profile_quer_comecar_pct":    profiles["Quer Começar"],
            "profile_nao_trabalha_pct":    profiles["Não Trabalha"],
            "profile_no_negocio_pct":      profiles["No de Negócio"],
        })

with open(OUT / "ai_agent.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=ai_rows[0].keys())
    w.writeheader()
    w.writerows(ai_rows)

print(f"ai_agent.csv — {len(ai_rows)} linhas")

# ──────────────────────────────────────────────────────────────────────────────
# 4. salesforce_crm.csv
# ──────────────────────────────────────────────────────────────────────────────
crm_rows = []
for d in DATES:
    for cname, pid, conv_base, warranty_base, recurrence_base in CRM_CONFIG:
        conv_value  = r2(jitter(conv_base))
        warranty    = r2(jitter(warranty_base, 0.20))
        recurrence  = r2(jitter(recurrence_base, 0.20))
        stage = random.choice(CRM_STAGES)
        crm_rows.append({
            "date":                         d.isoformat(),
            "campaign_name":                cname,
            "product_id":                   pid,
            "crm_stage":                    stage,
            "conversion_value_brl":         conv_value,
            "interest_extended_warranty_pct": warranty,
            "interest_ink_recurrence_pct":    recurrence,
        })

with open(OUT / "salesforce_crm.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=crm_rows[0].keys())
    w.writeheader()
    w.writerows(crm_rows)

print(f"salesforce_crm.csv — {len(crm_rows)} linhas")
print("Planilhas geradas com sucesso em dashboard/data/")
