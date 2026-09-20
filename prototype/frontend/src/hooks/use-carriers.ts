'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCarrierAnalytics, SkyRateApiError } from '@/lib/api';
import type { CarrierAnalyticsParams, CarrierAnalyticsResponse } from '@/types/analytics';

export function useCarriers(initialParams: CarrierAnalyticsParams = {}) {
  const [params, setParams] = useState<CarrierAnalyticsParams>(initialParams);
  const [data, setData] = useState<CarrierAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<SkyRateApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchCarriers = useCallback(async (qParams: CarrierAnalyticsParams) => {
    setIsLoading(true);
    try {
      const res = await getCarrierAnalytics(qParams);
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
    fetchCarriers(params);
  }, [fetchCarriers, params]);

  const updateFilters = (newParams: Partial<CarrierAnalyticsParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  };

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    params,
    updateFilters,
    refetch: () => fetchCarriers(params),
  };
}
