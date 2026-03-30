# ADS-AGENT — Dashboard Universal de Performance & IA

## Visão Geral do Projeto
Dashboard de performance para marketing de performance integrado com Agente de IA.
Empresa: Vinilsul (impressoras e insumos — foco inicial: Epson G6070 e PPF).
Stack: Python (Streamlit) + n8n (integração de dados) + Meta/Google Ads + Salesforce CRM.

## Arquitetura do Sistema

```
[Meta Ads / Google Ads]
        │
        ▼
    [n8n Workflow]  ──────────────────────────────────┐
        │                                              │
        ▼                                              ▼
[Agente de IA (qualificação)]               [Salesforce CRM]
        │                                              │
        └──────────────┬───────────────────────────────┘
                       ▼
             [Webhook POST → /api/ingest]
                       │
                       ▼
             [dashboard/data/store.json]
                       │
                       ▼
             [Streamlit Dashboard]
```

## Estrutura de Arquivos

```
ADS-AGENT/
├── CLAUDE.md                    # Este arquivo — planejamento central
├── .agent/
│   ├── skills.md                # Skills e automações disponíveis
│   ├── kpi_engine.py            # Motor de cálculo de KPIs
│   └── data_validator.py        # Validação do schema n8n
├── dashboard/
│   ├── app.py                   # Entry point Streamlit
│   ├── components/
│   │   ├── sidebar.py           # Navegação + filtros dinâmicos
│   │   ├── kpi_cards.py         # Cards com alertas de sangria
│   │   ├── charts.py            # Gráficos interativos (Plotly)
│   │   ├── ai_funnel.py         # Funil IA + sentimento
│   │   └── tables.py            # Tabelas de campanha/criativos
│   ├── data/
│   │   ├── schema.json          # JSON Schema oficial para n8n
│   │   ├── mock_data.py         # Dados mock para dev/demo
│   │   └── store.json           # Persistência local (dev)
│   ├── config/
│   │   └── settings.py          # Benchmarks, thresholds, cores
│   └── requirements.txt
└── n8n/
    ├── webhook_schema.json       # Schema do payload n8n → dashboard
    └── n8n_flow_guide.md         # Guia de configuração dos nodes n8n
```

## Fases de Implementação

### Fase 1 — Estrutura Base (atual)
- [x] CLAUDE.md criado
- [x] .agent/skills.md criado
- [ ] dashboard/app.py com layout base
- [ ] JSON Schema para n8n
- [ ] Mock data funcional

### Fase 2 — Dashboard Core
- [ ] KPI Cards com alertas de sangria (CPL/CPC acima do benchmark)
- [ ] Gráfico de gasto diário por campanha
- [ ] Tabela de performance por campanha/criativo
- [ ] Filtro dinâmico produto/campanha

### Fase 3 — Funil IA
- [ ] Taxa de Retenção da IA
- [ ] Tempo Médio de Resposta
- [ ] Taxa de Transbordo (IA → humano)
- [ ] Gráfico de Sentimento/Perfil do Lead (donut chart)

### Fase 4 — Atribuição e ROAS
- [ ] ROAS Real (Ads Spend vs CRM Value)
- [ ] Monitoramento de insumos/recorrência
- [ ] Integração Salesforce (OAuth)
- [ ] Integração Meta Ads API
- [ ] Integração Google Ads API

### Fase 5 — Automações n8n
- [ ] Webhook de ingestão de dados
- [ ] Alertas automáticos (CPL > threshold)
- [ ] Relatório diário por e-mail/WhatsApp

## KPIs e Benchmarks

### Ads Performance
| KPI | Benchmark Base | Alerta (Sangria) |
|-----|---------------|-----------------|
| CTR | > 2.0% | < 1.0% |
| CPC | < R$ 2,50 | > R$ 5,00 |
| CPL | < R$ 20,00 | > R$ 35,00 |
| CPM | < R$ 20,00 | > R$ 40,00 |

### IA Performance
| KPI | Meta | Alerta |
|-----|------|--------|
| Taxa Retenção IA | > 85% | < 65% |
| Tempo Médio Resposta | < 2 min | > 10 min |
| Taxa Transbordo | < 20% | > 40% |
| Taxa Qualificação | > 60% | < 35% |

### ROAS
| KPI | Meta | Alerta |
|-----|------|--------|
| ROAS | > 4x | < 2x |
| Taxa Conversão Lead→Venda | > 15% | < 5% |

## Paleta de Cores (Branco + Azul Suave)

```python
COLORS = {
    "bg_primary":    "#F8FAFC",   # fundo geral
    "bg_card":       "#FFFFFF",   # cards
    "bg_sidebar":    "#EBF4FF",   # sidebar
    "blue_primary":  "#2D7DD2",   # azul principal
    "blue_light":    "#B3D4F5",   # azul claro
    "blue_dark":     "#1A5CA8",   # azul escuro
    "accent_green":  "#27AE60",   # métricas positivas
    "accent_red":    "#E74C3C",   # alertas / sangria
    "accent_orange": "#F39C12",   # atenção
    "text_primary":  "#1A202C",   # texto principal
    "text_secondary":"#718096",   # texto secundário
    "border":        "#E2E8F0",   # bordas
}
```

## JSON Schema n8n → Dashboard

Ver `n8n/webhook_schema.json` para o schema completo.
O n8n deve fazer POST para `http://localhost:8501/api/ingest` (ou arquivo local em dev).

## Decisões de Arquitetura

1. **Streamlit** escolhido sobre Dash: menor boilerplate, hot-reload nativo, ideal para MVP
2. **Persistência local JSON** em dev; migrar para PostgreSQL/Supabase em produção
3. **Plotly** para gráficos: interatividade nativa com Streamlit
4. **Filtros dinâmicos**: product_id e campaign_name são keys primárias — todo novo produto/campanha aparece automaticamente ao ingerir dados
5. **Benchmarks configuráveis** em `config/settings.py` — sem hardcode no UI

## Comandos Úteis

```bash
# Instalar dependências
pip install -r dashboard/requirements.txt

# Rodar dashboard
streamlit run dashboard/app.py

# Validar schema n8n
python .agent/data_validator.py --file data/sample.json

# Calcular KPIs manualmente
python .agent/kpi_engine.py --input data/store.json
```

## Notas de Integração

### n8n → Dashboard
- Configurar HTTP Request node com POST para endpoint do dashboard
- Body: JSON seguindo `webhook_schema.json`
- Headers: `Content-Type: application/json`, `X-API-Key: {seu_token}`

### Meta Ads API
- Permissões necessárias: `ads_read`, `ads_management`
- Campos: `spend`, `impressions`, `clicks`, `reach`, `ctr`, `cpm`, `cpc`

### Salesforce CRM
- Objeto: `Opportunity` (valor da oportunidade gerada pelo lead)
- Campo custom: `AI_Qualified__c`, `Lead_Source_Campaign__c`
