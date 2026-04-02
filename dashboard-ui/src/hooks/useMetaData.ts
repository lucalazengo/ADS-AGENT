/**
 * Hook: useMetaData
 * Orquestra a busca de dados com 3 camadas de fallback:
 *   1. Meta Ads API (real) — quando VITE_META_TOKEN configurado
 *   2. CSVs locais (/public/data/) — dados exportados das plataformas
 *   3. Mock dinâmico — gerado em memória para demo/dev
 */

import { useState, useEffect, useCallback } from "react";
import type { CampaignRecord } from "../data/types";
import type { MetaConnectionStatus } from "../services/metaApi";
import { fetchAccountInfo, fetchCampaignInsights } from "../services/metaApi";
import { loadCsvData } from "../services/csvLoader";
import { getMockData } from "../data/mockData";

export type DataSource = "real" | "csv" | "mock" | "loading";

export interface UseMetaDataReturn {
  records:    CampaignRecord[];
  source:     DataSource;
  connection: MetaConnectionStatus;
  refresh:    () => void;
}

export function useMetaData(dateStart: string, dateEnd: string): UseMetaDataReturn {
  const [records,    setRecords]    = useState<CampaignRecord[]>([]);
  const [source,     setSource]     = useState<DataSource>("loading");
  const [connection, setConnection] = useState<MetaConnectionStatus>({
    connected: false, account: null, error: null,
  });

  const load = useCallback(async () => {
    setSource("loading");

    // ── Camada 1: Meta Ads API real ──────────────────────────────────────────
    const connStatus = await fetchAccountInfo();
    setConnection(connStatus);

    if (connStatus.connected) {
      const { records: realRecords, hasRealData, error } = await fetchCampaignInsights(dateStart, dateEnd);

      if (!error && hasRealData) {
        setRecords(realRecords);
        setSource("real");
        return;
      }

      if (error) {
        console.warn("[ADS-AGENT] Meta API error:", error);
      }
    }

    // ── Camada 2: CSVs exportados ────────────────────────────────────────────
    try {
      const csvRecords = await loadCsvData();
      if (csvRecords.length > 0) {
        // Retorna todos os registros do CSV — a filtragem por data fica
        // exclusivamente no filterRecords() do App.tsx para evitar dupla filtragem.
        setRecords(csvRecords);
        setSource("csv");
        return;
      }
    } catch (e) {
      console.warn("[ADS-AGENT] CSV load failed:", e);
    }

    // ── Camada 3: Mock dinâmico ──────────────────────────────────────────────
    setRecords(getMockData());
    setSource("mock");
  }, [dateStart, dateEnd]);

  useEffect(() => { load(); }, [load]);

  return { records, source, connection, refresh: load };
}
