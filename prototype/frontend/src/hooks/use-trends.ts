'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAnalyticsTrends, SkyRateApiError } from '@/lib/api';
import type { AnalyticsTrendsParams, AnalyticsTrendsResponse } from '@/types/analytics';

export function useTrends(initialParams: AnalyticsTrendsParams = {}) {
  const [params, setParams] = useState<AnalyticsTrendsParams>(initialParams);
  const [data, setData] = useState<AnalyticsTrendsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<SkyRateApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchTrends = useCallback(async (qParams: AnalyticsTrendsParams) => {
    setIsLoading(true);
    try {
      const res = await getAnalyticsTrends(qParams);
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
    fetchTrends(params);
  }, [fetchTrends, params]);

  const updateParams = (newParams: Partial<AnalyticsTrendsParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  };

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    params,
    updateParams,
    refetch: () => fetchTrends(params),
  };
}
