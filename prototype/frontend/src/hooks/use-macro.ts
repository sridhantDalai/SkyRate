'use client';
import { useState, useEffect, useCallback } from 'react';
import { getMacroAnalytics, SkyRateApiError } from '@/lib/api';
import type { MacroAnalyticsResponse } from '@/types/analytics';

export function useMacro() {
  const [data, setData] = useState<MacroAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<SkyRateApiError | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMacroAnalytics();
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err instanceof SkyRateApiError ? err : new SkyRateApiError(err.message));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
