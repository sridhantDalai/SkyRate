'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFeeBreakdown, SkyRateApiError } from '@/lib/api';
import type { RouteFeeBreakdown } from '@/types/analytics';

export function useFeeBreakdown(route?: string) {
  const [data, setData] = useState<RouteFeeBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<SkyRateApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchBreakdown = useCallback(async (corridor?: string) => {
    setIsLoading(true);
    try {
      const res = await getFeeBreakdown(corridor);
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
    fetchBreakdown(route);
  }, [fetchBreakdown, route]);

  return { data, isLoading, error, lastUpdated, refetch: () => fetchBreakdown(route) };
}
