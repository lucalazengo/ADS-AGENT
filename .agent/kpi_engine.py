"""
KPI Engine — ADS-AGENT
Calcula e avalia todos os KPIs de performance de anúncios e IA.
Uso: python .agent/kpi_engine.py --input dashboard/data/store.json
"""

import json
import argparse
from typing import Any


# ─── Benchmarks padrão (sobrescritos por config/settings.py em produção) ──────
DEFAULT_BENCHMARKS = {
    "ctr_ok": 2.0,       "ctr_alert": 1.0,
    "cpc_ok": 2.50,      "cpc_alert": 5.00,
    "cpl_ok": 20.0,      "cpl_alert": 35.0,
    "cpm_ok": 20.0,      "cpm_alert": 40.0,
    "roas_ok": 4.0,      "roas_alert": 2.0,
    "ai_retention_ok": 85.0,   "ai_retention_alert": 65.0,
    "ai_overflow_ok": 20.0,    "ai_overflow_alert": 40.0,
    "ai_qualify_ok": 60.0,     "ai_qualify_alert": 35.0,
}

PRODUCT_BENCHMARKS: dict[str, dict] = {
    "epson_g6070": {"cpl_ok": 35.0, "cpl_alert": 50.0, "roas_ok": 3.0, "roas_alert": 1.5},
    "ppf":         {"cpl_ok": 20.0, "cpl_alert": 30.0, "roas_ok": 5.0, "roas_alert": 3.0},
}


def get_benchmarks(product_id: str) -> dict:
    base = DEFAULT_BENCHMARKS.copy()
    if product_id in PRODUCT_BENCHMARKS:
        base.update(PRODUCT_BENCHMARKS[product_id])
    return base


def status(value: float, ok_threshold: float, alert_threshold: float, lower_is_better: bool = False) -> str:
    """Retorna 'ok', 'warning' ou 'critical' baseado nos thresholds."""
    if lower_is_better:
        if value <= ok_threshold:
            return "ok"
        elif value <= alert_threshold:
            return "warning"
        else:
            return "critical"
    else:
        if value >= ok_threshold:
            return "ok"
        elif value >= alert_threshold:
            return "warning"
        else:
            return "critical"


def calculate_ads_kpis(record: dict, bm: dict) -> dict:
    spend = record.get("ad_spend", 0)
    impressions = record.get("impressions", 0)
    clicks = record.get("clicks", 0)
    leads_raw = record.get("leads_raw", 0)
    conversion_value = record.get("conversion_value", 0)

    ctr = (clicks / impressions * 100) if impressions > 0 else 0
    cpc = (spend / clicks) if clicks > 0 else 0
    cpl = (spend / leads_raw) if leads_raw > 0 else 0
    cpm = (spend / impressions * 1000) if impressions > 0 else 0
    roas = (conversion_value / spend) if spend > 0 else 0

    return {
        "ctr":  {"value": round(ctr, 2),  "unit": "%",    "status": status(ctr, bm["ctr_ok"], bm["ctr_alert"])},
        "cpc":  {"value": round(cpc, 2),  "unit": "R$",   "status": status(cpc, bm["cpc_ok"], bm["cpc_alert"], lower_is_better=True)},
        "cpl":  {"value": round(cpl, 2),  "unit": "R$",   "status": status(cpl, bm["cpl_ok"], bm["cpl_alert"], lower_is_better=True)},
        "cpm":  {"value": round(cpm, 2),  "unit": "R$",   "status": status(cpm, bm["cpm_ok"], bm["cpm_alert"], lower_is_better=True)},
        "roas": {"value": round(roas, 2), "unit": "x",    "status": status(roas, bm["roas_ok"], bm["roas_alert"])},
        "spend": {"value": round(spend, 2), "unit": "R$", "status": "info"},
    }


def calculate_ai_kpis(record: dict, bm: dict) -> dict:
    leads_raw = record.get("leads_raw", 0)
    leads_responded = record.get("ai_leads_responded", 0)
    leads_qualified = record.get("leads_qualified_by_ai", 0)
    overflows = record.get("ai_overflow_count", 0)
    avg_response_min = record.get("ai_avg_response_minutes", 0)

    retention = (leads_responded / leads_raw * 100) if leads_raw > 0 else 0
    qualify_rate = (leads_qualified / leads_raw * 100) if leads_raw > 0 else 0
    overflow_rate = (overflows / leads_responded * 100) if leads_responded > 0 else 0

    return {
        "ai_retention":     {"value": round(retention, 1),    "unit": "%",   "status": status(retention, bm["ai_retention_ok"], bm["ai_retention_alert"])},
        "ai_qualify_rate":  {"value": round(qualify_rate, 1), "unit": "%",   "status": status(qualify_rate, bm["ai_qualify_ok"], bm["ai_qualify_alert"])},
        "ai_overflow_rate": {"value": round(overflow_rate, 1),"unit": "%",   "status": status(overflow_rate, bm["ai_overflow_ok"], bm["ai_overflow_alert"], lower_is_better=True)},
        "ai_avg_response":  {"value": round(avg_response_min, 1), "unit": "min", "status": "info"},
    }


def process_record(record: dict) -> dict:
    product_id = record.get("product_id", "default")
    bm = get_benchmarks(product_id)
    ads = calculate_ads_kpis(record, bm)
    ai = calculate_ai_kpis(record, bm)

    # Score geral (0-100)
    statuses = [v["status"] for v in {**ads, **ai}.values() if v["status"] in ("ok", "warning", "critical")]
    score = (statuses.count("ok") * 100 + statuses.count("warning") * 50) / max(len(statuses), 1)

    return {
        "product_id": product_id,
        "campaign_name": record.get("campaign_name", ""),
        "date": record.get("date", ""),
        "ads_kpis": ads,
        "ai_kpis": ai,
        "overall_score": round(score, 1),
        "recommendation": _generate_recommendation(ads, ai),
    }


def _generate_recommendation(ads: dict, ai: dict) -> str:
    criticals = [k for k, v in {**ads, **ai}.items() if v.get("status") == "critical"]
    warnings = [k for k, v in {**ads, **ai}.items() if v.get("status") == "warning"]

    if "cpl" in criticals or "roas" in criticals:
        return "PAUSAR: CPL ou ROAS críticos — revisar criativos e segmentação urgentemente."
    if "ai_retention" in criticals:
        return "REVISAR IA: Taxa de retenção crítica — leads abandonando o funil de atendimento."
    if len(criticals) >= 2:
        return f"ATENÇÃO: {len(criticals)} KPIs críticos ({', '.join(criticals)}) — avaliar pausa da campanha."
    if warnings:
        return f"MONITORAR: {', '.join(warnings)} em estado de alerta — ajuste fino recomendado."
    return "ESCALAR: Performance dentro dos benchmarks — considerar aumentar orçamento."


def run(input_path: str) -> None:
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    records = data if isinstance(data, list) else [data]
    results = [process_record(r) for r in records]

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ADS-AGENT KPI Engine")
    parser.add_argument("--input", required=True, help="Caminho para o JSON de dados")
    args = parser.parse_args()
    run(args.input)
