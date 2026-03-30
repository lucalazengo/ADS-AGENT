"""
Sidebar — ADS-AGENT Dashboard
Navegação lateral e filtros dinâmicos por produto/campanha/período.
"""

import streamlit as st
import pandas as pd
from datetime import date, timedelta
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2]))
from dashboard.config.settings import COLORS, AVAILABLE_PERIODS


PAGES = {
    "Ads Performance":  "ads",
    "Funil da IA":      "ai_funnel",
    "Atribuição/ROAS":  "attribution",
    "Financeiro":       "financial",
}


def render_sidebar(df: pd.DataFrame) -> dict:
    """Renderiza sidebar e retorna filtros selecionados pelo usuário."""
    with st.sidebar:
        # Logo / título
        st.markdown(f"""
        <div style="padding:16px 0 24px 0;">
            <div style="font-size:1.15rem; font-weight:800; color:{COLORS['blue_dark']}; letter-spacing:-0.02em;">
                ADS<span style="color:{COLORS['blue_primary']};">AGENT</span>
            </div>
            <div style="font-size:0.72rem; color:{COLORS['text_muted']}; margin-top:2px;">
                Dashboard Universal de Performance
            </div>
        </div>
        <hr style="border:none; border-top:1px solid {COLORS['border']}; margin:0 0 16px 0;" />
        """, unsafe_allow_html=True)

        # Navegação
        st.markdown(f'<div style="font-size:0.68rem; font-weight:700; color:{COLORS["text_muted"]}; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">Relatórios</div>', unsafe_allow_html=True)
        page_label = st.radio("", list(PAGES.keys()), label_visibility="collapsed")
        page = PAGES[page_label]

        st.markdown(f'<hr style="border:none; border-top:1px solid {COLORS["border"]}; margin:16px 0;" />', unsafe_allow_html=True)

        # Período
        st.markdown(f'<div style="font-size:0.68rem; font-weight:700; color:{COLORS["text_muted"]}; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">Período</div>', unsafe_allow_html=True)

        period_options = {"Hoje": 1, "7 dias": 7, "14 dias": 14, "30 dias": 30, "90 dias": 90, "Personalizado": -1}
        period_label = st.selectbox("", list(period_options.keys()), index=1, label_visibility="collapsed")
        period_days = period_options[period_label]

        if period_days == -1:
            col1, col2 = st.columns(2)
            with col1:
                date_start = st.date_input("De", value=date.today() - timedelta(days=30), label_visibility="visible")
            with col2:
                date_end = st.date_input("Até", value=date.today(), label_visibility="visible")
        else:
            date_end = date.today()
            date_start = date_end - timedelta(days=period_days - 1)

        st.markdown(f'<hr style="border:none; border-top:1px solid {COLORS["border"]}; margin:16px 0;" />', unsafe_allow_html=True)

        # Filtros dinâmicos
        st.markdown(f'<div style="font-size:0.68rem; font-weight:700; color:{COLORS["text_muted"]}; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">Filtros</div>', unsafe_allow_html=True)

        # Produto (dinâmico — baseado nos dados)
        all_products = sorted(df["product_label"].unique().tolist()) if not df.empty else []
        selected_products = st.multiselect(
            "Produto", ["Todos"] + all_products,
            default=["Todos"], placeholder="Selecione produtos...",
        )
        if "Todos" in selected_products or not selected_products:
            selected_products = all_products

        # Campanha (filtrado pelos produtos selecionados)
        campaign_df = df[df["product_label"].isin(selected_products)] if not df.empty else df
        all_campaigns = sorted(campaign_df["campaign_name"].unique().tolist()) if not campaign_df.empty else []
        selected_campaigns = st.multiselect(
            "Campanha", ["Todas"] + all_campaigns,
            default=["Todas"], placeholder="Selecione campanhas...",
        )
        if "Todas" in selected_campaigns or not selected_campaigns:
            selected_campaigns = all_campaigns

        # Fonte
        all_sources = sorted(df["source"].unique().tolist()) if not df.empty else []
        source_labels = {"meta_ads": "Meta Ads", "google_ads": "Google Ads", "organic": "Orgânico",
                         "referral": "Referral", "manual": "Manual"}
        source_display = [source_labels.get(s, s) for s in all_sources]
        source_map = {source_labels.get(s, s): s for s in all_sources}

        selected_source_display = st.multiselect(
            "Fonte", ["Todas"] + source_display, default=["Todas"],
        )
        if "Todas" in selected_source_display or not selected_source_display:
            selected_sources = all_sources
        else:
            selected_sources = [source_map[s] for s in selected_source_display if s in source_map]

        st.markdown(f'<hr style="border:none; border-top:1px solid {COLORS["border"]}; margin:16px 0;" />', unsafe_allow_html=True)

        # Status da conexão (simulado)
        st.markdown(f"""
        <div style="font-size:0.7rem; color:{COLORS['text_muted']};">
            <div style="margin-bottom:4px;">
                <span style="color:{COLORS['accent_green']};">●</span> n8n conectado
            </div>
            <div style="margin-bottom:4px;">
                <span style="color:{COLORS['accent_green']};">●</span> Agente IA ativo
            </div>
            <div>
                <span style="color:{COLORS['accent_orange']};">●</span> Salesforce (config)
            </div>
        </div>
        """, unsafe_allow_html=True)

    return {
        "page": page,
        "date_start": date_start,
        "date_end": date_end,
        "products": selected_products,
        "campaigns": selected_campaigns,
        "sources": selected_sources,
    }


def apply_filters(df: pd.DataFrame, filters: dict) -> pd.DataFrame:
    """Aplica filtros de sidebar ao dataframe."""
    if df.empty:
        return df

    df2 = df.copy()
    df2["date"] = pd.to_datetime(df2["date"]).dt.date

    mask = (
        (df2["date"] >= filters["date_start"]) &
        (df2["date"] <= filters["date_end"]) &
        (df2["product_label"].isin(filters["products"])) &
        (df2["campaign_name"].isin(filters["campaigns"])) &
        (df2["source"].isin(filters["sources"]))
    )
    return df2[mask].reset_index(drop=True)
