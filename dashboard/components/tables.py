"""
Tables — ADS-AGENT Dashboard
Tabelas de performance de campanhas com formatação e exportação.
"""

import streamlit as st
import pandas as pd
import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2]))
from dashboard.config.settings import COLORS, get_benchmark


def _status_badge(value: float, bm: dict, unit: str = "") -> str:
    if not bm:
        return f"{value}{unit}"
    ok, alert, lib = bm.get("ok", 0), bm.get("alert", 0), bm.get("lower_is_better", False)
    if lib:
        color = COLORS["accent_green"] if value <= ok else (COLORS["accent_orange"] if value <= alert else COLORS["accent_red"])
    else:
        color = COLORS["accent_green"] if value >= ok else (COLORS["accent_orange"] if value >= alert else COLORS["accent_red"])
    return f'<span style="color:{color}; font-weight:600;">{value}{unit}</span>'


def render_campaign_table(df: pd.DataFrame) -> None:
    """Tabela de performance por campanha com badges coloridos."""
    if df.empty:
        st.info("Nenhum dado para o período selecionado.")
        return

    agg = df.groupby(["product_label", "campaign_name", "source"]).agg(
        ad_spend=("ad_spend", "sum"),
        impressions=("impressions", "sum"),
        clicks=("clicks", "sum"),
        leads_raw=("leads_raw", "sum"),
        leads_qualified_by_ai=("leads_qualified_by_ai", "sum"),
        conversion_value=("conversion_value", "sum"),
        product_id=("product_id", "first"),
    ).reset_index()

    agg["CTR"]  = (agg["clicks"] / agg["impressions"].replace(0, 1) * 100).round(2)
    agg["CPC"]  = (agg["ad_spend"] / agg["clicks"].replace(0, 1)).round(2)
    agg["CPL"]  = (agg["ad_spend"] / agg["leads_raw"].replace(0, 1)).round(2)
    agg["CPM"]  = (agg["ad_spend"] / agg["impressions"].replace(0, 1) * 1000).round(2)
    agg["ROAS"] = (agg["conversion_value"] / agg["ad_spend"].replace(0, 1)).round(2)

    source_icon = {"meta_ads": "Meta", "google_ads": "Google", "organic": "Orgânico",
                   "referral": "Referral", "manual": "Manual"}

    rows_html = ""
    for _, row in agg.iterrows():
        pid = row["product_id"]
        rows_html += f"""
        <tr style="border-bottom: 1px solid {COLORS['border']};">
            <td style="padding:10px 12px; font-weight:600; color:{COLORS['text_primary']};">{row['campaign_name']}</td>
            <td style="padding:10px 12px; color:{COLORS['text_secondary']};">{row['product_label']}</td>
            <td style="padding:10px 12px;">
                <span style="background:{COLORS['blue_subtle']}; color:{COLORS['blue_dark']};
                             font-size:0.72rem; padding:2px 8px; border-radius:12px; font-weight:600;">
                    {source_icon.get(row['source'], row['source'])}
                </span>
            </td>
            <td style="padding:10px 12px; color:{COLORS['text_primary']}; font-weight:600;">R$ {row['ad_spend']:,.2f}</td>
            <td style="padding:10px 12px;">{row['impressions']:,}</td>
            <td style="padding:10px 12px;">{_status_badge(row['CTR'], get_benchmark(pid,'ctr'), '%')}</td>
            <td style="padding:10px 12px;">{_status_badge(row['CPL'], get_benchmark(pid,'cpl'), '')}</td>
            <td style="padding:10px 12px; color:{COLORS['text_primary']};">{row['leads_raw']:,}</td>
            <td style="padding:10px 12px; color:{COLORS['blue_primary']}; font-weight:600;">{row['leads_qualified_by_ai']:,}</td>
            <td style="padding:10px 12px;">{_status_badge(row['ROAS'], get_benchmark(pid,'roas'), 'x')}</td>
        </tr>
        """

    header_style = f"padding:10px 12px; font-size:0.72rem; font-weight:700; color:{COLORS['text_secondary']}; text-transform:uppercase; letter-spacing:0.05em; border-bottom:2px solid {COLORS['border']}; background:{COLORS['bg_sidebar']};"

    st.markdown(f"""
    <div style="overflow-x:auto; border-radius:10px; border:1px solid {COLORS['border']};">
    <table style="width:100%; border-collapse:collapse; font-size:0.85rem; background:{COLORS['bg_card']};">
        <thead>
            <tr>
                <th style="{header_style}">Campanha</th>
                <th style="{header_style}">Produto</th>
                <th style="{header_style}">Fonte</th>
                <th style="{header_style}">Gasto</th>
                <th style="{header_style}">Impressões</th>
                <th style="{header_style}">CTR</th>
                <th style="{header_style}">CPL</th>
                <th style="{header_style}">Leads</th>
                <th style="{header_style}">Qualif. IA</th>
                <th style="{header_style}">ROAS</th>
            </tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>
    </div>
    """, unsafe_allow_html=True)

    # Botão de exportação
    st.markdown("<div style='margin-top:10px;'></div>", unsafe_allow_html=True)
    col1, col2, _ = st.columns([1, 1, 4])
    with col1:
        csv = agg.drop(columns=["product_id"]).to_csv(index=False).encode("utf-8")
        st.download_button("Exportar CSV", csv, "campanhas.csv", "text/csv", use_container_width=True)
    with col2:
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            agg.drop(columns=["product_id"]).to_excel(writer, index=False, sheet_name="Campanhas")
        st.download_button("Exportar Excel", buffer.getvalue(), "campanhas.xlsx",
                           "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                           use_container_width=True)


def render_monthly_table(df: pd.DataFrame) -> None:
    """Tabela financeira mensal (gasto + conversão por mês)."""
    if df.empty:
        st.info("Nenhum dado disponível.")
        return

    df2 = df.copy()
    df2["month"] = pd.to_datetime(df2["date"]).dt.to_period("M").astype(str)
    agg = df2.groupby("month").agg(
        ad_spend=("ad_spend", "sum"),
        conversion_value=("conversion_value", "sum"),
        leads_raw=("leads_raw", "sum"),
        leads_qualified_by_ai=("leads_qualified_by_ai", "sum"),
    ).reset_index()
    agg["roas"] = (agg["conversion_value"] / agg["ad_spend"].replace(0, 1)).round(2)

    month_names = {
        "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
        "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
        "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
    }

    rows_html = ""
    for _, row in agg.iterrows():
        y, m = row["month"].split("-")
        label = f"{month_names.get(m, m)} {y}"
        roas_color = COLORS["accent_green"] if row["roas"] >= 4 else (COLORS["accent_orange"] if row["roas"] >= 2 else COLORS["accent_red"])
        rows_html += f"""
        <tr style="border-bottom:1px solid {COLORS['border']};">
            <td style="padding:10px 12px; font-weight:600;">{label}</td>
            <td style="padding:10px 12px; color:{COLORS['blue_dark']}; font-weight:600;">R$ {row['ad_spend']:,.2f}</td>
            <td style="padding:10px 12px; color:{COLORS['text_primary']};">{row['leads_raw']:,}</td>
            <td style="padding:10px 12px; color:{COLORS['blue_primary']}; font-weight:600;">{row['leads_qualified_by_ai']:,}</td>
            <td style="padding:10px 12px; color:{COLORS['accent_green']}; font-weight:600;">R$ {row['conversion_value']:,.2f}</td>
            <td style="padding:10px 12px; color:{roas_color}; font-weight:700;">{row['roas']:.1f}x</td>
        </tr>
        """

    header_style = f"padding:10px 12px; font-size:0.72rem; font-weight:700; color:{COLORS['text_secondary']}; text-transform:uppercase; letter-spacing:0.05em; border-bottom:2px solid {COLORS['border']}; background:{COLORS['bg_sidebar']};"

    st.markdown(f"""
    <div style="overflow-x:auto; border-radius:10px; border:1px solid {COLORS['border']};">
    <table style="width:100%; border-collapse:collapse; font-size:0.85rem; background:{COLORS['bg_card']};">
        <thead>
            <tr>
                <th style="{header_style}">Mês</th>
                <th style="{header_style}">Gasto</th>
                <th style="{header_style}">Leads Brutos</th>
                <th style="{header_style}">Qualificados</th>
                <th style="{header_style}">Valor Convertido</th>
                <th style="{header_style}">ROAS</th>
            </tr>
        </thead>
        <tbody>{rows_html}</tbody>
    </table>
    </div>
    """, unsafe_allow_html=True)
