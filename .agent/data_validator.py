"""
Data Validator — ADS-AGENT
Valida payloads JSON do n8n contra o schema oficial.
Uso: python .agent/data_validator.py --file <caminho_do_json>
"""

import json
import argparse
import sys
from pathlib import Path

REQUIRED_FIELDS = {
    "product_id":             str,
    "campaign_name":          str,
    "source":                 str,
    "ad_spend":               (int, float),
    "leads_raw":              int,
    "leads_qualified_by_ai":  int,
    "conversion_value":       (int, float),
}

OPTIONAL_FIELDS = {
    "product_label":            str,
    "date":                     str,
    "campaign_id":              str,
    "ad_set_name":              str,
    "creative_id":              str,
    "impressions":              int,
    "clicks":                   int,
    "reach":                    int,
    "ai_leads_responded":       int,
    "ai_overflow_count":        int,
    "ai_avg_response_minutes":  (int, float),
    "sentiment_positive":       (int, float),
    "sentiment_neutral":        (int, float),
    "sentiment_negative":       (int, float),
    "lead_profile_breakdown":   dict,
    "crm_opportunity_id":       str,
    "crm_stage":                str,
    "interest_extended_warranty": (int, float),
    "interest_ink_recurrence":  (int, float),
    "currency":                 str,
    "metadata":                 dict,
}

VALID_SOURCES = {"meta_ads", "google_ads", "organic", "referral", "manual"}


def validate_record(record: dict, index: int = 0) -> list[str]:
    errors = []
    prefix = f"[Registro {index}]"

    for field, expected_type in REQUIRED_FIELDS.items():
        if field not in record:
            errors.append(f"{prefix} Campo obrigatório ausente: '{field}'")
        elif not isinstance(record[field], expected_type):
            errors.append(f"{prefix} Tipo inválido para '{field}': esperado {expected_type}, recebido {type(record[field]).__name__}")

    if "source" in record and record["source"] not in VALID_SOURCES:
        errors.append(f"{prefix} 'source' inválido: '{record['source']}'. Valores aceitos: {VALID_SOURCES}")

    if "ad_spend" in record and record.get("ad_spend", 0) < 0:
        errors.append(f"{prefix} 'ad_spend' não pode ser negativo.")

    if "leads_qualified_by_ai" in record and "leads_raw" in record:
        if record["leads_qualified_by_ai"] > record["leads_raw"]:
            errors.append(f"{prefix} 'leads_qualified_by_ai' ({record['leads_qualified_by_ai']}) não pode ser maior que 'leads_raw' ({record['leads_raw']}).")

    for field in record:
        if field not in REQUIRED_FIELDS and field not in OPTIONAL_FIELDS:
            print(f"  ⚠ {prefix} Campo extra desconhecido (ignorado): '{field}'")

    return errors


def validate_file(path: str) -> None:
    filepath = Path(path)
    if not filepath.exists():
        print(f"Erro: arquivo não encontrado: {path}")
        sys.exit(1)

    with open(filepath, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Erro de parsing JSON: {e}")
            sys.exit(1)

    records = data if isinstance(data, list) else [data]
    all_errors = []

    print(f"\nValidando {len(records)} registro(s) em '{path}'...\n")

    for i, record in enumerate(records):
        errors = validate_record(record, i)
        all_errors.extend(errors)

    if all_errors:
        print("FALHOU — erros encontrados:")
        for err in all_errors:
            print(f"  ✗ {err}")
        sys.exit(1)
    else:
        print(f"OK — {len(records)} registro(s) válido(s). Schema compatível com ADS-AGENT.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ADS-AGENT Data Validator")
    parser.add_argument("--file", required=True, help="Caminho para o JSON a validar")
    args = parser.parse_args()
    validate_file(args.file)
