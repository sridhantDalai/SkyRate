import { VALID_HORIZONS_LIST, AIRLINE_CARRIERS } from './constants';
import type { DashboardFilters } from '@/types/filters';

const IATA_REGEX = /^[A-Za-z]{3}$/;
const ROUTE_REGEX = /^[A-Za-z]{3}-[A-Za-z]{3}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIATA(code?: string): boolean {
  if (!code) return false;
  return IATA_REGEX.test(code.trim().toUpperCase());
}

export function isValidRoute(route?: string): boolean {
  if (!route) return false;
  return ROUTE_REGEX.test(route.trim().toUpperCase());
}

export function isValidHorizon(horizon?: string): boolean {
  if (!horizon) return false;
  return VALID_HORIZONS_LIST.includes(horizon.trim().toUpperCase() as any);
}

export function isValidDateStr(dateStr?: string): boolean {
  if (!dateStr) return false;
  if (!DATE_REGEX.test(dateStr.trim())) return false;
  const d = new Date(dateStr.trim());
  return !isNaN(d.getTime());
}

export function normalizeRoute(route?: string | null): string | undefined {
  if (!route) return undefined;
  const cleaned = route.trim().toUpperCase();
  return isValidRoute(cleaned) ? cleaned : undefined;
}

export function normalizeIATA(code?: string | null): string | undefined {
  if (!code) return undefined;
  const cleaned = code.trim().toUpperCase();
  return isValidIATA(cleaned) ? cleaned : undefined;
}

export function normalizeCarrier(carrier?: string | null): string | undefined {
  if (!carrier) return undefined;
  const trimmed = carrier.trim();
  if (!trimmed) return undefined;
  const matched = (AIRLINE_CARRIERS as readonly string[]).find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  return matched ?? trimmed;
}

export function normalizeHorizon(horizon?: string | null): string | undefined {
  if (!horizon) return undefined;
  const h = horizon.trim().toUpperCase();
  const remapped = h === 'T1' ? 'T+1' : h === 'T7' ? 'T+7' : h === 'T15' ? 'T+15' : h;
  return isValidHorizon(remapped) ? remapped : undefined;
}

export function normalizeDateStr(dateStr?: string | null): string | undefined {
  if (!dateStr) return undefined;
  const trimmed = dateStr.trim();
  return isValidDateStr(trimmed) ? trimmed : undefined;
}

export function normalizeGranularity(
  g?: string | null
): 'daily' | 'weekly' | 'monthly' | undefined {
  if (!g) return undefined;
  const lower = g.trim().toLowerCase();
  if (lower === 'daily' || lower === 'weekly' || lower === 'monthly') return lower;
  return undefined;
}

export function normalizePositiveInt(
  val?: string | number | null,
  fallback?: number
): number | undefined {
  if (val === undefined || val === null || val === '') return fallback;
  const parsed = typeof val === 'number' ? val : parseInt(val as string, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Parses and validates raw URL search parameters into a typed DashboardFilters object.
 * Invalid or unknown values are silently dropped, preventing injection into API calls.
 */
export function parseAndValidateFilters(
  rawParams: URLSearchParams | Record<string, string | string[] | undefined>,
  defaults: Partial<DashboardFilters> = {}
): DashboardFilters {
  const getParam = (key: string): string | undefined => {
    if (rawParams instanceof URLSearchParams) {
      const val = rawParams.get(key);
      return val !== null ? val : undefined;
    }
    const val = (rawParams as Record<string, string | string[] | undefined>)[key];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const route = normalizeRoute(getParam('route')) ?? defaults.route;
  let origin = normalizeIATA(getParam('origin')) ?? defaults.origin;
  let destination = normalizeIATA(getParam('destination')) ?? defaults.destination;

  // Derive missing origin/destination from route
  if (route && (!origin || !destination)) {
    const parts = route.split('-');
    if (parts.length === 2) {
      if (!origin) origin = normalizeIATA(parts[0]);
      if (!destination) destination = normalizeIATA(parts[1]);
    }
  }

  const carrier = normalizeCarrier(getParam('carrier')) ?? defaults.carrier;
  const horizon = normalizeHorizon(getParam('horizon')) ?? defaults.horizon;
  const dateFrom = normalizeDateStr(getParam('dateFrom')) ?? defaults.dateFrom;
  const dateTo = normalizeDateStr(getParam('dateTo')) ?? defaults.dateTo;
  const granularity = normalizeGranularity(getParam('granularity')) ?? defaults.granularity;

  const rawSearch = getParam('search') ?? getParam('q');
  const search = rawSearch ? rawSearch.trim().slice(0, 100) : defaults.search;

  const page = normalizePositiveInt(getParam('page'), defaults.page);
  const limit = normalizePositiveInt(getParam('limit'), defaults.limit);

  return { route, origin, destination, carrier, horizon, dateFrom, dateTo, granularity, search, page, limit };
}

/**
 * Serializes a partial DashboardFilters object into URLSearchParams,
 * omitting undefined/empty values so URLs stay clean.
 */
export function serializeFiltersToSearchParams(
  filters: Partial<DashboardFilters>,
  existingParams?: URLSearchParams
): URLSearchParams {
  const params = new URLSearchParams(existingParams ? existingParams.toString() : '');

  const setOrDelete = (key: string, val: unknown) => {
    if (val !== undefined && val !== null && val !== '') {
      params.set(key, String(val));
    } else {
      params.delete(key);
    }
  };

  if ('route' in filters) setOrDelete('route', filters.route);
  if ('origin' in filters) setOrDelete('origin', filters.origin);
  if ('destination' in filters) setOrDelete('destination', filters.destination);
  if ('carrier' in filters) setOrDelete('carrier', filters.carrier);
  if ('horizon' in filters) setOrDelete('horizon', filters.horizon);
  if ('dateFrom' in filters) setOrDelete('dateFrom', filters.dateFrom);
  if ('dateTo' in filters) setOrDelete('dateTo', filters.dateTo);
  if ('granularity' in filters) setOrDelete('granularity', filters.granularity);
  if ('search' in filters) setOrDelete('search', filters.search);
  if ('page' in filters) setOrDelete('page', filters.page && filters.page > 1 ? filters.page : undefined);
  if ('limit' in filters) setOrDelete('limit', filters.limit);

  return params;
}
