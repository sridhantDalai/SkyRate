'use client';

import { useState, useEffect, useCallback } from 'react';
import { getIndexOverview, getIndexComparison, SkyRateApiError } from '@/lib/api';
import type { IndexOverview, IndexCompareResponse } from '@/types/index';

export function useIndex() {
  const [overview, setOverview] = useState<IndexOverview | null>(null);
  const [comparison, setComparison] = useState<IndexCompareResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<SkyRateApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchIndexData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ovData, cmpData] = await Promise.all([
        getIndexOverview(),
        getIndexComparison().catch(() => null),
      ]);
      setOverview(ovData);
      setComparison(cmpData);
      setError(null);
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      setError(err instanceof SkyRateApiError ? err : new SkyRateApiError(err.message));
      setOverview(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndexData();
  }, [fetchIndexData]);

  return { overview, comparison, isLoading, error, lastUpdated, refetch: fetchIndexData };
}
