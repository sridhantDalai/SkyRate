'use client';

import * as React from 'react';
import { useFilters } from '@/hooks/use-filters';
import { MONITORED_ROUTES, AIRLINE_CARRIERS, AIRPORT_METADATA, HORIZONS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DashboardFilters } from '@/types/filters';
import { RotateCcw, SlidersHorizontal, Search } from 'lucide-react';

const AIRPORTS = Object.entries(AIRPORT_METADATA).map(([code, meta]) => ({
  code,
  city: meta.city,
  name: meta.name,
}));

export type FilterBarVariant = 'full' | 'route-only' | 'corridor-carrier' | 'compact';

interface FilterBarProps {
  /** Which filter controls to show. Defaults to 'full'. */
  variant?: FilterBarVariant;
  /** Defaults applied on mount and on reset. */
  defaults?: Partial<DashboardFilters>;
  /** Additional class for the outer wrapper. */
  className?: string;
  /** Show a search text input (debounced). */
  withSearch?: boolean;
  /** Show granularity selector. */
  withGranularity?: boolean;
  /** Show date range pickers. */
  withDateRange?: boolean;
  /** Show horizon toggle buttons. */
  withHorizons?: boolean;
  /** Called each time filters change (URL is always the source of truth). */
  onChange?: (filters: DashboardFilters) => void;
}

/**
 * Reusable dashboard filter bar synchronized with URL search params.
 *
 * All state lives in the URL — components share filters simply by
 * reading the same query-string. Shareable URLs are automatic.
 */
