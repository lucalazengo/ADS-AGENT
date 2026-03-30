"""
Charts — ADS-AGENT Dashboard
Gráficos interativos com Plotly + paleta branco/azul.
"""

import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2]))
from dashboard.config.settings import COLORS

BLUE_PALETTE = [
    COLORS["blue_primary"], COLORS["blue_medium"], COLORS["blue_dark"],
    COLORS["blue_light"], "#6BB8F0", "#1A3A5C", "#8EC9F7", "#3D8FD1",
]

PLOTLY_LAYOUT = dict(
    paper_bgcolor=COLORS["bg_card"],
    plot_bgcolor=COLORS["bg_card"],
    font=dict(family="Inter, Segoe UI, sans-serif", color=COLORS["text_primary"], size=12),
    margin=dict(l=0, r=0, t=30, b=0),
    legend=dict(
        orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1,
        bgcolor="rgba(0,0,0,0)", font=dict(size=11),
    ),
)


def _apply_grid(fig: go.Figure) -> go.Figure:
    fig.update_xaxes(showgrid=False, zeroline=False, showline=True,
                     linecolor=COLORS["border"], tickfont=dict(color=COLORS["text_secondary"], size=11))
    fig.update_yaxes(showgrid=True, gridcolor=COLORS["border_light"],
                     zeroline=False, showline=False,
                     tickfont=dict(color=COLORS["text_secondary"], size=11))
    return fig


def daily_spend_chart(df: pd.DataFrame, group_by: str = "product_label") -> go.Figure:
    """Gráfico de linha: gasto diário por produto/campanha."""
    agg = df.groupby(["date", group_by])["ad_spend"].sum().reset_index()
    agg["date"] = pd.to_datetime(agg["date"])
    agg = agg.sort_values("date")

    fig = go.Figure()
    for i, name in enumerate(agg[group_by].unique()):
        subset = agg[agg[group_by] == name]
        color = BLUE_PALETTE[i % len(BLUE_PALETTE)]
        fig.add_trace(go.Scatter(
            x=subset["date"], y=subset["ad_spend"],
            name=name, mode="lines+markers",
            line=dict(color=color, width=2.5),
            marker=dict(size=5, color=color),
            hovertemplate="<b>%{x|%d/%m}</b><br>Gasto: R$ %{y:,.2f}<extra></extra>",
            fill="tozeroy",
            fillcolor=f"rgba({int(color[1:3],16)},{int(color[3:5],16)},{int(color[5:7],16)},0.07)",
        ))

    fig.update_layout(
        **PLOTLY_LAYOUT,
        title=dict(text="Gasto Diário", font=dict(size=13, color=COLORS["text_secondary"]), x=0),
        height=280,
        hovermode="x unified",
    )
    return _apply_grid(fig)


def cpl_trend_chart(df: pd.DataFrame) -> go.Figure:
    """Gráfico de linha: CPL ao longo do tempo por produto."""
    agg = df.groupby(["date", "product_label"]).agg(
        ad_spend=("ad_spend", "sum"),
        leads_raw=("leads_raw", "sum"),
    ).reset_index()
    agg["cpl"] = agg["ad_spend"] / agg["leads_raw"].replace(0, 1)
    agg["date"] = pd.to_datetime(agg["date"])
    agg = agg.sort_values("date")

    fig = go.Figure()
    for i, name in enumerate(agg["product_label"].unique()):
        subset = agg[agg["product_label"] == name]
        color = BLUE_PALETTE[i % len(BLUE_PALETTE)]
        fig.add_trace(go.Scatter(
            x=subset["date"], y=subset["cpl"],
            name=name, mode="lines+markers",
            line=dict(color=color, width=2.5),
            marker=dict(size=5),
            hovertemplate="<b>%{x|%d/%m}</b><br>CPL: R$ %{y:.2f}<extra></extra>",
        ))

    fig.update_layout(
        **PLOTLY_LAYOUT,
        title=dict(text="Evolução do CPL", font=dict(size=13, color=COLORS["text_secondary"]), x=0),
        height=260,
    )
    return _apply_grid(fig)


def funnel_chart(metrics: dict) -> go.Figure:
    """Funil de atendimento: Impressões → Cliques → Leads → Qualificados → Vendas."""
    stages = ["Impressões", "Cliques", "Leads Brutos", "Qualificados IA", "Oportunidades CRM"]
    values = [
        metrics.get("impressions", 0),
        metrics.get("clicks", 0),
        metrics.get("leads_raw", 0),
        metrics.get("leads_qualified_by_ai", 0),
        int(metrics.get("leads_qualified_by_ai", 0) * 0.15),
    ]

    fig = go.Figure(go.Funnel(
        y=stages, x=values,
        textinfo="value+percent initial",
        marker=dict(color=[
            COLORS["blue_light"], COLORS["blue_medium"], COLORS["blue_primary"],
            COLORS["blue_dark"], COLORS["accent_green"],
        ]),
        connector=dict(line=dict(color=COLORS["border"], width=1)),
        textfont=dict(color=COLORS["text_primary"], size=12),
    ))

    fig.update_layout(
        **PLOTLY_LAYOUT,
        title=dict(text="Funil de Conversão", font=dict(size=13, color=COLORS["text_secondary"]), x=0),
        height=320,
        margin=dict(l=120, r=20, t=30, b=0),
    )
    return fig


