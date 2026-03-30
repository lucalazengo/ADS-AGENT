"""
ADS-AGENT Dashboard — Entry Point
Dashboard Universal de Performance & Eficiência de IA
Paleta: Branco + Azul Suave

Uso: streamlit run dashboard/app.py
"""

import streamlit as st
import pandas as pd
import sys
from pathlib import Path

# ─── Path setup ───────────────────────────────────────────────────────────────
ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT))

from dashboard.config.settings import COLORS
from dashboard.components.sidebar import render_sidebar, apply_filters
from dashboard.components.kpi_cards import (
    render_ads_kpi_row, render_ai_kpi_row, render_alert_banner
)
from dashboard.components.charts import (
    daily_spend_chart, cpl_trend_chart, funnel_chart,
    sentiment_donut, roas_by_product_chart, ai_comparison_chart
)
from dashboard.components.tables import render_campaign_table, render_monthly_table
from dashboard.data.data_loader import load_data as load_csv_data

# ─── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="ADS-AGENT Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Global CSS ───────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    html, body, [class*="css"] {{
        font-family: 'Inter', 'Segoe UI', sans-serif;
        background-color: {COLORS['bg_primary']};
        color: {COLORS['text_primary']};
    }}

    /* Sidebar */
    section[data-testid="stSidebar"] {{
        background-color: {COLORS['bg_sidebar']};
        border-right: 1px solid {COLORS['border']};
        padding-top: 0 !important;
    }}
    section[data-testid="stSidebar"] > div {{
        padding: 20px 16px;
    }}

    /* Streamlit radio e multiselect */
    .stRadio > div > label,
    .stMultiSelect label,
    .stSelectbox label {{
        font-size: 0.8rem !important;
        color: {COLORS['text_secondary']} !important;
    }}

    /* Remove header padding */
    .block-container {{
        padding-top: 1.5rem !important;
        padding-bottom: 2rem !important;
        max-width: 1400px;
    }}

    /* Streamlit tabs */
    .stTabs [data-baseweb="tab-list"] {{
        gap: 4px;
        background-color: {COLORS['bg_primary']};
        border-bottom: 2px solid {COLORS['border']};
        padding-bottom: 0;
    }}
    .stTabs [data-baseweb="tab"] {{
        border-radius: 6px 6px 0 0;
        padding: 6px 16px;
        font-size: 0.85rem;
        font-weight: 500;
        color: {COLORS['text_secondary']};
        border: none;
        background: transparent;
    }}
    .stTabs [aria-selected="true"] {{
        background-color: {COLORS['bg_card']};
        color: {COLORS['blue_primary']} !important;
        font-weight: 700;
        border-top: 3px solid {COLORS['blue_primary']};
    }}

    /* Buttons */
    .stButton > button, .stDownloadButton > button {{
        background-color: {COLORS['blue_primary']};
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        padding: 6px 16px;
        transition: background 0.2s;
    }}
    .stButton > button:hover {{
        background-color: {COLORS['blue_dark']} !important;
        color: white !important;
    }}

    /* Metric delta override */
    [data-testid="stMetricDelta"] {{ font-size: 0.75rem !important; }}

    /* Plotly chart border */
    .js-plotly-plot {{ border-radius: 10px; }}

    /* Section headers */
    .section-header {{
        font-size: 0.72rem;
        font-weight: 700;
        color: {COLORS['text_muted']};
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 24px 0 12px 0;
        padding-bottom: 6px;
        border-bottom: 1px solid {COLORS['border']};
    }}

    /* Hide Streamlit branding */
    #MainMenu {{visibility: hidden;}}
    footer {{visibility: hidden;}}
    header {{visibility: hidden;}}
