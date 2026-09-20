'use client';

import { useState, useEffect, useCallback } from 'react';
import { getRoutes, getRouteDetails, SkyRateApiError } from '@/lib/api';
import type { RouteItem, RouteDetails } from '@/types/fare';

export function useRoutes() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [routeDetails, setRouteDetails] = useState<RouteDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<SkyRateApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getRoutes();
      setRoutes(res);
      if (res.length > 0 && !selectedRoute) {
        setSelectedRoute(res[0].route);
      }
      setError(null);
      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      setError(err instanceof SkyRateApiError ? err : new SkyRateApiError(err.message));
      setRoutes([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRoute]);

  const selectRoute = useCallback(async (route: string) => {
    setSelectedRoute(route);
    try {
      const details = await getRouteDetails(route);
      setRouteDetails(details);
    } catch {
      setRouteDetails(null);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  useEffect(() => {
    if (selectedRoute) {
      selectRoute(selectedRoute);
    }
  }, [selectedRoute, selectRoute]);

  return {
    routes,
    selectedRoute,
    routeDetails,
    selectRoute,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchRoutes,
  };
}
