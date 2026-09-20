'use client';

import { useCallback, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DashboardFilters } from '@/types/filters';
import { parseAndValidateFilters, serializeFiltersToSearchParams } from '@/lib/validators';

/**
 * Hook that synchronizes dashboard filter state with URL search parameters.
 *
 * - Reads the current URL on mount/navigation to derive initial state.
 * - Persists validated filter changes back to the URL (replaceState, no history push).
 * - Debounces rapid changes (e.g. text search) via a configurable delay.
 * - Exposes current validated filters and a stable `setFilters` updater.
 */
export function useFilters(defaults: Partial<DashboardFilters> = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Debounce timer ref (cleared on each rapid update)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive current validated filters from URL on every render.
  // This is cheap — no setState needed because the URL IS the state.
  const filters = parseAndValidateFilters(searchParams as unknown as URLSearchParams, defaults);

  const updateURL = useCallback(
    (newParams: URLSearchParams) => {
      const qs = newParams.toString();
      router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
    },
    [router, pathname]
  );

  /**
   * Update one or more filter keys immediately (no debounce).
   * Pass `undefined` values to clear a key from the URL.
   */
  const setFilters = useCallback(
    (partial: Partial<DashboardFilters>) => {
      const current = new URLSearchParams(searchParams.toString());
      const updated = serializeFiltersToSearchParams(partial, current);
      updateURL(updated);
    },
    [searchParams, updateURL]
  );

  /**
   * Debounced update for text search fields — prevents pushing a URL on
   * every keystroke. Default delay is 350 ms.
   */
  const setFiltersDebounced = useCallback(
    (partial: Partial<DashboardFilters>, delayMs = 350) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setFilters(partial);
      }, delayMs);
    },
    [setFilters]
  );

  /** Reset all filter keys tracked by this hook back to their defaults. */
  const resetFilters = useCallback(() => {
    const reset = serializeFiltersToSearchParams(
      {
        route: undefined,
        origin: undefined,
        destination: undefined,
        carrier: undefined,
        horizon: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        granularity: undefined,
        search: undefined,
        page: undefined,
        limit: undefined,
      },
      new URLSearchParams()
    );
    // Apply defaults
    if (defaults.route) reset.set('route', defaults.route);
    if (defaults.granularity) reset.set('granularity', defaults.granularity);
    updateURL(reset);
  }, [defaults, updateURL]);

  return { filters, setFilters, setFiltersDebounced, resetFilters };
}
