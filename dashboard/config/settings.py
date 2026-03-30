"""
Configurações globais do ADS-AGENT Dashboard.
Edite este arquivo para ajustar benchmarks, cores e parâmetros.
"""

# ─── Paleta de Cores ──────────────────────────────────────────────────────────
COLORS = {
    "bg_primary":    "#F8FAFC",
    "bg_card":       "#FFFFFF",
    "bg_sidebar":    "#EBF4FF",
    "blue_primary":  "#2D7DD2",
    "blue_medium":   "#4A9EDF",
    "blue_light":    "#B3D4F5",
    "blue_dark":     "#1A5CA8",
    "blue_subtle":   "#E8F4FD",
    "accent_green":  "#27AE60",
    "accent_red":    "#E74C3C",
    "accent_orange": "#F39C12",
    "accent_yellow": "#F1C40F",
    "text_primary":  "#1A202C",
    "text_secondary":"#718096",
    "text_muted":    "#A0AEC0",
    "border":        "#E2E8F0",
    "border_light":  "#F0F4F8",
    "shadow":        "rgba(45, 125, 210, 0.08)",
}

# ─── Benchmarks por produto ───────────────────────────────────────────────────
# lower_is_better = True  → KPI bom quando BAIXO (CPL, CPC, CPM, overflow)
# lower_is_better = False → KPI bom quando ALTO  (CTR, ROAS, retenção)

BENCHMARKS = {
    "default": {
        "ctr":              {"ok": 2.0,   "alert": 1.0,   "lower_is_better": False, "unit": "%"},
        "cpc":              {"ok": 2.50,  "alert": 5.00,  "lower_is_better": True,  "unit": "R$"},
        "cpl":              {"ok": 20.0,  "alert": 35.0,  "lower_is_better": True,  "unit": "R$"},
        "cpm":              {"ok": 20.0,  "alert": 40.0,  "lower_is_better": True,  "unit": "R$"},
        "roas":             {"ok": 4.0,   "alert": 2.0,   "lower_is_better": False, "unit": "x"},
        "ai_retention":     {"ok": 85.0,  "alert": 65.0,  "lower_is_better": False, "unit": "%"},
        "ai_qualify_rate":  {"ok": 60.0,  "alert": 35.0,  "lower_is_better": False, "unit": "%"},
        "ai_overflow_rate": {"ok": 20.0,  "alert": 40.0,  "lower_is_better": True,  "unit": "%"},
    },
    "epson_g6070": {
        "cpl":  {"ok": 35.0,  "alert": 55.0,  "lower_is_better": True,  "unit": "R$"},
        "roas": {"ok": 3.0,   "alert": 1.5,   "lower_is_better": False, "unit": "x"},
    },
    "ppf": {
        "cpl":  {"ok": 18.0,  "alert": 28.0,  "lower_is_better": True,  "unit": "R$"},
        "roas": {"ok": 5.0,   "alert": 3.0,   "lower_is_better": False, "unit": "x"},
        "ctr":  {"ok": 2.5,   "alert": 1.2,   "lower_is_better": False, "unit": "%"},
    },
}


def get_benchmark(product_id: str, kpi: str) -> dict:
    """Retorna o benchmark de um KPI para o produto, com fallback para 'default'."""
    product_bm = BENCHMARKS.get(product_id, {})
    default_bm = BENCHMARKS["default"]
    return product_bm.get(kpi, default_bm.get(kpi, {}))


# ─── Labels amigáveis para KPIs ──────────────────────────────────────────────
KPI_LABELS = {
    "ctr":              "CTR",
    "cpc":              "CPC",
    "cpl":              "CPL",
    "cpm":              "CPM",
    "roas":             "ROAS",
    "ad_spend":         "Valor Gasto",
    "impressions":      "Impressões",
    "clicks":           "Cliques",
    "reach":            "Alcance",
    "leads_raw":        "Leads Brutos",
    "leads_qualified":  "Leads Qualificados",
    "conversion_value": "Valor Convertido",
    "ai_retention":     "Retenção IA",
    "ai_qualify_rate":  "Taxa Qualificação IA",
    "ai_overflow_rate": "Taxa Transbordo",
    "ai_avg_response":  "Tempo Médio Resposta",
}

# ─── Configuração de períodos padrão ─────────────────────────────────────────
DEFAULT_PERIOD_DAYS = 7
AVAILABLE_PERIODS = [1, 7, 14, 30, 90]

# ─── Configuração do servidor (usado em produção) ────────────────────────────
API_PORT = 8501
DATA_STORE_PATH = "dashboard/data/store.json"
