'use client';

import * as React from 'react';
import { useRouteExplorer } from '@/hooks/use-route-explorer';
import { RouteSearchFilter } from '@/components/routes/route-search-filter';
import { RouteKpiSummary } from '@/components/routes/route-kpi-summary';
import { CarrierDistributionTable } from '@/components/routes/carrier-distribution-table';
import { CarrierComparison } from '@/components/charts/carrier-comparison';
import { RecentFaresTable } from '@/components/tables/recent-fares-table';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Compass, Clock, Activity, Info } from 'lucide-react';
import { formatTime, formatRelativeTime } from '@/lib/formatters';

const INITIAL_FILTERS = {
  route: 'DEL-BOM',
  origin: 'DEL',
  destination: 'BOM',
  granularity: 'daily' as const,
};

export default function RoutesPage() {
  const {
    filters,
    updateFilters,
    routeDetails,
    distribution,
    carrierAnalytics,
    trends,
    recentFares,
    indexContext,
    isLoading,
    error,
    lastUpdated,
    refetch,
  } = useRouteExplorer(INITIAL_FILTERS);

  const route = filters.route || 'DEL-BOM';
  const carrierList = carrierAnalytics?.carriers ?? [];
  const hasZeroFlights = !isLoading && (recentFares?.items.length ?? 0) === 0 && carrierList.length === 0;

  return (
    <div className='space-y-6 animate-in fade-in-50 duration-300'>
      {/* 1. Header & Live Indicator */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Compass className='h-5 w-5' />
            </div>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
              Route Explorer
            </h1>
            <Badge variant='outline' className='text-[10px] gap-1'>
              <Activity className='h-3 w-3 text-emerald-500' />
              Corridor Intelligence
            </Badge>
            {route && (
              <Badge variant='secondary' className='text-[10px] font-mono'>
                Active: {route}
              </Badge>
            )}
          </div>
          <div className='flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap'>
            <span>DGCA monitored high-frequency Indian trunk corridors</span>
            {lastUpdated && (
              <>
                <span className='hidden sm:inline text-muted-foreground/60'>•</span>
                <span className='flex items-center gap-1'>
                  <Clock className='h-3 w-3' />
                  Updated {formatRelativeTime(lastUpdated)} ({formatTime(lastUpdated)} IST)
                </span>
              </>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={refetch}
            className='gap-1.5 text-xs h-9'
          >
            <RefreshCw className='h-3.5 w-3.5' />
            Refresh Corridor
          </Button>
        </div>
      </div>

      {/* 2. Route Search & Parameter Filters */}
      <section aria-label='Route Search and Parameter Filters'>
        <RouteSearchFilter
          filters={filters}
          onUpdateFilters={updateFilters}
          onReset={() =>
            updateFilters({
              route: 'DEL-BOM',
              origin: 'DEL',
              destination: 'BOM',
              carrier: undefined,
              horizon: undefined,
              dateFrom: undefined,
              dateTo: undefined,
              granularity: 'daily',
            })
          }
        />
      </section>

      {/* Surveillance Coverage Notice if no observations in current period */}
      {hasZeroFlights && (
        <div className='p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in-50 duration-200'>
          <div className='flex items-start gap-2.5'>
            <div className='p-1.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0'>
              <Info className='h-4 w-4' />
            </div>
            <div>
              <p className='font-semibold text-foreground text-xs sm:text-sm'>
                No flight observations recorded for corridor {route} in today&apos;s surveillance batch
              </p>
              <p className='text-muted-foreground text-[11px] sm:text-xs mt-0.5'>
                Corridor physical specifications are displayed. To explore live flight observations and airline distributions, select one of the actively monitored routes:
              </p>
            </div>
          </div>
          <div className='flex items-center gap-1.5 flex-wrap shrink-0'>
            {[
              { r: 'DEL-BOM', count: 13 },
              { r: 'BLR-DEL', count: 4 },
              { r: 'BOM-GOI', count: 3 },
              { r: 'DEL-CCU', count: 3 },
              { r: 'BOM-BLR', count: 2 },
            ].map(({ r, count }) => (
              <button
                key={r}
                type='button'
                onClick={() => {
                  const parts = r.split('-');
                  updateFilters({ route: r, origin: parts[0], destination: parts[1] });
                }}
                className='px-2.5 py-1 rounded-md bg-card hover:bg-primary hover:text-primary-foreground text-foreground border border-border text-[11px] font-mono font-medium transition-colors shadow-xs'
              >
                {r} <span className='opacity-75 text-[10px]'>({count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Route KPI Summary (Current Fare, Historical Shift, Observations, Index Context) */}
      <section aria-label='Corridor Key Metrics'>
        <RouteKpiSummary
          routeDetails={routeDetails}
          distribution={distribution}
          carrierAnalytics={carrierAnalytics}
          trends={trends}
          indexContext={indexContext}
          isLoading={isLoading}
          selectedRoute={route}
        />
      </section>

      {/* 4. Carrier Analytics & Market Share Comparison */}
      <section aria-label='Carrier Comparison'>
        <CarrierComparison
          data={carrierAnalytics}
          isLoading={isLoading}
          error={error}
          route={route}
          onRetry={refetch}
        />
      </section>

      {/* 5. Airline Distribution Breakdown Table */}
      <section aria-label='Carrier Distribution Table'>
        <CarrierDistributionTable
          carriers={carrierList}
          isLoading={isLoading}
          selectedRoute={route}
        />
      </section>

      {/* 7. Real-Time Raw Fare Observations Table */}
      <section aria-label='Recent Observed Flights'>
        <RecentFaresTable
          data={recentFares}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
        />
      </section>
    </div>
  );
}
