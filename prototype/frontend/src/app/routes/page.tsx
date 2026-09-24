'use client';

import * as React from 'react';
import { useRouteExplorer } from '@/hooks/use-route-explorer';
import { RouteSearchFilter } from '@/components/routes/route-search-filter';
import { RouteKpiSummary } from '@/components/routes/route-kpi-summary';
import { CarrierDistributionTable } from '@/components/routes/carrier-distribution-table';
import { RecentFaresTable } from '@/components/tables/recent-fares-table';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Compass, Clock, Activity } from 'lucide-react';
import { formatTime, formatRelativeTime } from '@/lib/formatters';

const INITIAL_FILTERS = {
  route: 'DEL-BOM',
  origin: 'DEL',
  destination: 'BOM',
  granularity: 'daily' as const,
};

export default function RoutesPage() {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const {
    filters,
    updateFilters,
    routeDetails,
    distribution,
    carrierAnalytics,
    recentFares,
    indexContext,
    isLoading,
    error,
    lastUpdated,
    refetch,
  } = useRouteExplorer(INITIAL_FILTERS);

  const route = filters.route || 'DEL-BOM';
  const carrierList = carrierAnalytics?.carriers ?? [];

  const handleRefresh = () => {
    setIsRefreshing(true);
    refetch();
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  return (
    <div className='space-y-6 animate-in fade-in-50 duration-300'>

      {/* 1. Header */}
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
            <span>
              Explore live fare data, carrier pricing, and market share for DGCA-monitored Indian air corridors.
              Use the filters below to pick a route, date range, carrier, and booking horizon.
            </span>
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

        <Button
          variant='outline'
          size='sm'
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className='gap-1.5 text-xs h-9 shrink-0'
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing…' : 'Refresh Corridor'}
        </Button>
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

      {/* 3. Route KPI Summary */}
      <section aria-label='Corridor Key Metrics'>
        <RouteKpiSummary
          routeDetails={routeDetails}
          distribution={distribution}
          carrierAnalytics={carrierAnalytics}
          indexContext={indexContext}
          isLoading={isLoading}
          selectedRoute={route}
        />
      </section>

      {/* 4. Airline Distribution Breakdown Table */}
      <section aria-label='Carrier Distribution Table'>
        <CarrierDistributionTable
          carriers={carrierList}
          isLoading={isLoading}
          selectedRoute={route}
        />
      </section>

      {/* 5. Real-Time Raw Fare Observations Table */}
      <section aria-label='Recent Observed Flights'>
        <RecentFaresTable
          data={recentFares}
          isLoading={isLoading}
          error={error}
          onRetry={handleRefresh}
        />
      </section>
    </div>
  );
}