export function FilterBar({
  variant = 'full',
  defaults = {},
  className,
  withSearch = false,
  withGranularity = false,
  withDateRange = false,
  withHorizons = false,
  onChange,
}: FilterBarProps) {
  const { filters, setFilters, setFiltersDebounced, resetFilters } = useFilters(defaults);

  // Notify parent on each update
  const prevFiltersRef = React.useRef<DashboardFilters>(filters);
  React.useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed = JSON.stringify(prev) !== JSON.stringify(filters);
    if (changed) {
      prevFiltersRef.current = filters;
      onChange?.(filters);
    }
  }, [filters, onChange]);

  const [searchInput, setSearchInput] = React.useState(filters.search ?? '');

  // Keep local search text in sync if URL changes externally (e.g. back/forward)
  React.useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);

  const showRoute = variant === 'full' || variant === 'route-only' || variant === 'corridor-carrier';
  const showOriginDest = variant === 'full';
  const showCarrier = variant === 'full' || variant === 'corridor-carrier';

  const activeCount = [
    filters.route && filters.route !== defaults.route,
    filters.carrier,
    filters.horizon,
    filters.dateFrom,
    filters.dateTo,
    filters.search,
  ].filter(Boolean).length;

  return (
    <div className={cn('rounded-xl border border-border/70 bg-card/80 p-4 space-y-3', className)}>
      {/* Header row */}
      <div className='flex items-center justify-between pb-1'>
        <div className='flex items-center gap-2 text-xs font-semibold text-foreground'>
          <SlidersHorizontal className='h-3.5 w-3.5 text-primary' />
          Filters
          {activeCount > 0 && (
            <Badge className='h-4 px-1.5 text-[10px] font-mono'>{activeCount} active</Badge>
          )}
        </div>
        <Button
          variant='ghost'
          size='xs'
          onClick={resetFilters}
          className='text-xs text-muted-foreground hover:text-foreground gap-1.5'
          disabled={activeCount === 0}
        >
          <RotateCcw className='h-3 w-3' />
          Reset
        </Button>
      </div>

      {/* Main filter grid */}
      <div
        className={cn(
          'grid gap-3',
          variant === 'compact' && 'grid-cols-1 sm:grid-cols-2',
          variant === 'route-only' && 'grid-cols-1',
          variant === 'corridor-carrier' && 'grid-cols-1 sm:grid-cols-2',
          variant === 'full' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        )}
      >
        {/* Optional search */}
        {withSearch && (
          <div className='relative'>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>Search</label>
            <div className='relative'>
              <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none' />
              <Input
                type='text'
                placeholder='Flight, route, carrier...'
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setFiltersDebounced({ search: e.target.value || undefined });
                }}
                className='pl-8 text-xs h-8'
              />
            </div>
          </div>
        )}

        {/* Route selector */}
        {showRoute && (
          <div>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>
              Corridor
            </label>
            <Select
              value={filters.route ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                const parts = val.split('-');
                setFilters({
                  route: val || undefined,
                  origin: parts[0] || undefined,
                  destination: parts[1] || undefined,
                });
              }}
            >
              <option value=''>All Corridors</option>
              {MONITORED_ROUTES.map((r) => (
                <option key={r.route} value={r.route}>
                  {r.route} ({r.origin_city} → {r.destination_city})
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Origin */}
        {showOriginDest && (
          <div>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>
              Origin
            </label>
            <Select
              value={filters.origin ?? ''}
              onChange={(e) => {
                const origin = e.target.value;
                const dest = filters.destination ?? (origin === 'DEL' ? 'BOM' : 'DEL');
                setFilters({ origin: origin || undefined, destination: dest, route: origin && dest ? `${origin}-${dest}` : undefined });
              }}
            >
              <option value=''>Any Origin</option>
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>{a.code} – {a.city}</option>
              ))}
            </Select>
          </div>
        )}

        {/* Destination */}
        {showOriginDest && (
          <div>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>
              Destination
            </label>
            <Select
              value={filters.destination ?? ''}
              onChange={(e) => {
                const dest = e.target.value;
                const origin = filters.origin ?? (dest === 'BOM' ? 'DEL' : 'BOM');
                setFilters({ destination: dest || undefined, origin, route: origin && dest ? `${origin}-${dest}` : undefined });
              }}
            >
              <option value=''>Any Destination</option>
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>{a.code} – {a.city}</option>
              ))}
            </Select>
          </div>
        )}

        {/* Carrier */}
        {showCarrier && (
          <div>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>
              Airline
            </label>
            <Select
              value={filters.carrier ?? ''}
              onChange={(e) => setFilters({ carrier: e.target.value || undefined })}
            >
              <option value=''>All Carriers</option>
              {AIRLINE_CARRIERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
        )}

        {/* Granularity */}
        {withGranularity && (
          <div>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>
              Granularity
            </label>
            <Select
              value={filters.granularity ?? 'daily'}
              onChange={(e) => setFilters({ granularity: (e.target.value || 'daily') as 'daily' | 'weekly' | 'monthly' })}
            >
              <option value='daily'>Daily</option>
              <option value='weekly'>Weekly</option>
              <option value='monthly'>Monthly</option>
            </Select>
          </div>
        )}
      </div>

      {/* Date Range Row */}
      {withDateRange && (
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40'>
          <div>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>
              Date From
            </label>
            <Input
              type='date'
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilters({ dateFrom: e.target.value || undefined })}
              className='text-xs h-8'
            />
          </div>
          <div>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>
              Date To
            </label>
            <Input
              type='date'
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
              className='text-xs h-8'
            />
          </div>
        </div>
      )}

      {/* Horizon Buttons */}
      {withHorizons && (
        <div className='pt-1 border-t border-border/40'>
          <label className='block text-[11px] font-semibold text-muted-foreground mb-2'>
            Advance-Purchase Horizon
          </label>
          <div className='flex flex-wrap gap-1.5'>
            <Button
              type='button'
              size='sm'
              variant={!filters.horizon ? 'default' : 'outline'}
              onClick={() => setFilters({ horizon: undefined })}
              className='text-xs h-7'
            >
              All
            </Button>
            {HORIZONS.map((h) => (
              <Button
                key={h.value}
                type='button'
                size='sm'
                variant={filters.horizon === h.value ? 'default' : 'outline'}
                onClick={() => setFilters({ horizon: filters.horizon === h.value ? undefined : h.value })}
                className='text-xs h-7 font-mono'
                title={h.description}
              >
                {h.value}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
