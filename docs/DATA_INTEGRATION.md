# Guia de Integração de Dados — ADS-AGENT

## Visão Geral

O dashboard consome dados em **3 camadas de fallback**, executadas nesta ordem:

```
┌──────────────────────────────────────────────────────┐
│ 1. Meta Ads API (tempo real)                         │
│    → VITE_META_TOKEN + VITE_META_ACCOUNT_ID          │
├──────────────────────────────────────────────────────┤
│ 2. CSVs exportados (dashboard-ui/public/data/)       │
│    → Dados históricos exportados manualmente         │
├──────────────────────────────────────────────────────┤
│ 3. Mock dinâmico (memória)                           │
│    → Gerado em tempo de execução para demo/dev       │
└──────────────────────────────────────────────────────┘
```

O indicador de fonte aparece no canto superior do dashboard:
- 🟢 **Dados Reais** — conectado à Meta API
- 🟡 **CSV Local** — lendo arquivos exportados
- 🔵 **Demonstração** — dados simulados

---

## Camada 1 — Meta Ads API

### O que é necessário

| Item | Onde obter |
|------|-----------|
| Access Token | Meta Business Suite → Configurações → Tokens |
| Account ID | Gerenciador de Anúncios → URL da conta (`act_XXXXXXXXX`) |
| Permissões no App | `ads_read`, `read_insights` |

### Configuração

Crie o arquivo `.env` na raiz de `dashboard-ui/`:

```bash
# dashboard-ui/.env
VITE_META_TOKEN=EAAxxxxxxxxxxxxxxxxx
VITE_META_ACCOUNT_ID=act_123456789
VITE_META_API_VERSION=v21.0
```

> **Segurança:** nunca commite o `.env`. Ele já está no `.gitignore`.

### Campos extraídos da API

| Campo Meta | Campo interno | Descrição |
|-----------|--------------|-----------|
| `spend` | `ad_spend` | Valor gasto no período (BRL) |
| `impressions` | `impressions` | Total de impressões |
| `clicks` | `clicks` | Cliques no anúncio |
| `reach` | `reach` | Alcance único |
| `ctr` | calculado | Taxa de cliques (%) |
| `cpm` | calculado | Custo por mil impressões |
| `cpc` | calculado | Custo por clique |
| `actions[lead]` | `leads_raw` | Leads capturados |
| `action_values[purchase]` | `conversion_value` | Valor de conversão |

### Mapeamento produto → campanha

O sistema detecta o produto automaticamente pelo nome da campanha:

| Padrão no nome | product_id | Label |
|---------------|-----------|-------|
| `epson`, `g6070` | `epson_g6070` | Epson G6070 |
| `ppf`, `protection film` | `ppf` | PPF (Protection Film) |
| `l3250`, `l3210` | `epson_l3` | Epson L3 Series |
| `l6490`, `l8050` | `epson_l6` | Epson L6/L8 Series |
| `[NOME]` (prefixo) | slug do nome | Nome do prefixo |

**Convenção de nomenclatura recomendada para campanhas:**
```
[PRODUTO] Objetivo - Público
Ex: [EPSON] Conversão - Fundo de Funil
    [PPF] Tráfego - Blog
```

---

## Camada 2 — CSVs Exportados

### Arquivos disponíveis

Localização: `dashboard-ui/public/data/`

```
public/data/
├── meta_ads.csv        ← Exportação do Gerenciador de Anúncios Meta
├── google_ads.csv      ← Exportação do Google Ads
├── ai_agent.csv        ← Dados do Agente de IA (n8n)
└── salesforce_crm.csv  ← Oportunidades do Salesforce CRM
```

---

### `meta_ads.csv` — Meta Ads

**Como exportar:**
1. Acesse o **Gerenciador de Anúncios** → Relatórios
2. Nível: **Campanha**
3. Período: selecione o intervalo desejado
4. Colunas obrigatórias (adicionar via "Personalizar colunas"):

