/**
 * SkyRate Typed Frontend API Client
 *
 * Centralized, production-grade API client communicating exclusively
 * with the FastAPI backend (/api/v1/*).
 *
 * Guarantees:
 * - Centralizes all HTTP requests with zero duplicated fetch logic.
 * - Strictly typed responses mapping directly to FastAPI ResponseEnvelope<T> schemas.
 * - Robust query parameter serialization (arrays, dates, primitives, empty stripping).
 * - Per-request configurable timeout handling with graceful AbortController chaining.
 * - Standardized backend error parsing matching the FastAPI ErrorEnvelope contract.
 * - No hardcoded URLs: Dynamically resolves NEXT_PUBLIC_API_URL.
 * - Zero privileged Supabase credentials / client connections.
 */

import type {
  ResponseEnvelope,
  LatestFaresParams,
  LatestFaresResponse,
  FareHistoryParams,
  FareHistoryResponse,
  FareDistributionParams,
  FareDistributionResponse,
  RouteItem,
  RouteDetails,
} from '@/types/fare';

import type {
  IndexFilterParams,
  LatestIndexResponse,
  IndexOverview,
  StateIndexComparison,
  IndexCompareResponse,
  IndexHistoryItem,
} from '@/types/index';

import type {
  HealthStatus,
  AnalyticsOverview,
  AnalyticsTrendsParams,
  AnalyticsTrendsResponse,
  LeadTimeAnalysisParams,
  LeadTimeAnalysisResponse,
  CarrierAnalyticsParams,
  CarrierAnalyticsResponse,
  RouteFeeBreakdown,
  MacroAnalyticsResponse,
} from '@/types/analytics';

import type {
  AirportMetadata,
  HorizonMetadata,
  CarrierMetadata,
  SystemMetadata,
} from '@/types/metadata';

// ---------------------------------------------------------------------------
// Base URL Configuration
// ---------------------------------------------------------------------------
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// Error Handling Contract
// ---------------------------------------------------------------------------
export class SkyRateApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: Record<string, unknown>;

  constructor(
    message: string,
    code = 'API_ERROR',
    status = 500,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'SkyRateApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Backward-compatibility alias
export const ApiError = SkyRateApiError;

// ---------------------------------------------------------------------------
// Query Parameter Serializer
// ---------------------------------------------------------------------------
export function serializeQueryParams(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item).trim());
        }
      });
    } else {
      searchParams.append(key, String(value).trim());
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// ---------------------------------------------------------------------------
// Request Options & Core Dispatcher
// ---------------------------------------------------------------------------
export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, unknown>;
  timeoutMs?: number;
  signal?: AbortSignal;
  revalidate?: number | false;
}

const DEFAULT_TIMEOUT_MS = 12000;