def sentiment_donut(metrics: dict) -> go.Figure:
    """Gráfico donut de sentimento/perfil do lead."""
    profile = metrics.get("lead_profile_breakdown", {})
    if not profile:
        profile = {
            "Gestor Atuante": metrics.get("sentiment_positive", 60),
            "Interesse Médio": metrics.get("sentiment_neutral", 28),
            "Sem Interesse":   metrics.get("sentiment_negative", 12),
        }

    labels = list(profile.keys())
    values = list(profile.values())
    donut_colors = [COLORS["blue_primary"], COLORS["blue_medium"], COLORS["blue_light"],
                    COLORS["accent_orange"], COLORS["accent_red"]]

    fig = go.Figure(go.Pie(
        labels=labels, values=values,
        hole=0.55,
        marker=dict(colors=donut_colors[:len(labels)], line=dict(color=COLORS["bg_card"], width=2)),
        textfont=dict(size=11, color=COLORS["text_primary"]),
        hovertemplate="<b>%{label}</b><br>%{value:.1f}%<extra></extra>",
    ))

    fig.update_layout(
        **PLOTLY_LAYOUT,
        title=dict(text="Perfil dos Leads", font=dict(size=13, color=COLORS["text_secondary"]), x=0),
        height=280,
        showlegend=True,
        legend=dict(orientation="v", x=1.0, y=0.5, font=dict(size=11)),
        margin=dict(l=0, r=100, t=30, b=0),
        annotations=[dict(
            text=f"<b>{int(sum(values))}</b><br>leads",
            x=0.5, y=0.5, showarrow=False,
            font=dict(size=14, color=COLORS["text_primary"]),
        )],
    )
    return fig


def roas_by_product_chart(df: pd.DataFrame) -> go.Figure:
    """Bar chart: ROAS por produto."""
    agg = df.groupby("product_label").agg(
        ad_spend=("ad_spend", "sum"),
        conversion_value=("conversion_value", "sum"),
    ).reset_index()
    agg["roas"] = agg["conversion_value"] / agg["ad_spend"].replace(0, 1)
    agg = agg.sort_values("roas", ascending=True)

    colors = [COLORS["accent_green"] if r >= 4 else (COLORS["accent_orange"] if r >= 2 else COLORS["accent_red"])
              for r in agg["roas"]]

    fig = go.Figure(go.Bar(
        x=agg["roas"], y=agg["product_label"],
        orientation="h",
        marker=dict(color=colors, line=dict(width=0)),
        text=[f"{r:.1f}x" for r in agg["roas"]],
        textposition="outside",
        textfont=dict(color=COLORS["text_primary"], size=12, family="Inter, sans-serif"),
        hovertemplate="<b>%{y}</b><br>ROAS: %{x:.2f}x<extra></extra>",
    ))

    fig.update_layout(
        **PLOTLY_LAYOUT,
        title=dict(text="ROAS por Produto", font=dict(size=13, color=COLORS["text_secondary"]), x=0),
        height=max(150, len(agg) * 60),
        xaxis=dict(showgrid=True, gridcolor=COLORS["border_light"]),
        yaxis=dict(showgrid=False),
    )
    return _apply_grid(fig)


def ai_comparison_chart(df: pd.DataFrame) -> go.Figure:
    """Grouped bar: comparação da eficiência da IA entre produtos."""
    agg = df.groupby("product_label").agg(
        leads_raw=("leads_raw", "sum"),
        leads_qualified_by_ai=("leads_qualified_by_ai", "sum"),
        ai_overflow_count=("ai_overflow_count", "sum"),
    ).reset_index()
    agg["qualify_rate"]  = agg["leads_qualified_by_ai"] / agg["leads_raw"].replace(0, 1) * 100
    agg["overflow_rate"] = agg["ai_overflow_count"] / agg["leads_raw"].replace(0, 1) * 100

    fig = go.Figure()
    fig.add_trace(go.Bar(
        name="Taxa Qualificação (%)", x=agg["product_label"], y=agg["qualify_rate"],
        marker_color=COLORS["blue_primary"],
        hovertemplate="<b>%{x}</b><br>Qualificação: %{y:.1f}%<extra></extra>",
    ))
    fig.add_trace(go.Bar(
        name="Taxa Transbordo (%)", x=agg["product_label"], y=agg["overflow_rate"],
        marker_color=COLORS["accent_orange"],
        hovertemplate="<b>%{x}</b><br>Transbordo: %{y:.1f}%<extra></extra>",
    ))

    fig.update_layout(
        **PLOTLY_LAYOUT,
        title=dict(text="Eficiência da IA por Produto", font=dict(size=13, color=COLORS["text_secondary"]), x=0),
        height=280,
        barmode="group",
        bargap=0.3,
        bargroupgap=0.05,
    )
    return _apply_grid(fig)
