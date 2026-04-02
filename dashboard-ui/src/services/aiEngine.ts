/**
 * AI Decision Engine — ADS-AGENT
 * Camada 1: Manus LLM API (chamada real)
 * Camada 2: Motor de regras local (fallback)
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

export type AiEngineSource = "manus" | "rules";

export interface RecommendationsResult {
  recommendations: AiRecommendation[];
  source: AiEngineSource;
  error?: string;
}

const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

// ── Manus LLM API ─────────────────────────────────────────────────────────────

const MANUS_KEY = import.meta.env.VITE_MANUS_API_KEY as string | undefined;
const MANUS_URL = (import.meta.env.VITE_MANUS_API_URL as string | undefined)
  ?? "https://api.manus.im/v1";

function buildPrompt(metrics: AggregatedMetrics, productId: string): string {
  return `Você é um especialista em marketing de performance para a empresa Vinilsul (impressoras Epson e PPF).

Analise as métricas abaixo e retorne APENAS um JSON válido com um array de recomendações priorizadas.

MÉTRICAS ATUAIS (produto: ${productId}):
${JSON.stringify({
    ad_spend:               metrics.ad_spend.toFixed(2),
    impressions:            metrics.impressions,
    clicks:                 metrics.clicks,
    leads_raw:              metrics.leads_raw,
    leads_qualified_by_ai:  metrics.leads_qualified_by_ai,
    ctr:                    metrics.ctr.toFixed(2) + "%",
    cpc:                    "R$ " + metrics.cpc.toFixed(2),
    cpl:                    "R$ " + metrics.cpl.toFixed(2),
    cpm:                    "R$ " + metrics.cpm.toFixed(2),
    roas:                   metrics.roas.toFixed(2) + "x",
    ai_qualify_rate:        metrics.aiQualifyRate.toFixed(1) + "%",
    ai_overflow_rate:       metrics.aiOverflowRate.toFixed(1) + "%",
    ai_retention_rate:      metrics.aiRetentionRate.toFixed(1) + "%",
    conversion_value:       "R$ " + metrics.conversion_value.toFixed(2),
  }, null, 2)}

BENCHMARKS:
- CTR: ok > 2%, alerta < 1%
- CPC: ok < R$2,50, alerta > R$5,00
- CPL: ok < R$20, alerta > R$35
- ROAS: ok > 4x, alerta < 2x
- Taxa Qualificação IA: ok > 60%, alerta < 35%
- Overflow IA: ok < 20%, alerta > 40%

Retorne SOMENTE este JSON (sem markdown, sem texto extra):
[
  {
    "id": "string_unico",
    "priority": "critical|high|medium|low",
    "action": "PAUSAR|ESCALAR|AJUSTAR|MONITORAR",
    "category": "budget|creative|funnel|scale|financial",
    "title": "Título curto e objetivo",
    "description": "Descrição detalhada com contexto e ação específica",
    "metric": "Nome da métrica principal",
    "currentValue": "valor atual formatado",
    "targetValue": "valor meta formatado",
    "confidence": 0-100
  }
]`;
}

async function callManusAPI(
  metrics: AggregatedMetrics,
  productId: string,
): Promise<AiRecommendation[] | null> {
  if (!MANUS_KEY || MANUS_KEY === "SUA_NOVA_CHAVE_AQUI") return null;

  try {
    const res = await fetch(`${MANUS_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${MANUS_KEY}`,
      },
      body: JSON.stringify({
        model:       "manus-pro",
        temperature: 0.3,
        messages: [
          {
            role:    "system",
            content: "Você é um agente de otimização de campanhas de marketing de performance. Responda sempre com JSON válido, sem texto adicional.",
          },
          {
            role:    "user",
            content: buildPrompt(metrics, productId),
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("[Manus] HTTP error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) return null;

    // Extrai JSON mesmo que venha com markdown
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as AiRecommendation[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return parsed.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  } catch (e) {
    console.warn("[Manus] API call failed:", e);
    return null;
  }
}

// ── Motor de Regras (fallback) ────────────────────────────────────────────────

export function generateRecommendations(
  metrics:   AggregatedMetrics,
  productId: string = "default",
): AiRecommendation[] {
  const recs: AiRecommendation[] = [];
  const eco = getEconomics(productId);
  const ltv = calcLTV(productId);
  const cac = calcCAC(metrics.ad_spend, metrics.leads_qualified_by_ai, eco.overhead_monthly);

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

  if (cac > 0 && ltv > 0) {
    const ratio = ltv / cac;
    if (ratio < 1.5) {
      recs.push({
        id: "ltv_cac_critical", priority: "critical", action: "PAUSAR", category: "financial",
        title: "LTV/CAC Inviável — Revisão Financeira Urgente",
        description: `Relação LTV/CAC de ${ratio.toFixed(1)}x está abaixo do ponto de viabilidade (1.5x). CAC real R$ ${cac.toFixed(0)} vs LTV estimado R$ ${ltv.toFixed(0)}.`,
        metric: "LTV/CAC", currentValue: `${ratio.toFixed(1)}x`,
        targetValue: "≥ 3x", confidence: 88,
      });
    } else if (ratio >= 3) {
      recs.push({
        id: "ltv_cac_scale", priority: "medium", action: "ESCALAR", category: "financial",
        title: "Unit Economics Saudável — Janela de Crescimento",
        description: `LTV/CAC de ${ratio.toFixed(1)}x indica que o negócio sustenta crescimento acelerado.`,
        metric: "LTV/CAC", currentValue: `${ratio.toFixed(1)}x`,
        targetValue: "≥ 3x", confidence: 78,
      });
    }
  }

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

// ── Entrada principal (async) ─────────────────────────────────────────────────

export async function getRecommendations(
  metrics:   AggregatedMetrics,
  productId: string = "default",
): Promise<RecommendationsResult> {
  const manusRecs = await callManusAPI(metrics, productId);
  if (manusRecs) {
    return { recommendations: manusRecs, source: "manus" };
  }

  return {
    recommendations: generateRecommendations(metrics, productId),
    source: "rules",
    error: MANUS_KEY && MANUS_KEY !== "SUA_NOVA_CHAVE_AQUI"
      ? "Manus API indisponível — usando motor de regras"
      : undefined,
  };
}