async function executeRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    params,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: userSignal,
    revalidate = 30,
    headers: customHeaders,
    ...restInit
  } = options;

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const queryString = serializeQueryParams(params);
  const fullUrl = `${API_BASE_URL}${cleanEndpoint}${queryString}`;

  // Timeout & AbortController composition
  const timeoutController = new AbortController();
  let didTimeout = false;

  const timerId = setTimeout(() => {
    didTimeout = true;
    timeoutController.abort();
  }, timeoutMs);

  // Link caller signal if provided
  if (userSignal) {
    if (userSignal.aborted) {
      clearTimeout(timerId);
      throw new SkyRateApiError('Request was aborted by user.', 'REQUEST_ABORTED', 499);
    }
    userSignal.addEventListener('abort', () => timeoutController.abort(), { once: true });
  }

  try {
    const fetchInit: RequestInit & { next?: { revalidate?: number | false } } = {
      ...restInit,
      method: restInit.method || 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...customHeaders,
      },
      signal: timeoutController.signal,
    };

    if (revalidate !== undefined) {
      fetchInit.next = { revalidate };
    }

    const response = await fetch(fullUrl, fetchInit);
    clearTimeout(timerId);

    // Attempt to parse standardized JSON body
    let json: any = null;
    try {
      json = await response.json();
    } catch {
      // Non-JSON response (e.g. 502/504 gateway html error)
      if (!response.ok) {
        throw new SkyRateApiError(
          `HTTP error ${response.status} (${response.statusText || 'Unknown'}).`,
          'HTTP_ERROR',
          response.status
        );
      }
      return (null as unknown) as T;
    }

    // Inspect standardized error contract: { success: false, error: { code, message, details } }
    if (!response.ok || json?.success === false) {
      const err = json?.error || {};
      throw new SkyRateApiError(
        err.message || `Request failed with status ${response.status}`,
        err.code || 'API_ERROR',
        response.status,
        err.details || {}
      );
    }

    // Unpack data from standardized ResponseEnvelope<T>
    const envelope = json as ResponseEnvelope<T>;
    return (envelope.data !== undefined ? envelope.data : json) as T;
  } catch (err: any) {
    clearTimeout(timerId);

    if (err instanceof SkyRateApiError) {
      throw err;
    }

    if (didTimeout) {
      throw new SkyRateApiError(
        `Request to ${endpoint} timed out after ${timeoutMs}ms.`,
        'REQUEST_TIMEOUT',
        408
      );
    }

    if (userSignal?.aborted || err.name === 'AbortError') {
      throw new SkyRateApiError('Request was aborted.', 'REQUEST_ABORTED', 499);
    }

    // Network disconnection or server unreachable
    throw new SkyRateApiError(
      err.message || 'Unable to connect to SkyRate FastAPI service. Please check network connection.',
      'NETWORK_ERROR',
      503
    );
  }
}

// ---------------------------------------------------------------------------
// Namespaced API Client Instance
// ---------------------------------------------------------------------------
export const apiClient = {
  /**
   * Health and service diagnostics
   */
  health: {
    getStatus: (options?: RequestOptions) =>
      executeRequest<HealthStatus>('/health', options),
  },

  /**
   * Flight fare scraping and distribution analytics
   */
  fares: {
    getLatest: (params?: LatestFaresParams, options?: RequestOptions) =>
      executeRequest<LatestFaresResponse>('/fares/latest', { ...options, params: params as any }),

    getHistory: (params?: FareHistoryParams, options?: RequestOptions) =>
      executeRequest<FareHistoryResponse>('/fares/history', { ...options, params: params as any }),

    getDistribution: (params?: FareDistributionParams, options?: RequestOptions) =>
      executeRequest<FareDistributionResponse>('/fares/distribution', { ...options, params: params as any }),
  },

  /**
   * Real-Time APIx Airfare Price Index & State Divergence
   */
  indexes: {
    getLatest: (params?: IndexFilterParams, options?: RequestOptions) =>
      executeRequest<LatestIndexResponse>('/indexes/latest', { ...options, params: params as any }),

    getOverview: (options?: RequestOptions) =>
      executeRequest<IndexOverview>('/indexes/overview', options),

    getStateComparison: (stateName = 'All India', options?: RequestOptions) =>
      executeRequest<StateIndexComparison>(`/indexes/state/${encodeURIComponent(stateName || 'All India')}`, options),

    getHistory: (params?: { state?: string; days?: number }, options?: RequestOptions) =>
      executeRequest<IndexHistoryItem[]>('/indexes/history', { ...options, params: params as any }),

    getComparison: (options?: RequestOptions) =>
      executeRequest<IndexCompareResponse>('/indexes/compare', options),
  },

  /**
   * Advanced Macro & Lead-Time Analytics
   */
  analytics: {
    getOverview: (options?: RequestOptions) =>
      executeRequest<AnalyticsOverview>('/analytics/overview', options),

    getTrends: (params?: AnalyticsTrendsParams, options?: RequestOptions) =>
      executeRequest<AnalyticsTrendsResponse>('/analytics/trends', { ...options, params: params as any }),

    getElasticity: (params?: LeadTimeAnalysisParams, options?: RequestOptions) =>
      executeRequest<LeadTimeAnalysisResponse>('/analytics/elasticity', { ...options, params: params as any }),

    getCarriers: (params?: CarrierAnalyticsParams, options?: RequestOptions) =>
      executeRequest<CarrierAnalyticsResponse>('/analytics/carriers', { ...options, params: params as any }),

    getFeeBreakdown: (route?: string, options?: RequestOptions) =>
      executeRequest<RouteFeeBreakdown>('/analytics/fare-components', {
        ...options,
        params: route ? { route } : undefined,
      }),

    getMacro: (options?: RequestOptions) =>
      executeRequest<MacroAnalyticsResponse>('/analytics/macro/oil', options),
  },

  /**
   * Monitored DGCA Aviation Corridors
   */
  routes: {
    getAll: (options?: RequestOptions) =>
      executeRequest<RouteItem[]>('/routes', options),

    getDetails: (route: string, options?: RequestOptions) =>
      executeRequest<RouteDetails>(`/routes/${encodeURIComponent(route)}`, options),
  },

  /**
   * System Metadata (Airports, Carriers, Horizons, Route pairs)
   */
  metadata: {
    getAll: (options?: RequestOptions) =>
      executeRequest<SystemMetadata>('/metadata', options),

    getAirports: (options?: RequestOptions) =>
      executeRequest<AirportMetadata[]>('/metadata/airports', options),

    getCarriers: (options?: RequestOptions) =>
      executeRequest<CarrierMetadata[]>('/metadata/carriers', options),

    getRoutes: (options?: RequestOptions) =>
      executeRequest<string[]>('/metadata/routes', options),

    getHorizons: (options?: RequestOptions) =>
      executeRequest<HorizonMetadata[]>('/metadata/horizons', options),
  },

  /**
   * Generic request executor for ad-hoc endpoints
   */
  request: <T>(endpoint: string, options?: RequestOptions) =>
    executeRequest<T>(endpoint, options),
};

