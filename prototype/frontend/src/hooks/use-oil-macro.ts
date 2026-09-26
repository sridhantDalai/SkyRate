'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMacroAnalytics, SkyRateApiError } from '@/lib/api';
import type { MacroAnalyticsResponse } from '@/types/analytics';

export function useOilMacro() {
  const [data, setData] = useState<MacroAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<SkyRateApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchOilMacro = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMacroAnalytics();
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
    fetchOilMacro();
  }, [fetchOilMacro]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchOilMacro,
  };
}
