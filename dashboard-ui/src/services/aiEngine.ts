/**
 * AI Decision Engine — ADS-AGENT
 * Analisa métricas e gera recomendações priorizadas automaticamente.
 */

import type { AggregatedMetrics } from "../data/types";
import { getBenchmark, getStatus, calcLTV, calcCAC, getEconomics } from "../config/settings";

export type RecommendationPriority = "critical" | "high" | "medium" | "low";
export type RecommendationAction   = "PAUSAR" | "ESCALAR" | "AJUSTAR" | "MONITORAR";
export type RecommendationCategory = "budget" | "creative" | "funnel" | "scale" | "financial";

export interface AiRecommendation {
  id:           string;
  priority:     RecommendationPriority;
  action:       RecommendationAction;
  category:     RecommendationCategory;
  title:        string;
  description:  string;
  metric:       string;
  currentValue: string;
  targetValue:  string;
  confidence:   number; // 0–100
}

const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

export function generateRecommendations(
  metrics:   AggregatedMetrics,
  productId: string = "default",
): AiRecommendation[] {
  const recs: AiRecommendation[] = [];
  const eco = getEconomics(productId);
  const ltv = calcLTV(productId);
  const cac = calcCAC(metrics.ad_spend, metrics.leads_qualified_by_ai, eco.overhead_monthly);

  // ── CPL ──────────────────────────────────────────────────────────────────────
  const cplBm     = getBenchmark(productId, "cpl");
  const cplStatus = getStatus(metrics.cpl, cplBm);

  if (cplStatus === "critical") {
    recs.push({
      id: "cpl_critical", priority: "critical", action: "PAUSAR", category: "budget",
      title: "CPL Crítico — Pausar Campanhas de Baixo Retorno",
      description: `CPL de R$ ${metrics.cpl.toFixed(2)} ultrapassou o limite crítico (R$ ${(cplBm?.alert ?? 99).toFixed(0)}). Pause os conjuntos de anúncio com pior CPL e redirecione budget para os de melhor desempenho.`,
      metric: "CPL", currentValue: `R$ ${metrics.cpl.toFixed(2)}`,
      targetValue: `R$ ${(cplBm?.ok ?? 20).toFixed(2)}`, confidence: 90,
    });
  } else if (cplStatus === "warning") {
    recs.push({
      id: "cpl_warning", priority: "high", action: "AJUSTAR", category: "creative",
      title: "CPL Elevado — Revisar Criativos e Segmentação",
      description: `CPL em R$ ${metrics.cpl.toFixed(2)} está em zona de alerta. Teste novos criativos, headlines e refine o público para reduzir custo por lead.`,
      metric: "CPL", currentValue: `R$ ${metrics.cpl.toFixed(2)}`,
      targetValue: `R$ ${(cplBm?.ok ?? 20).toFixed(2)}`, confidence: 75,
    });
  }

  // ── ROAS ─────────────────────────────────────────────────────────────────────
  const roasBm     = getBenchmark(productId, "roas");
  const roasStatus = getStatus(metrics.roas, roasBm);

  if (roasStatus === "ok" && metrics.roas >= (roasBm?.ok ?? 4) * 1.3) {
    recs.push({
      id: "roas_scale", priority: "high", action: "ESCALAR", category: "scale",
      title: "ROAS Excelente — Hora de Escalar",
      description: `ROAS de ${metrics.roas.toFixed(1)}x supera a meta em 30%+. Aumente o budget diário em 20–30% para maximizar retorno enquanto a campanha está performando.`,
      metric: "ROAS", currentValue: `${metrics.roas.toFixed(1)}x`,
      targetValue: `${((roasBm?.ok ?? 4) * 1.3).toFixed(1)}x`, confidence: 85,
    });
  } else if (roasStatus === "critical") {
    recs.push({
      id: "roas_critical", priority: "critical", action: "PAUSAR", category: "budget",
      title: "ROAS Crítico — Revisão Urgente de Estratégia",
      description: `ROAS de ${metrics.roas.toFixed(1)}x indica operação no prejuízo. Pause imediatamente e revise targeting, criativos e landing page antes de reativar.`,
      metric: "ROAS", currentValue: `${metrics.roas.toFixed(1)}x`,
      targetValue: `${(roasBm?.ok ?? 4).toFixed(1)}x`, confidence: 92,
    });
  }

  // ── CTR ──────────────────────────────────────────────────────────────────────
  const ctrBm     = getBenchmark(productId, "ctr");
  const ctrStatus = getStatus(metrics.ctr, ctrBm);

  if (ctrStatus === "critical" && metrics.impressions > 1000) {
    recs.push({
      id: "ctr_low", priority: "medium", action: "AJUSTAR", category: "creative",
      title: "CTR Baixo — Criativos sem Engajamento",
      description: `CTR de ${metrics.ctr.toFixed(2)}% indica criativo pouco atrativo. Teste formatos de vídeo, carousel ou copy mais direto com CTA claro.`,
      metric: "CTR", currentValue: `${metrics.ctr.toFixed(2)}%`,
      targetValue: `${(ctrBm?.ok ?? 2).toFixed(1)}%`, confidence: 72,
    });
  }

  // ── Funil de IA ──────────────────────────────────────────────────────────────
  if (metrics.aiQualifyRate < 30 && metrics.leads_raw > 10) {
    recs.push({
      id: "ai_qualify_low", priority: "high", action: "AJUSTAR", category: "funnel",
      title: "Qualificação de IA Baixa — Revisar Fluxo",
      description: `Apenas ${metrics.aiQualifyRate.toFixed(0)}% dos leads são qualificados. Revise critérios e script do agente de IA para aumentar a conversão no funil.`,
      metric: "Taxa Qualif. IA", currentValue: `${metrics.aiQualifyRate.toFixed(0)}%`,
      targetValue: "≥ 60%", confidence: 80,
    });
  }

  if (metrics.aiOverflowRate > 30) {
    recs.push({
      id: "ai_overflow", priority: "medium", action: "AJUSTAR", category: "funnel",
      title: "Overflow de IA Alto — Ampliar Capacidade",
      description: `${metrics.aiOverflowRate.toFixed(0)}% dos atendimentos entram em overflow. Expanda horário humano ou otimize os fluxos para reduzir bottleneck.`,
      metric: "Overflow IA", currentValue: `${metrics.aiOverflowRate.toFixed(0)}%`,
      targetValue: "< 20%", confidence: 70,
    });
  }

  // ── LTV / CAC ────────────────────────────────────────────────────────────────
  if (cac > 0 && ltv > 0) {
    const ratio = ltv / cac;
    if (ratio < 1.5) {
      recs.push({
        id: "ltv_cac_critical", priority: "critical", action: "PAUSAR", category: "financial",
        title: "LTV/CAC Inviável — Revisão Financeira Urgente",
        description: `Relação LTV/CAC de ${ratio.toFixed(1)}x está abaixo do ponto de viabilidade (1.5x). CAC real R$ ${cac.toFixed(0)} vs LTV estimado R$ ${ltv.toFixed(0)}. Revise precificação, volume de compras ou reduza CAC.`,
        metric: "LTV/CAC", currentValue: `${ratio.toFixed(1)}x`,
        targetValue: "≥ 3x", confidence: 88,
      });
    } else if (ratio >= 3) {
      recs.push({
        id: "ltv_cac_scale", priority: "medium", action: "ESCALAR", category: "financial",
        title: "Unit Economics Saudável — Janela de Crescimento",
        description: `LTV/CAC de ${ratio.toFixed(1)}x indica que o negócio sustenta crescimento acelerado. Momento ideal para aumentar investimento em aquisição.`,
        metric: "LTV/CAC", currentValue: `${ratio.toFixed(1)}x`,
        targetValue: "≥ 3x", confidence: 78,
      });
    }
  }

  // ── Monitor se tudo OK ────────────────────────────────────────────────────────
  if (recs.length === 0) {
    recs.push({
      id: "all_good", priority: "low", action: "MONITORAR", category: "scale",
      title: "Métricas Dentro dos Parâmetros",
      description: "Todas as métricas estão dentro ou acima das metas. Continue monitorando e considere testes A/B para otimizações incrementais.",
      metric: "Geral", currentValue: "OK", targetValue: "Manter", confidence: 95,
    });
  }

  return recs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