// ---------------------------------------------------------------------------
// Standalone Functions for Clean Imports
// ---------------------------------------------------------------------------
export const getHealthStatus = (options?: RequestOptions) =>
  apiClient.health.getStatus(options);

export const getLatestFares = (params?: LatestFaresParams, options?: RequestOptions) =>
  apiClient.fares.getLatest(params, options);

export const getFareHistory = (params?: FareHistoryParams, options?: RequestOptions) =>
  apiClient.fares.getHistory(params, options);

export const getFareDistribution = (params?: FareDistributionParams, options?: RequestOptions) =>
  apiClient.fares.getDistribution(params, options);

export const getLatestIndexes = (params?: IndexFilterParams, options?: RequestOptions) =>
  apiClient.indexes.getLatest(params, options);

export const getIndexOverview = (options?: RequestOptions) =>
  apiClient.indexes.getOverview(options);

export const getStateComparison = (state?: string, options?: RequestOptions) =>
  apiClient.indexes.getStateComparison(state || 'All India', options);

export const getIndexComparison = (options?: RequestOptions) =>
  apiClient.indexes.getComparison(options);

export const getIndexHistory = (params?: { state?: string; days?: number }, options?: RequestOptions) =>
  apiClient.indexes.getHistory(params, options);

export const getAnalyticsOverview = (options?: RequestOptions) =>
  apiClient.analytics.getOverview(options);

export const getAnalyticsTrends = (params?: AnalyticsTrendsParams, options?: RequestOptions) =>
  apiClient.analytics.getTrends(params, options);

export const getLeadTimeElasticity = (params?: LeadTimeAnalysisParams, options?: RequestOptions) =>
  apiClient.analytics.getElasticity(params, options);

export const getCarrierAnalytics = (params?: CarrierAnalyticsParams, options?: RequestOptions) =>
  apiClient.analytics.getCarriers(params, options);

export const getFeeBreakdown = (route?: string, options?: RequestOptions) =>
  apiClient.analytics.getFeeBreakdown(route, options);

export const getMacroAnalytics = (options?: RequestOptions) =>
  apiClient.analytics.getMacro(options);

export const getRoutes = (options?: RequestOptions) =>
  apiClient.routes.getAll(options);

export const getRouteDetails = (route: string, options?: RequestOptions) =>
  apiClient.routes.getDetails(route, options);

export const getSystemMetadata = (options?: RequestOptions) =>
  apiClient.metadata.getAll(options);

export default apiClient;
