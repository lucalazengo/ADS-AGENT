"""
Mock Data Generator — ADS-AGENT
Gera dados realistas para desenvolvimento e demonstração.
Uso: python dashboard/data/mock_data.py
"""

import json
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(42)

PRODUCTS = {
    "epson_g6070": {
        "label": "Epson G6070",
        "campaigns": [
            "[EPSON] Conversão - Fundo de Funil",
            "[EPSON] Consideração - Vídeo",
            "[EPSON] Remarketing - Carrinho",
        ],
        "base_spend": 244,
        "base_ctr": 2.51,
        "base_cpm": 15.38,
        "base_leads": 262,
        "base_qualify_rate": 0.60,
        "base_conv_value": 18500,
        "sources": ["meta_ads", "google_ads"],
    },
    "ppf": {
        "label": "PPF (Protection Film)",
        "campaigns": [
            "[PPF] Conversão - Leads Frios",
            "[PPF] Tráfego - Blog",
        ],
        "base_spend": 96,
        "base_ctr": 1.74,
        "base_cpm": 19.87,
        "base_leads": 85,
        "base_qualify_rate": 0.45,
        "base_conv_value": 7200,
        "sources": ["meta_ads"],
    },
}

PROFILES = ["Gestor Atuante", "Quer Começar", "Não Trabalha", "No de Negócio", "Outro"]


def jitter(value: float, pct: float = 0.25) -> float:
    """Aplica variação aleatória de ±pct% ao valor."""
    return max(0, value * (1 + random.uniform(-pct, pct)))


def generate_records(days: int = 30) -> list[dict]:
    records = []
    today = date.today()

    for day_offset in range(days):
        d = today - timedelta(days=days - day_offset - 1)
        date_str = d.isoformat()

        for product_id, cfg in PRODUCTS.items():
            for campaign in cfg["campaigns"]:
                source = random.choice(cfg["sources"])

                spend = round(jitter(cfg["base_spend"] / len(cfg["campaigns"])), 2)
                impressions = int(jitter(spend / (cfg["base_cpm"] / 1000)))
                clicks = int(impressions * (cfg["base_ctr"] / 100) * jitter(1.0, 0.3))
                leads_raw = int(jitter(cfg["base_leads"] / len(cfg["campaigns"]) / 30 * 7))
                leads_responded = int(leads_raw * jitter(0.985, 0.01))
                leads_qualified = int(leads_raw * jitter(cfg["base_qualify_rate"], 0.2))
                overflow = int(leads_responded * jitter(0.12, 0.3))
                conv_value = round(jitter(cfg["base_conv_value"] / len(cfg["campaigns"]) / 30 * 7), 2)

                # Sentimento
                pos = round(jitter(60, 0.15), 1)
                neg = round(jitter(10, 0.3), 1)
                neu = round(100 - pos - neg, 1)

                # Perfil de lead
                raw_profile = [jitter(58, 0.2), jitter(14, 0.3), jitter(10, 0.3), jitter(18, 0.2)]
                total_p = sum(raw_profile)
                profile = {p: round(v / total_p * 100, 1) for p, v in zip(PROFILES[:4], raw_profile)}

                records.append({
                    "product_id": product_id,
                    "product_label": cfg["label"],
                    "campaign_name": campaign,
                    "source": source,
                    "date": date_str,
                    "ad_spend": spend,
                    "impressions": max(impressions, 1),
                    "clicks": max(clicks, 0),
                    "reach": int(impressions * 0.85),
                    "leads_raw": max(leads_raw, 1),
                    "ai_leads_responded": max(min(leads_responded, leads_raw), 0),
                    "leads_qualified_by_ai": max(min(leads_qualified, leads_raw), 0),
                    "ai_overflow_count": max(overflow, 0),
                    "ai_avg_response_minutes": round(jitter(1.8, 0.4), 1),
                    "sentiment_positive": pos,
                    "sentiment_neutral": max(neu, 0),
                    "sentiment_negative": neg,
                    "lead_profile_breakdown": profile,
                    "conversion_value": conv_value,
                    "crm_stage": random.choice(["Primeiro Contato", "Proposta Enviada", "Negociação", "Fechado"]),
                    "interest_extended_warranty": round(jitter(35, 0.3), 1),
                    "interest_ink_recurrence": round(jitter(48, 0.25), 1),
                    "currency": "BRL",
                })

    return records


def save_mock_data(output_path: str = "dashboard/data/store.json", days: int = 30) -> None:
    records = generate_records(days)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    print(f"Gerados {len(records)} registros mock em '{output_path}'.")


if __name__ == "__main__":
    save_mock_data()