| Coluna no Meta | Nome esperado no CSV |
|---------------|---------------------|
| Data | `date` |
| ID da campanha | `campaign_id` |
| Nome da campanha | `campaign_name` |
| Nome do conjunto | `adset_name` |
| Nome do anúncio | `ad_name` |
| — | `product_id` *(adicionar manualmente)* |
| Valor gasto | `spend` |
| Impressões | `impressions` |
| Cliques no link | `clicks` |
| Alcance | `reach` |
| CTR | `ctr_pct` |
| CPC | `cpc_brl` |
| CPM | `cpm_brl` |
| Frequência | `frequency` |

5. Exportar como **CSV**
6. Substituir `dashboard-ui/public/data/meta_ads.csv`

**Formato esperado:**
```csv
date,campaign_id,campaign_name,adset_name,ad_name,product_id,spend,impressions,clicks,reach,ctr_pct,cpc_brl,cpm_brl,frequency
2026-03-01,23851001,[EPSON] Conversão - Fundo de Funil,Público Quente,Ad_Video,epson_g6070,89.74,7290,169,6196,2.32,0.53,12.31,1.28
```

---

### `google_ads.csv` — Google Ads

**Como exportar:**
1. Acesse o **Google Ads** → Relatórios → Predefinido → Campanha
2. Período: selecione o intervalo
3. Colunas obrigatórias:

| Coluna no Google Ads | Nome esperado no CSV |
|---------------------|---------------------|
| Dia | `date` |
| ID da campanha | `campaign_id` |
| Campanha | `campaign_name` |
| Grupo de anúncios | `ad_group_name` |
| — | `product_id` *(adicionar manualmente)* |
| Custo | `spend` |
| Impressões | `impressions` |
| Cliques | `clicks` |
| CTR | `ctr_pct` |
| CPC médio | `cpc_brl` |
| CPM médio | `cpm_brl` |
| Índice de qualidade | `quality_score` |
| Conversões | `conversions` |
| Valor conv. | `conversion_value_brl` |

4. Exportar como **CSV**
5. Substituir `dashboard-ui/public/data/google_ads.csv`

**Formato esperado:**
```csv
date,campaign_id,campaign_name,ad_group_name,product_id,spend,impressions,clicks,ctr_pct,cpc_brl,cpm_brl,quality_score,conversions,conversion_value_brl
2026-03-01,9001001,[EPSON] Search - Marca,Epson G6070 - Exact,epson_g6070,33.37,2454,76,3.09,0.44,13.6,8,4,3724.04
```

---

### `ai_agent.csv` — Agente de IA (n8n)

Gerado automaticamente pelo workflow n8n ao final de cada dia.

| Campo | Descrição |
|-------|-----------|
| `date` | Data (YYYY-MM-DD) |
| `campaign_name` | Nome da campanha (chave de join) |
| `product_id` | ID do produto |
| `source` | `meta_ads` ou `google_ads` |
| `leads_raw` | Total de leads recebidos |
| `ai_leads_responded` | Leads respondidos pela IA |
| `leads_qualified_by_ai` | Leads qualificados pela IA |
| `ai_overflow_count` | Transbordos para atendente humano |
| `ai_avg_response_minutes` | Tempo médio de resposta (min) |
| `sentiment_positive_pct` | % sentimento positivo |
| `sentiment_neutral_pct` | % sentimento neutro |
| `sentiment_negative_pct` | % sentimento negativo |
| `profile_gestor_atuante_pct` | % perfil Gestor Atuante |
| `profile_quer_comecar_pct` | % perfil Quer Começar |
| `profile_nao_trabalha_pct` | % perfil Não Trabalha |
| `profile_no_negocio_pct` | % perfil No de Negócio |

**Configuração n8n:**
- Nó `Code` ao final do fluxo: agrega métricas por `date + campaign_name`
- Nó `Write Binary File`: salva como `ai_agent.csv` em `/public/data/`
- Agendamento: diário às 23:50

---

### `salesforce_crm.csv` — Salesforce CRM

**Como exportar:**
1. Salesforce → Relatórios → Novo Relatório → Oportunidades
2. Filtros: `Data de Criação` no período desejado
3. Agrupar por: `Lead_Source_Campaign__c` (campo custom)
4. Colunas obrigatórias:

