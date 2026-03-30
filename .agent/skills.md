# ADS-AGENT Skills

Skills disponíveis para desenvolvimento e manutenção do dashboard.

---

## skill: validate-schema
**Descrição:** Valida um payload JSON do n8n contra o schema oficial.
**Uso:** `python .agent/data_validator.py --file <caminho_do_json>`
**Quando usar:** Antes de integrar um novo fluxo n8n; após alterar o schema.

---

## skill: calculate-kpis
**Descrição:** Recalcula todos os KPIs a partir dos dados brutos e aplica thresholds de alerta.
**Uso:** `python .agent/kpi_engine.py --input dashboard/data/store.json`
**Saída:** JSON com KPIs calculados + flags de alerta (ok/warning/critical)
**Quando usar:** Para testar lógica de alertas sem subir o Streamlit.

---

## skill: mock-data
**Descrição:** Gera dados mock realistas para qualquer produto/campanha definido.
**Uso:** `python dashboard/data/mock_data.py --products "Epson G6070,PPF" --days 30`
**Quando usar:** Para desenvolver e testar o dashboard sem dados reais.

---

## skill: add-product
**Descrição:** Adiciona um novo produto/campanha ao sistema dinamicamente.
**Procedimento:**
1. Ingestão automática via n8n POST com novo `product_id` — o dashboard detecta automaticamente
2. Nenhuma alteração de código necessária
3. Benchmarks padrão são aplicados; personalizar em `config/settings.py` se necessário

---

## skill: set-benchmark
**Descrição:** Define ou atualiza thresholds de alerta por produto.
**Arquivo:** `dashboard/config/settings.py`
**Estrutura:**
```python
BENCHMARKS = {
    "default": {"cpl_alert": 35.0, "ctr_alert": 1.0, "roas_alert": 2.0},
    "epson_g6070": {"cpl_alert": 40.0, "ctr_alert": 1.5, "roas_alert": 3.0},
    "ppf": {"cpl_alert": 25.0, "ctr_alert": 2.0, "roas_alert": 4.0},
}
```

---

## skill: export-report
**Descrição:** Exporta relatório em CSV/Excel com todos os KPIs do período selecionado.
**Uso:** Botão "Exportar" no dashboard (componente `tables.py`)
**Formatos:** CSV, Excel (.xlsx)

---

## skill: deploy-dashboard
**Descrição:** Deploy do dashboard em produção.
**Opções:**
- Local: `streamlit run dashboard/app.py --server.port 8501`
- Streamlit Cloud: push para GitHub + conectar em share.streamlit.io
- Docker: `docker build -t ads-agent . && docker run -p 8501:8501 ads-agent`

---

## skill: test-webhook
**Descrição:** Testa o endpoint de ingestão com payload de exemplo.
**Comando:**
```bash
curl -X POST http://localhost:8501/api/ingest \
  -H "Content-Type: application/json" \
  -d @n8n/webhook_schema.json
```

---

## Fluxo de Desenvolvimento Recomendado

1. `mock-data` → gera dados de teste
2. `streamlit run dashboard/app.py` → visualiza dashboard
3. Alterar componentes em `dashboard/components/`
4. `validate-schema` → valida integração n8n
5. `calculate-kpis` → verifica lógica de alertas
6. `deploy-dashboard` → publica
