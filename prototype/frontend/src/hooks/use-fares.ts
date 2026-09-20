'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLatestFares, SkyRateApiError } from '@/lib/api';
import type { LatestFaresParams, LatestFaresResponse } from '@/types/fare';

export function useFares(initialParams: LatestFaresParams = { limit: 10, offset: 0 }) {
  const [params, setParams] = useState<LatestFaresParams>(initialParams);
  const [data, setData] = useState<LatestFaresResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<SkyRateApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchFares = useCallback(async (qParams: LatestFaresParams) => {
    setIsLoading(true);
    try {
      const res = await getLatestFares(qParams);
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
    fetchFares(params);
  }, [fetchFares, params]);

  const updateFilters = (newFilters: Partial<LatestFaresParams>) => {
    setParams((prev) => ({ ...prev, ...newFilters, offset: 0 }));
  };

  const setPage = (page: number, limit = 10) => {
    setParams((prev) => ({ ...prev, offset: (page - 1) * limit, limit }));
  };

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    params,
    updateFilters,
    setPage,
    refetch: () => fetchFares(params),
  };
}
