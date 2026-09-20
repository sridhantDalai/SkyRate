'use client';

import { useState, useEffect, useCallback } from 'react';
import { getHealthStatus } from '@/lib/api';
import type { HealthStatus } from '@/types/analytics';

export function useHealth(pollIntervalMs = 20000) {
  const [data, setData] = useState<HealthStatus | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await getHealthStatus();
      setData(res);
      setIsHealthy(res.status === 'ok');
      setError(null);
    } catch (err: any) {
      setIsHealthy(false);
      setError(err.message || 'FastAPI backend unavailable');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    if (pollIntervalMs > 0) {
      const interval = setInterval(checkHealth, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [checkHealth, pollIntervalMs]);

  return { data, isHealthy, isLoading, error, refresh: checkHealth };
}
