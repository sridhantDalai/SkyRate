'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getRouteDetails,
  getFareDistribution,
  getCarrierAnalytics,
  getAnalyticsTrends,
  getLeadTimeElasticity,
  getLatestFares,
  getStateComparison,
  SkyRateApiError,
} from '@/lib/api';
import { AIRPORT_METADATA } from '@/lib/constants';
import type { RouteDetails, FareDistributionResponse, LatestFaresResponse } from '@/types/fare';
import type {
  CarrierAnalyticsResponse,
  AnalyticsTrendsResponse,
  LeadTimeAnalysisResponse,
} from '@/types/analytics';
import type { StateIndexComparison } from '@/types/index';

export interface RouteExplorerFilters {
  route: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  horizon?: string;
  dateFrom?: string;
  dateTo?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

function getQueryKey(f: RouteExplorerFilters): string {
  return [
    f.route || '',
    f.origin || '',
    f.destination || '',
    f.carrier || '',
    f.horizon || '',
    f.dateFrom || '',
    f.dateTo || '',
    f.granularity || 'daily',
  ].join('|');
}

export function useRouteExplorer(initialFilters: RouteExplorerFilters) {
  const [filters, setFilters] = useState<RouteExplorerFilters>(() => {
    const f = { ...initialFilters };
    if (!f.origin && f.route && f.route.includes('-')) {
      f.origin = f.route.split('-')[0];
    }
    if (!f.destination && f.route && f.route.includes('-')) {
      f.destination = f.route.split('-')[1];
    }
    return f;
  });

  const [routeDetails, setRouteDetails] = useState<RouteDetails | null>(null);
  const [distribution, setDistribution] = useState<FareDistributionResponse | null>(null);
  const [carrierAnalytics, setCarrierAnalytics] = useState<CarrierAnalyticsResponse | null>(null);
  const [trends, setTrends] = useState<AnalyticsTrendsResponse | null>(null);
  const [elasticity, setElasticity] = useState<LeadTimeAnalysisResponse | null>(null);
  const [recentFares, setRecentFares] = useState<LatestFaresResponse | null>(null);
  const [indexContext, setIndexContext] = useState<StateIndexComparison | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<SkyRateApiError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const lastKeyRef = useRef<string>('');
  const requestIdRef = useRef<number>(0);

  const fetchRouteData = useCallback(async (currentFilters: RouteExplorerFilters, force = false) => {
    const activeRoute = currentFilters.route ||
      (currentFilters.origin && currentFilters.destination
        ? `${currentFilters.origin}-${currentFilters.destination}`
        : 'DEL-BOM');

    const key = getQueryKey(currentFilters);
    if (!force && key === lastKeyRef.current) {
      // Avoid duplicate API calls when filters haven't genuinely changed
      return;
    }
    lastKeyRef.current = key;

    requestIdRef.current += 1;
    const thisRequestId = requestIdRef.current;

    setIsLoading(true);
    setError(null);

    // Determine state for index context (origin state first, then fallback to All India)
    const originCode = currentFilters.origin || (activeRoute.includes('-') ? activeRoute.split('-')[0] : 'DEL');
    const originState = AIRPORT_METADATA[originCode]?.state || 'All India';

    try {
      // Concurrently query FastAPI endpoints without direct Supabase access
      const [
        detailsRes,
        distRes,
        carrierRes,
        trendsRes,
        elasticityRes,
        faresRes,
        indexRes,
      ] = await Promise.all([
        getRouteDetails(activeRoute).catch(() => null),
        getFareDistribution({
          route: activeRoute,
          origin: currentFilters.origin,
          destination: currentFilters.destination,
          carrier: currentFilters.carrier,
          horizon: currentFilters.horizon,
        }).catch(() => null),
        getCarrierAnalytics({
          route: activeRoute,
          horizon: currentFilters.horizon,
          date: currentFilters.dateTo,
        }).catch(() => null),
        getAnalyticsTrends({
          route: activeRoute,
          carrier: currentFilters.carrier,
          horizon: currentFilters.horizon,
          date_from: currentFilters.dateFrom,
          date_to: currentFilters.dateTo,
          granularity: currentFilters.granularity || 'daily',
          days: 30,
        }).catch(() => null),
        getLeadTimeElasticity({
          route: activeRoute,
          carrier: currentFilters.carrier,
        }).catch(() => null),
        getLatestFares({
          route: activeRoute,
          carrier: currentFilters.carrier,
          horizon: currentFilters.horizon,
          limit: 10,
        }).catch(() => null),
        getStateComparison(originState)
          .catch(() => getStateComparison('All India'))
          .catch(() => null),
      ]);

      // Guard against race conditions: only update state if this is the newest request
      if (thisRequestId !== requestIdRef.current) {
        return;
      }

      setRouteDetails(detailsRes);
      setDistribution(distRes);
      setCarrierAnalytics(carrierRes);
      setTrends(trendsRes);
      setElasticity(elasticityRes);
      setRecentFares(faresRes);
      setIndexContext(indexRes);

      // Check if all major endpoints returned null/error
      if (!detailsRes && !distRes && !carrierRes && !trendsRes && !elasticityRes && !faresRes) {
        setError(new SkyRateApiError(`No operational data found on FastAPI for corridor ${activeRoute}`, 'NOT_FOUND', 404));
      } else {
        setError(null);
      }

      setLastUpdated(new Date().toISOString());
    } catch (err: any) {
      if (thisRequestId === requestIdRef.current) {
        setError(err instanceof SkyRateApiError ? err : new SkyRateApiError(err.message));
      }
    } finally {
      if (thisRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchRouteData(filters);
  }, [fetchRouteData, filters]);

  const updateFilters = useCallback((newFilters: Partial<RouteExplorerFilters>) => {
    setFilters((prev) => {
      // Check if any value actually changed to prevent unnecessary re-renders
      let hasChanged = false;
      const updated = { ...prev };

      for (const [k, v] of Object.entries(newFilters)) {
        const key = k as keyof RouteExplorerFilters;
        if (updated[key] !== v) {
          hasChanged = true;
          (updated as any)[key] = v;
        }
      }

      if (!hasChanged) {
        return prev;
      }

      // Keep route, origin, destination synchronized
      if (newFilters.origin && newFilters.destination) {
        updated.route = `${newFilters.origin}-${newFilters.destination}`;
      } else if (newFilters.origin && !newFilters.destination && updated.destination) {
        updated.route = `${newFilters.origin}-${updated.destination}`;
      } else if (!newFilters.origin && newFilters.destination && updated.origin) {
        updated.route = `${updated.origin}-${newFilters.destination}`;
      } else if (newFilters.route && newFilters.route.includes('-')) {
        const parts = newFilters.route.split('-');
        updated.origin = parts[0];
        updated.destination = parts[1];
      }

      return updated;
    });
  }, []);

  return {
    filters,
    updateFilters,
    routeDetails,
    distribution,
    carrierAnalytics,
    trends,
    elasticity,
    recentFares,
    indexContext,
    isLoading,
    error,
    lastUpdated,
    refetch: () => fetchRouteData(filters, true),
  };
}
