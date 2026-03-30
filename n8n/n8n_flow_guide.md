# Guia de Configuração do Fluxo n8n → ADS-AGENT

## Visão Geral do Fluxo

```
[Trigger: Cron / Webhook Meta Ads]
    │
    ▼
[HTTP Request: Meta Ads API] ──▶ [HTTP Request: Google Ads API]
    │                                        │
    └────────────────┬───────────────────────┘
                     ▼
        [Code Node: Normalizar dados]
                     │
                     ▼
        [HTTP Request: Agente IA] (buscar métricas de qualificação)
                     │
                     ▼
        [HTTP Request: Salesforce] (buscar oportunidades)
                     │
                     ▼
        [Code Node: Montar payload ADS-AGENT]
                     │
                     ▼
        [Write Binary File: store.json]  OU
        [HTTP Request POST: /api/ingest]
```

---

## Node 1 — Trigger (Cron diário às 8h)

```json
{
  "type": "n8n-nodes-base.cron",
  "parameters": {
    "rule": { "interval": [{ "field": "hours", "minutesInterval": 0, "hour": 8 }] }
  }
}
```

---

## Node 2 — Meta Ads API

**Tipo:** HTTP Request

```
URL: https://graph.facebook.com/v19.0/act_{AD_ACCOUNT_ID}/insights
Method: GET
Params:
  access_token: {{$credentials.metaToken}}
  fields: spend,impressions,clicks,reach,ctr,cpm,cpc,actions
  date_preset: yesterday
  level: campaign
  breakdowns: (opcional) product_id customizado via UTM
```

---

## Node 3 — Code Node: Normalizar e Montar Payload

```javascript
// Exemplo de Code Node para montar o payload ADS-AGENT
const metaData = $input.all()[0].json.data || [];

const records = metaData.map(campaign => {
  // Extrair product_id via UTM ou nome da campanha
  const productId = extractProductId(campaign.campaign_name);

  return {
    product_id: productId,
    product_label: getProductLabel(productId),
    campaign_name: campaign.campaign_name,
    campaign_id: campaign.campaign_id,
    source: "meta_ads",
    date: new Date().toISOString().split('T')[0],

    // Métricas de Ads
    ad_spend: parseFloat(campaign.spend || 0),
    impressions: parseInt(campaign.impressions || 0),
    clicks: parseInt(campaign.clicks || 0),
    reach: parseInt(campaign.reach || 0),

    // Leads do Agente de IA (buscar do seu sistema)
    leads_raw: parseInt(campaign.actions?.find(a => a.action_type === 'lead')?.value || 0),
    ai_leads_responded: 0,  // Preencher do sistema IA
    leads_qualified_by_ai: 0,  // Preencher do sistema IA
    ai_overflow_count: 0,
    ai_avg_response_minutes: 0,

    // Sentimento (do sistema IA)
    sentiment_positive: 0,
    sentiment_neutral: 0,
    sentiment_negative: 0,
    lead_profile_breakdown: {},

    // CRM (do Salesforce)
    conversion_value: 0,  // Preencher do Salesforce
    crm_stage: "",

    // Insumos
    interest_extended_warranty: 0,
    interest_ink_recurrence: 0,

    currency: "BRL"
  };
});

// Funções auxiliares
function extractProductId(campaignName) {
  if (campaignName.toLowerCase().includes('epson') || campaignName.toLowerCase().includes('g6070')) {
    return 'epson_g6070';
  }
  if (campaignName.toLowerCase().includes('ppf')) {
    return 'ppf';
  }
  return 'outros';
}

function getProductLabel(productId) {
  const labels = { 'epson_g6070': 'Epson G6070', 'ppf': 'PPF', 'outros': 'Outros' };
  return labels[productId] || productId;
}

return records.map(r => ({ json: r }));
```

---

## Node 4 — Merge com dados do Agente IA

**Se seu Agente de IA expõe uma API ou salva em banco de dados:**

```javascript
// Buscar métricas de qualificação da IA via HTTP Request
// URL: http://seu-agente-ia/api/stats?date={date}&campaign_id={campaign_id}
// Retorna: { leads_responded, leads_qualified, overflow_count, avg_response_min, profiles }
```

---

## Node 5 — Write File (desenvolvimento local)

**Tipo:** Write Binary File

```
File Path: /caminho/para/ADS-AGENT/dashboard/data/store.json
Property Name: data
Mode: Append (para acumular histórico) OU Overwrite (para substituir)
```

**Importante:** Para acumular dados históricos, use este Code Node antes de salvar:

```javascript
const fs = require('fs');
const storePath = '/caminho/ADS-AGENT/dashboard/data/store.json';

let existing = [];
try {
  existing = JSON.parse(fs.readFileSync(storePath, 'utf8'));
} catch(e) { existing = []; }

const newRecords = $input.all().map(i => i.json);
const merged = [...existing, ...newRecords];

// Manter apenas últimos 90 dias
const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - 90);
const filtered = merged.filter(r => new Date(r.date) >= cutoff);

return [{ json: { data: JSON.stringify(filtered, null, 2) } }];
```

---

## Dicas de Configuração

1. **UTM Parameters**: Configure UTMs nos anúncios com `utm_content={product_id}` para identificar o produto automaticamente
2. **Webhook de Leads**: Configure o Meta Lead Ads para enviar leads em tempo real via webhook para o n8n
3. **Salesforce**: Use o node oficial do n8n para Salesforce — conecte pela SOQL query:
   ```sql
   SELECT Id, Amount, StageName, Lead_Source_Campaign__c
   FROM Opportunity
   WHERE CreatedDate = YESTERDAY AND AI_Qualified__c = true
   ```
4. **Agendamento**: Rode o fluxo às 8h para dados do dia anterior + às 18h para atualização intraday
5. **Alertas**: Adicione um node de IF após o cálculo de CPL — se CPL > threshold, envie mensagem no WhatsApp/Slack
