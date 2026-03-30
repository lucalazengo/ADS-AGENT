"""
Data Loader — ADS-AGENT
Lê as planilhas CSV de cada plataforma e combina em um DataFrame unificado
compatível com o schema do dashboard.

Fontes:
    meta_ads.csv      — exportação Meta Ads Manager
    google_ads.csv    — exportação Google Ads
    ai_agent.csv      — exportação do agente de IA (via n8n)
    salesforce_crm.csv — exportação Salesforce CRM
"""

import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).parent

PRODUCT_LABELS = {
    "epson_g6070": "Epson G6070",
    "ppf":         "PPF (Protection Film)",
}


def _load_meta_ads() -> pd.DataFrame:
    path = DATA_DIR / "meta_ads.csv"
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path, parse_dates=["date"])
    # Agrega por dia + campanha (colapsa sets/ads individuais)
    agg = df.groupby(["date", "campaign_name", "product_id"], as_index=False).agg(
        ad_spend=("spend", "sum"),
        impressions=("impressions", "sum"),
        clicks=("clicks", "sum"),
        reach=("reach", "sum"),
    )
    agg["source"] = "meta_ads"
    return agg


def _load_google_ads() -> pd.DataFrame:
    path = DATA_DIR / "google_ads.csv"
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path, parse_dates=["date"])
    agg = df.groupby(["date", "campaign_name", "product_id"], as_index=False).agg(
        ad_spend=("spend", "sum"),
        impressions=("impressions", "sum"),
        clicks=("clicks", "sum"),
    )
    agg["reach"] = (agg["impressions"] * 0.85).round().astype(int)
    agg["source"] = "google_ads"
    return agg


def _load_ai_agent() -> pd.DataFrame:
    path = DATA_DIR / "ai_agent.csv"
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path, parse_dates=["date"])
    df = df.rename(columns={
        "sentiment_positive_pct":      "sentiment_positive",
        "sentiment_neutral_pct":       "sentiment_neutral",
        "sentiment_negative_pct":      "sentiment_negative",
    })
    # Monta lead_profile_breakdown como dict serializado
    profile_cols = [
        "profile_gestor_atuante_pct",
        "profile_quer_comecar_pct",
        "profile_nao_trabalha_pct",
        "profile_no_negocio_pct",
    ]
    profile_names = ["Gestor Atuante", "Quer Começar", "Não Trabalha", "No de Negócio"]

    def make_profile(row):
        return {name: row[col] for name, col in zip(profile_names, profile_cols)}

    df["lead_profile_breakdown"] = df.apply(make_profile, axis=1)
    keep = [
        "date", "campaign_name", "product_id", "source",
        "leads_raw", "ai_leads_responded", "leads_qualified_by_ai",
        "ai_overflow_count", "ai_avg_response_minutes",
        "sentiment_positive", "sentiment_neutral", "sentiment_negative",
        "lead_profile_breakdown",
    ]
    return df[keep]


def _load_salesforce() -> pd.DataFrame:
    path = DATA_DIR / "salesforce_crm.csv"
    if not path.exists():
        return pd.DataFrame()
    df = pd.read_csv(path, parse_dates=["date"])
    df = df.rename(columns={
        "conversion_value_brl":              "conversion_value",
        "interest_extended_warranty_pct":    "interest_extended_warranty",
        "interest_ink_recurrence_pct":       "interest_ink_recurrence",
    })
    return df[["date", "campaign_name", "product_id",
               "crm_stage", "conversion_value",
               "interest_extended_warranty", "interest_ink_recurrence"]]


def load_data() -> pd.DataFrame:
    """
    Carrega e combina todas as fontes CSV em um DataFrame unificado.
    Retorna DataFrame no mesmo schema esperado pelo dashboard.
    """
    meta   = _load_meta_ads()
    google = _load_google_ads()
    ai     = _load_ai_agent()
    crm    = _load_salesforce()

    # ── 1. Combina dados de ads ──────────────────────────────────────────────
    ads = pd.concat([meta, google], ignore_index=True)
    if ads.empty:
        return pd.DataFrame()

    # ── 2. Join com AI Agent ─────────────────────────────────────────────────
    merge_keys = ["date", "campaign_name", "product_id"]
    if not ai.empty:
        # ai_agent tem coluna "source" — usa para enriquecer, mas o join é por
        # campanha+data+produto (source pode diferir entre ads e ai se o mesmo
        # lead veio de fontes distintas no mesmo dia; aceita-se o do ads)
        ai_no_src = ai.drop(columns=["source"], errors="ignore")
        df = ads.merge(ai_no_src, on=merge_keys, how="left")
    else:
        df = ads.copy()
        for col in ["leads_raw", "ai_leads_responded", "leads_qualified_by_ai",
                    "ai_overflow_count", "ai_avg_response_minutes",
                    "sentiment_positive", "sentiment_neutral", "sentiment_negative",
                    "lead_profile_breakdown"]:
            df[col] = None

    # ── 3. Join com Salesforce CRM ───────────────────────────────────────────
    if not crm.empty:
        df = df.merge(crm, on=merge_keys, how="left")
    else:
        df["crm_stage"] = None
        df["conversion_value"] = 0.0
        df["interest_extended_warranty"] = 0.0
        df["interest_ink_recurrence"] = 0.0

    # ── 4. Campos derivados e limpeza ────────────────────────────────────────
    df["product_label"] = df["product_id"].map(PRODUCT_LABELS).fillna(df["product_id"])
    df["currency"] = "BRL"
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

    # Preenche NaN numéricos com 0
    num_cols = [
        "ad_spend", "impressions", "clicks", "reach",
        "leads_raw", "ai_leads_responded", "leads_qualified_by_ai",
        "ai_overflow_count", "ai_avg_response_minutes",
        "sentiment_positive", "sentiment_neutral", "sentiment_negative",
        "conversion_value", "interest_extended_warranty", "interest_ink_recurrence",
    ]
    for col in num_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # lead_profile_breakdown: substitui NaN por dict vazio
    if "lead_profile_breakdown" in df.columns:
        df["lead_profile_breakdown"] = df["lead_profile_breakdown"].apply(
            lambda x: x if isinstance(x, dict) else {}
        )

    # crm_stage: fallback
    if "crm_stage" in df.columns:
        df["crm_stage"] = df["crm_stage"].fillna("Primeiro Contato")

    return df.reset_index(drop=True)


if __name__ == "__main__":
    df = load_data()
    print(f"Total de registros carregados: {len(df)}")
    print(f"Colunas: {list(df.columns)}")
    print(df.head(3).to_string())
