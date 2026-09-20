'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLeadTimeElasticity, SkyRateApiError } from '@/lib/api';
import type { LeadTimeAnalysisParams, LeadTimeAnalysisResponse } from '@/types/analytics';

export function useElasticity(initialParams: LeadTimeAnalysisParams = {}) {
  const [params, setParams] = useState<LeadTimeAnalysisParams>(initialParams);
  const [data, setData] = useState<LeadTimeAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<SkyRateApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchElasticity = useCallback(async (qParams: LeadTimeAnalysisParams) => {
    setIsLoading(true);
    try {
      const res = await getLeadTimeElasticity(qParams);
      setData(res);
      setError(null);
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      setError(err instanceof SkyRateApiError ? err : new SkyRateApiError(err.message));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchElasticity(params);
  }, [fetchElasticity, params]);

  const setRoute = (route: string) => {
    setParams((prev) => ({ ...prev, route }));
  };

  const setCarrier = (carrier?: string) => {
    setParams((prev) => ({ ...prev, carrier }));
  };

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    params,
    setRoute,
    setCarrier,
    refetch: () => fetchElasticity(params),
  };
}