</style>
""", unsafe_allow_html=True)


# ─── Data loading ─────────────────────────────────────────────────────────────
@st.cache_data(ttl=300)
def load_data() -> pd.DataFrame:
    return load_csv_data()


def aggregate_metrics(df: pd.DataFrame) -> dict:
    """Agrega métricas do dataframe filtrado."""
    if df.empty:
        return {}
    return {
        "ad_spend":             df["ad_spend"].sum(),
        "impressions":          int(df["impressions"].sum()),
        "clicks":               int(df["clicks"].sum()),
        "reach":                int(df["reach"].sum()),
        "leads_raw":            int(df["leads_raw"].sum()),
        "leads_qualified_by_ai":int(df["leads_qualified_by_ai"].sum()),
        "conversion_value":     df["conversion_value"].sum(),
        "ai_leads_responded":   int(df["ai_leads_responded"].sum()),
        "ai_overflow_count":    int(df["ai_overflow_count"].sum()),
        "ai_avg_response_minutes": float(df["ai_avg_response_minutes"].mean()),
        "sentiment_positive":   float(df["sentiment_positive"].mean()),
        "sentiment_neutral":    float(df["sentiment_neutral"].mean()),
        "sentiment_negative":   float(df["sentiment_negative"].mean()),
        "lead_profile_breakdown": {},
    }


def get_alerts(metrics: dict, product_id: str = "default") -> list[tuple[str, str]]:
    """Retorna lista de alertas (mensagem, nível)."""
    from dashboard.config.settings import get_benchmark
    alerts = []
    spend = metrics.get("ad_spend", 0)
    leads = metrics.get("leads_raw", 1)
    conv  = metrics.get("conversion_value", 0)
    qual  = metrics.get("leads_qualified_by_ai", 0)

    cpl  = spend / leads if leads > 0 else 0
    roas = conv / spend if spend > 0 else 0
    qual_rate = qual / leads * 100 if leads > 0 else 0

    cpl_bm  = get_benchmark(product_id, "cpl")
    roas_bm = get_benchmark(product_id, "roas")
    qual_bm = get_benchmark(product_id, "ai_qualify_rate")

    if cpl_bm and cpl > cpl_bm.get("alert", 9999):
        alerts.append((f"CPL de R$ {cpl:.2f} acima do limite de sangria (R$ {cpl_bm['alert']:.2f}). Revisar criativos e segmentação.", "critical"))
    elif cpl_bm and cpl > cpl_bm.get("ok", 9999):
        alerts.append((f"CPL de R$ {cpl:.2f} em zona de atenção (meta: R$ {cpl_bm['ok']:.2f}).", "warning"))

    if roas_bm and roas < roas_bm.get("alert", 0):
        alerts.append((f"ROAS de {roas:.1f}x abaixo do mínimo aceitável ({roas_bm['alert']:.1f}x). Avaliar pausa da campanha.", "critical"))

    if qual_bm and qual_rate < qual_bm.get("alert", 0):
        alerts.append((f"Taxa de qualificação da IA em {qual_rate:.1f}% — abaixo do esperado ({qual_bm['alert']:.0f}%). Revisar fluxo de atendimento.", "critical"))

    return alerts


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    df_all = load_data()

    # Sidebar + filtros
    filters = render_sidebar(df_all)
    df = apply_filters(df_all, filters)
    page = filters["page"]

    # Métricas agregadas
    metrics = aggregate_metrics(df)
    product_id = "default"
    if not df.empty and len(df["product_id"].unique()) == 1:
        product_id = df["product_id"].iloc[0]

    # ─── PAGE: Ads Performance ────────────────────────────────────────────────
    if page == "ads":
        st.markdown(f"""
        <div style="margin-bottom: 4px;">
            <h2 style="font-size:1.5rem; font-weight:800; color:{COLORS['text_primary']}; margin:0;">
                Ads Performance
            </h2>
            <p style="font-size:0.85rem; color:{COLORS['text_secondary']}; margin:4px 0 0 0;">
                Relatório de performance de campanhas por produto e fonte
            </p>
        </div>
        """, unsafe_allow_html=True)

        # Tabs de período rápido
        tab_labels = ["Hoje", "7 dias", "14 dias", "30 dias"]
        tabs = st.tabs(tab_labels)

        # Alertas
        if metrics:
            alerts = get_alerts(metrics, product_id)
            for msg, level in alerts:
                render_alert_banner(msg, level)

        # KPI Cards
        st.markdown('<div class="section-header">Métricas Gerais</div>', unsafe_allow_html=True)
        if metrics:
            render_ads_kpi_row(metrics, product_id)
        else:
            st.info("Nenhum dado para o período/filtro selecionado.")

        # Gráfico de gasto diário
        st.markdown('<div class="section-header">Gasto Diário</div>', unsafe_allow_html=True)
        if not df.empty:
            st.plotly_chart(daily_spend_chart(df), use_container_width=True, config={"displayModeBar": False})

        # Tabela de campanhas
        st.markdown('<div class="section-header">Performance por Campanha</div>', unsafe_allow_html=True)
        render_campaign_table(df)

    # ─── PAGE: Funil da IA ────────────────────────────────────────────────────
    elif page == "ai_funnel":
        st.markdown(f"""
        <div style="margin-bottom:4px;">
            <h2 style="font-size:1.5rem; font-weight:800; color:{COLORS['text_primary']}; margin:0;">
                Funil de Atendimento da IA
            </h2>
            <p style="font-size:0.85rem; color:{COLORS['text_secondary']}; margin:4px 0 0 0;">
                Eficiência do Agente de IA na qualificação e retenção de leads
            </p>
        </div>
        """, unsafe_allow_html=True)

        # KPI Cards IA
        st.markdown('<div class="section-header">KPIs do Agente de IA</div>', unsafe_allow_html=True)
        if metrics:
            render_ai_kpi_row(metrics, product_id)

        col1, col2 = st.columns([1, 1])
        with col1:
            st.markdown('<div class="section-header">Funil de Conversão</div>', unsafe_allow_html=True)
            if metrics:
                st.plotly_chart(funnel_chart(metrics), use_container_width=True, config={"displayModeBar": False})

        with col2:
            st.markdown('<div class="section-header">Perfil dos Leads</div>', unsafe_allow_html=True)
            if not df.empty:
                # Agrega perfis de lead
                profiles_agg: dict = {}
                for _, row in df.iterrows():
                    pb = row.get("lead_profile_breakdown", {})
                    if isinstance(pb, dict):
                        for k, v in pb.items():
                            profiles_agg[k] = profiles_agg.get(k, 0) + float(v)
                if profiles_agg:
                    total = sum(profiles_agg.values())
                    pct_profile = {k: round(v / total * 100, 1) for k, v in profiles_agg.items()}
                    m2 = dict(metrics)
                    m2["lead_profile_breakdown"] = pct_profile
                    st.plotly_chart(sentiment_donut(m2), use_container_width=True, config={"displayModeBar": False})

        # Comparação da IA entre produtos
        st.markdown('<div class="section-header">Comparativo de Eficiência da IA por Produto</div>', unsafe_allow_html=True)
        if not df.empty:
            st.plotly_chart(ai_comparison_chart(df), use_container_width=True, config={"displayModeBar": False})

        # Insights acionáveis
        st.markdown('<div class="section-header">Insights Acionáveis</div>', unsafe_allow_html=True)
        if not df.empty:
            agg_ai = df.groupby("product_label").agg(
                leads_raw=("leads_raw", "sum"),
                qualified=("leads_qualified_by_ai", "sum"),
                overflow=("ai_overflow_count", "sum"),
            ).reset_index()
            agg_ai["qualify_rate"] = agg_ai["qualified"] / agg_ai["leads_raw"].replace(0, 1) * 100
            best = agg_ai.loc[agg_ai["qualify_rate"].idxmax()]
            worst = agg_ai.loc[agg_ai["qualify_rate"].idxmin()]

            col1, col2, col3 = st.columns(3)
            with col1:
                st.markdown(f"""
                <div style="background:{COLORS['bg_card']}; border:1px solid {COLORS['border']};
                            border-top:3px solid {COLORS['accent_green']}; border-radius:10px; padding:16px;">
                    <div style="font-size:0.7rem; font-weight:700; color:{COLORS['text_muted']}; text-transform:uppercase;">
                        Melhor Produto (IA)
                    </div>
                    <div style="font-size:1.1rem; font-weight:700; color:{COLORS['text_primary']}; margin-top:6px;">
                        {best['product_label']}
                    </div>
                    <div style="font-size:0.85rem; color:{COLORS['accent_green']}; font-weight:600;">
                        {best['qualify_rate']:.1f}% de qualificação
                    </div>
                    <div style="font-size:0.75rem; color:{COLORS['text_muted']}; margin-top:4px;">
                        Escalar orçamento neste produto
                    </div>
                </div>
                """, unsafe_allow_html=True)
            with col2:
                st.markdown(f"""
                <div style="background:{COLORS['bg_card']}; border:1px solid {COLORS['border']};
                            border-top:3px solid {COLORS['accent_red']}; border-radius:10px; padding:16px;">
                    <div style="font-size:0.7rem; font-weight:700; color:{COLORS['text_muted']}; text-transform:uppercase;">
                        Revisar Fluxo IA
                    </div>
                    <div style="font-size:1.1rem; font-weight:700; color:{COLORS['text_primary']}; margin-top:6px;">
                        {worst['product_label']}
                    </div>
                    <div style="font-size:0.85rem; color:{COLORS['accent_red']}; font-weight:600;">
                        {worst['qualify_rate']:.1f}% de qualificação
                    </div>
                    <div style="font-size:0.75rem; color:{COLORS['text_muted']}; margin-top:4px;">
                        Otimizar perguntas de qualificação
                    </div>
                </div>
                """, unsafe_allow_html=True)
            with col3:
                total_overflow = int(df["ai_overflow_count"].sum())
                total_leads = int(df["leads_raw"].sum())
                overflow_pct = total_overflow / total_leads * 100 if total_leads > 0 else 0
                ov_color = COLORS["accent_green"] if overflow_pct < 20 else (COLORS["accent_orange"] if overflow_pct < 40 else COLORS["accent_red"])
                st.markdown(f"""
                <div style="background:{COLORS['bg_card']}; border:1px solid {COLORS['border']};
                            border-top:3px solid {ov_color}; border-radius:10px; padding:16px;">
                    <div style="font-size:0.7rem; font-weight:700; color:{COLORS['text_muted']}; text-transform:uppercase;">
                        Transbordo Total
                    </div>
                    <div style="font-size:1.1rem; font-weight:700; color:{COLORS['text_primary']}; margin-top:6px;">
                        {total_overflow:,} atend.
                    </div>
                    <div style="font-size:0.85rem; color:{ov_color}; font-weight:600;">
                        {overflow_pct:.1f}% dos leads
                    </div>
                    <div style="font-size:0.75rem; color:{COLORS['text_muted']}; margin-top:4px;">
                        Meta: &lt; 20%
                    </div>
                </div>
                """, unsafe_allow_html=True)

    # ─── PAGE: Atribuição/ROAS ────────────────────────────────────────────────
    elif page == "attribution":
        st.markdown(f"""
        <div style="margin-bottom:4px;">
            <h2 style="font-size:1.5rem; font-weight:800; color:{COLORS['text_primary']}; margin:0;">
                Atribuição & ROAS Real
            </h2>
            <p style="font-size:0.85rem; color:{COLORS['text_secondary']}; margin:4px 0 0 0;">
                Cruzamento de gasto em Ads com valor gerado no CRM via IA
            </p>
        </div>
        """, unsafe_allow_html=True)

        if metrics:
            spend = metrics.get("ad_spend", 0)
            conv  = metrics.get("conversion_value", 0)
            roas  = conv / spend if spend > 0 else 0
            leads = metrics.get("leads_raw", 1)
            qual  = metrics.get("leads_qualified_by_ai", 0)

            col1, col2, col3, col4 = st.columns(4)
            with col1:
                from dashboard.components.kpi_cards import render_kpi_card, _get_status
                from dashboard.config.settings import get_benchmark
                render_kpi_card("Gasto Total", f"{spend:,.2f}", unit_prefix="R$ ", status="info")
            with col2:
                render_kpi_card("Valor Convertido", f"{conv:,.2f}", unit_prefix="R$ ", status="ok")
            with col3:
                render_kpi_card("ROAS Real", f"{roas:.1f}", unit_suffix="x",
                                status=_get_status(roas, get_benchmark(product_id, "roas")),
                                help_text="Valor CRM ÷ Gasto Ads")
            with col4:
                cpl = spend / leads if leads > 0 else 0
                render_kpi_card("CPL Qualificado", f"{(spend/qual if qual>0 else 0):.2f}", unit_prefix="R$ ",
                                help_text="Custo por lead qualificado pela IA")

        col1, col2 = st.columns([1, 1])
        with col1:
            st.markdown('<div class="section-header">ROAS por Produto</div>', unsafe_allow_html=True)
            if not df.empty:
                st.plotly_chart(roas_by_product_chart(df), use_container_width=True, config={"displayModeBar": False})

        with col2:
            st.markdown('<div class="section-header">CPL ao Longo do Tempo</div>', unsafe_allow_html=True)
            if not df.empty:
                st.plotly_chart(cpl_trend_chart(df), use_container_width=True, config={"displayModeBar": False})

        # Interesse em insumos/benefícios
        st.markdown('<div class="section-header">Interesse em Programas de Benefícios</div>', unsafe_allow_html=True)
        if not df.empty and "interest_extended_warranty" in df.columns:
            warranty = df["interest_extended_warranty"].mean()
            recurrence = df["interest_ink_recurrence"].mean()

            col1, col2, col3 = st.columns([1, 1, 2])
            with col1:
                st.markdown(f"""
                <div style="background:{COLORS['bg_card']}; border:1px solid {COLORS['border']};
                            border-top:3px solid {COLORS['blue_primary']}; border-radius:10px; padding:16px;">
                    <div style="font-size:0.7rem; font-weight:700; color:{COLORS['text_muted']}; text-transform:uppercase;">
                        Garantia Estendida
                    </div>
                    <div style="font-size:1.6rem; font-weight:700; color:{COLORS['blue_primary']}; margin-top:6px;">
                        {warranty:.1f}%
                    </div>
                    <div style="font-size:0.75rem; color:{COLORS['text_muted']};">dos leads demonstraram interesse</div>
                </div>
                """, unsafe_allow_html=True)
            with col2:
                st.markdown(f"""
                <div style="background:{COLORS['bg_card']}; border:1px solid {COLORS['border']};
                            border-top:3px solid {COLORS['blue_medium']}; border-radius:10px; padding:16px;">
                    <div style="font-size:0.7rem; font-weight:700; color:{COLORS['text_muted']}; text-transform:uppercase;">
                        Recorrência de Tintas
                    </div>
                    <div style="font-size:1.6rem; font-weight:700; color:{COLORS['blue_medium']}; margin-top:6px;">
                        {recurrence:.1f}%
                    </div>
                    <div style="font-size:0.75rem; color:{COLORS['text_muted']};">dos leads interessados</div>
                </div>
                """, unsafe_allow_html=True)

    # ─── PAGE: Financeiro ─────────────────────────────────────────────────────
    elif page == "financial":
        st.markdown(f"""
        <div style="margin-bottom:4px;">
            <h2 style="font-size:1.5rem; font-weight:800; color:{COLORS['text_primary']}; margin:0;">
                Financeiro
            </h2>
            <p style="font-size:0.85rem; color:{COLORS['text_secondary']}; margin:4px 0 0 0;">
                Gasto mensal, conversão e ROAS histórico
            </p>
        </div>
        """, unsafe_allow_html=True)

        if metrics:
            spend = metrics.get("ad_spend", 0)
            conv  = metrics.get("conversion_value", 0)
            profit = conv - spend
            col1, col2, col3 = st.columns(3)
            with col1:
                from dashboard.components.kpi_cards import render_kpi_card
                render_kpi_card("Gasto Total", f"{spend:,.2f}", unit_prefix="R$ ", status="info")
            with col2:
                render_kpi_card("Receita Gerada", f"{conv:,.2f}", unit_prefix="R$ ", status="ok")
            with col3:
                render_kpi_card("Lucro Estimado", f"{profit:,.2f}", unit_prefix="R$ ",
                                status="ok" if profit > 0 else "critical")

        st.markdown('<div class="section-header">Histórico Mensal</div>', unsafe_allow_html=True)
        render_monthly_table(df)


if __name__ == "__main__":
    main()
