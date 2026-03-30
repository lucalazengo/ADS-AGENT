"""
KPI Cards — ADS-AGENT Dashboard
Cards com métricas principais e sistema de alerta de sangria.
"""

import streamlit as st
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2]))
from dashboard.config.settings import COLORS, get_benchmark


def _status_color(status: str) -> str:
    return {
        "ok":       COLORS["accent_green"],
        "warning":  COLORS["accent_orange"],
        "critical": COLORS["accent_red"],
        "info":     COLORS["blue_primary"],
    }.get(status, COLORS["text_secondary"])


def _status_icon(status: str) -> str:
    return {"ok": "▲", "warning": "◆", "critical": "▼", "info": "●"}.get(status, "●")


def _get_status(value: float, bm: dict) -> str:
    if not bm:
        return "info"
    ok, alert, lib = bm.get("ok", 0), bm.get("alert", 0), bm.get("lower_is_better", False)
    if lib:
        return "ok" if value <= ok else ("warning" if value <= alert else "critical")
    else:
        return "ok" if value >= ok else ("warning" if value >= alert else "critical")


def render_kpi_card(label: str, value: str, delta: str = None, status: str = "info",
                    unit_prefix: str = "", unit_suffix: str = "", help_text: str = None) -> None:
    color = _status_color(status)
    icon = _status_icon(status)
    delta_html = ""
    if delta:
        delta_color = COLORS["accent_green"] if "+" in str(delta) else COLORS["accent_red"]
        delta_html = f'<div style="font-size:0.75rem; color:{delta_color}; margin-top:2px;">{delta}</div>'

    help_html = f'<div style="font-size:0.7rem; color:{COLORS["text_muted"]}; margin-top:4px;">{help_text}</div>' if help_text else ""

    st.markdown(f"""
    <div style="
        background:{COLORS['bg_card']};
        border:1px solid {COLORS['border']};
        border-top: 3px solid {color};
        border-radius:10px;
        padding:16px 18px;
        box-shadow: 0 2px 8px {COLORS['shadow']};
        min-height: 110px;
    ">
        <div style="font-size:0.72rem; font-weight:600; color:{COLORS['text_secondary']};
                    text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">
            {icon} {label}
        </div>
        <div style="font-size:1.65rem; font-weight:700; color:{COLORS['text_primary']}; line-height:1.1;">
            {unit_prefix}{value}{unit_suffix}
        </div>
        {delta_html}
        {help_html}
    </div>
    """, unsafe_allow_html=True)


def render_ads_kpi_row(metrics: dict, product_id: str = "default") -> None:
    """Renderiza a linha principal de KPIs de Ads."""
    spend = metrics.get("ad_spend", 0)
    impressions = metrics.get("impressions", 1)
    clicks = metrics.get("clicks", 0)
    leads = metrics.get("leads_raw", 0)
    conv_value = metrics.get("conversion_value", 0)

    ctr  = clicks / impressions * 100 if impressions > 0 else 0
    cpc  = spend / clicks if clicks > 0 else 0
    cpl  = spend / leads if leads > 0 else 0
    cpm  = spend / impressions * 1000 if impressions > 0 else 0
    roas = conv_value / spend if spend > 0 else 0

    cols = st.columns(6)
    kpis = [
        ("Valor Gasto", f"{spend:,.2f}", "R$ ", "", "info", None),
        ("Alcance",     f"{metrics.get('reach', 0):,}", "", "", "info", None),
        ("CTR",         f"{ctr:.2f}", "", "%",   _get_status(ctr,  get_benchmark(product_id, "ctr")),  "Cliques ÷ Impressões"),
        ("CPC",         f"{cpc:.2f}", "R$ ", "",  _get_status(cpc,  get_benchmark(product_id, "cpc")),  "Custo por Clique"),
        ("CPL",         f"{cpl:.2f}", "R$ ", "",  _get_status(cpl,  get_benchmark(product_id, "cpl")),  "Custo por Lead"),
        ("ROAS",        f"{roas:.1f}", "", "x",   _get_status(roas, get_benchmark(product_id, "roas")), "Retorno sobre gasto"),
    ]

    for col, (label, value, prefix, suffix, status, help_t) in zip(cols, kpis):
        with col:
            render_kpi_card(label, value, unit_prefix=prefix, unit_suffix=suffix,
                            status=status, help_text=help_t)


def render_ai_kpi_row(metrics: dict, product_id: str = "default") -> None:
    """Renderiza a linha de KPIs do Agente de IA."""
    leads_raw  = metrics.get("leads_raw", 1)
    responded  = metrics.get("ai_leads_responded", 0)
    qualified  = metrics.get("leads_qualified_by_ai", 0)
    overflow   = metrics.get("ai_overflow_count", 0)
    avg_resp   = metrics.get("ai_avg_response_minutes", 0)

    retention     = responded / leads_raw * 100 if leads_raw > 0 else 0
    qualify_rate  = qualified / leads_raw * 100 if leads_raw > 0 else 0
    overflow_rate = overflow / responded * 100 if responded > 0 else 0

    cols = st.columns(5)
    kpis = [
        ("Leads Brutos",       f"{leads_raw:,}",         "", "",    "info", "Total que chegou à IA"),
        ("Retenção IA",        f"{retention:.1f}",        "", "%",   _get_status(retention,    get_benchmark(product_id, "ai_retention")),    "Leads que interagiram"),
        ("Taxa Qualificação",  f"{qualify_rate:.1f}",     "", "%",   _get_status(qualify_rate, get_benchmark(product_id, "ai_qualify_rate")), "Qualificados pela IA"),
        ("Taxa Transbordo",    f"{overflow_rate:.1f}",    "", "%",   _get_status(overflow_rate,get_benchmark(product_id, "ai_overflow_rate")),"IA → Humano"),
        ("Resp. Médio",        f"{avg_resp:.1f}",         "", " min","info", "Tempo médio de resposta"),
    ]

    for col, (label, value, prefix, suffix, status, help_t) in zip(cols, kpis):
        with col:
            render_kpi_card(label, value, unit_prefix=prefix, unit_suffix=suffix,
                            status=status, help_text=help_t)


def render_alert_banner(message: str, level: str = "warning") -> None:
    """Exibe banner de alerta de sangria."""
    colors = {
        "critical": (COLORS["accent_red"],   "#FFF5F5", "🔴"),
        "warning":  (COLORS["accent_orange"], "#FFFBEB", "🟡"),
        "ok":       (COLORS["accent_green"],  "#F0FFF4", "🟢"),
    }
    border_c, bg_c, icon = colors.get(level, colors["warning"])
    st.markdown(f"""
    <div style="background:{bg_c}; border-left:4px solid {border_c}; border-radius:6px;
                padding:10px 16px; margin-bottom:8px; font-size:0.85rem; color:{COLORS['text_primary']};">
        {icon} <strong>Alerta de Performance:</strong> {message}
    </div>
    """, unsafe_allow_html=True)