| Campo Salesforce | Nome esperado no CSV |
|-----------------|---------------------|
| Data | `date` |
| `Lead_Source_Campaign__c` | `campaign_name` |
| `Lead_Source_Product__c` | `product_id` |
| Fase | `crm_stage` |
| Valor | `conversion_value_brl` |
| `Interest_Extended_Warranty__c` | `interest_extended_warranty_pct` |
| `Interest_Ink_Recurrence__c` | `interest_ink_recurrence_pct` |

5. Exportar como **CSV**
6. Substituir `dashboard-ui/public/data/salesforce_crm.csv`

**Campos custom necessários no Salesforce:**

```
Lead_Source_Campaign__c  (Text 255)  — nome exato da campanha de origem
Lead_Source_Product__c   (Text 80)   — product_id (ex: epson_g6070)
AI_Qualified__c          (Checkbox)  — lead foi qualificado pela IA?
Interest_Extended_Warranty__c  (Percent) — interesse em garantia estendida
Interest_Ink_Recurrence__c     (Percent) — interesse em recorrência de insumos
```

---

## Camada 3 — Mock Dinâmico

Usado automaticamente quando nem a API nem os CSVs estão disponíveis. Simula 30 dias de dados para os produtos Epson G6070 e PPF com variação aleatória realista.

Configurável em [src/data/mockData.ts](../dashboard-ui/src/data/mockData.ts).

---

## Fluxo de Atualização dos CSVs

### Processo manual (atual)

```
1. Exportar da plataforma (Meta / Google / Salesforce)
2. Renomear conforme padrão acima
3. Copiar para dashboard-ui/public/data/
4. Recarregar o dashboard (F5)
```

### Processo automatizado via n8n (recomendado)

```
[Agendamento Diário 23h]
        │
        ├──→ [Meta Ads API] → formata CSV → salva meta_ads.csv
        ├──→ [Google Ads API] → formata CSV → salva google_ads.csv
        ├──→ [Agente IA — consolidação] → salva ai_agent.csv
        └──→ [Salesforce API] → formata CSV → salva salesforce_crm.csv
                │
                ▼
        [Copia para /public/data/ via SSH ou storage compartilhado]
```

---

## Variáveis de Ambiente

Arquivo `dashboard-ui/.env` (não commitado):

```bash
# Meta Ads API
VITE_META_TOKEN=EAAxxxxxxxxxxxxxxxxx
VITE_META_ACCOUNT_ID=act_123456789
VITE_META_API_VERSION=v21.0

# Google Ads API (futuro)
# VITE_GOOGLE_ADS_TOKEN=
# VITE_GOOGLE_ADS_CUSTOMER_ID=

# Salesforce (futuro)
# VITE_SF_CLIENT_ID=
# VITE_SF_CLIENT_SECRET=
# VITE_SF_INSTANCE_URL=
```

---

## KPIs e Benchmarks

Definidos em [src/config/settings.ts](../dashboard-ui/src/config/settings.ts):

| KPI | Meta | Alerta (sangria) |
|-----|------|-----------------|
| CTR | > 2,0% | < 1,0% |
| CPC | < R$ 2,50 | > R$ 5,00 |
| CPL | < R$ 20,00 | > R$ 35,00 |
| CPM | < R$ 20,00 | > R$ 40,00 |
| ROAS | > 4x | < 2x |
| Taxa Retenção IA | > 85% | < 65% |
| Taxa Transbordo | < 20% | > 40% |
| Taxa Qualificação | > 60% | < 35% |

---

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| Dashboard mostra "Demonstração" | Token não configurado ou CSVs ausentes | Configurar `.env` ou copiar CSVs |
| Meta API retorna erro 190 | Token expirado | Gerar novo token no Meta Business |
| CSV não carrega | Cabeçalhos com nomes diferentes | Renomear colunas conforme tabelas acima |
| Produto aparece como "outros" | Nome da campanha sem padrão `[PRODUTO]` | Adicionar prefixo ou `product_id` manual no CSV |
| Dados desatualizados | CSVs não foram substituídos | Re-exportar e sobrescrever os arquivos |
