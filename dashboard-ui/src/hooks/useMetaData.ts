/**
 * Hook: useMetaData
 * Orquestra a busca de dados da Meta Ads API.
 * - Tenta dados reais primeiro
 * - Fallback para mock quando conta sandbox / sem campanhas
 * - Expõe status da conexão para o Sidebar
 */

import { useState, useEffect, useCallback } from "react";
import type { CampaignRecord } from "../data/types";
import type { MetaConnectionStatus } from "../services/metaApi";
import { fetchAccountInfo, fetchCampaignInsights } from "../services/metaApi";
import { getMockData } from "../data/mockData";

export type DataSource = "real" | "mock" | "loading";

export interface UseMetaDataReturn {
  records:     CampaignRecord[];
  source:      DataSource;
  connection:  MetaConnectionStatus;
  refresh:     () => void;
}

export function useMetaData(dateStart: string, dateEnd: string): UseMetaDataReturn {
  const [records,    setRecords]    = useState<CampaignRecord[]>([]);
  const [source,     setSource]     = useState<DataSource>("loading");
  const [connection, setConnection] = useState<MetaConnectionStatus>({
    connected: false, account: null, error: null,
  });

  const load = useCallback(async () => {
    setSource("loading");

    // 1. Verifica conexão
    const connStatus = await fetchAccountInfo();
    setConnection(connStatus);

    if (!connStatus.connected) {
      setRecords(getMockData());
      setSource("mock");
      return;
    }

    // 2. Tenta buscar dados reais
    const { records: realRecords, hasRealData, error } = await fetchCampaignInsights(dateStart, dateEnd);

    if (error) {
      console.warn("[ADS-AGENT] Meta API error:", error);
      setRecords(getMockData());
      setSource("mock");
      return;
    }

    if (hasRealData) {
      setRecords(realRecords);
      setSource("real");
    } else {
      // Conta conectada mas sem campanhas — usa mock com aviso
      setRecords(getMockData());
      setSource("mock");
    }
  }, [dateStart, dateEnd]);

  useEffect(() => { load(); }, [load]);

  return { records, source, connection, refresh: load };
}
