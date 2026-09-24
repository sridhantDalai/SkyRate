'use client';

import * as React from 'react';
import { useRouteExplorer } from '@/hooks/use-route-explorer';
import { RouteSearchFilter } from '@/components/routes/route-search-filter';
import { RouteKpiSummary } from '@/components/routes/route-kpi-summary';
import { CarrierDistributionTable } from '@/components/routes/carrier-distribution-table';
import { RouteTrendChart } from '@/components/charts/route-trend-chart';
import { LeadTimeChart } from '@/components/charts/lead-time-chart';
import { CarrierComparison } from '@/components/charts/carrier-comparison';
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
  const {
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
    refetch,
  } = useRouteExplorer(INITIAL_FILTERS);

  const route = filters.route || 'DEL-BOM';
  const granularity = filters.granularity || 'daily';
  const carrierList = carrierAnalytics?.carriers ?? [];

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

      {/* 4. Analytical Charts Grid (Fare Trends & Booking Horizon Comparison) */}
      <section aria-label='Price Trends and Elasticity' className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-base font-bold text-foreground'>
            Fare Evolution & Booking Window Dynamics
          </h2>
          <span className='text-xs text-muted-foreground'>
            FastAPI Live Time Series
          </span>
        </div>

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
          {/* Historical Fare Trends Chart */}
          <RouteTrendChart
            data={trends}
            isLoading={isLoading}
            error={error}
            selectedRoute={route}
            granularity={granularity}
            onGranularityChange={(g) => updateFilters({ granularity: g })}
            onRetry={refetch}
          />

          {/* Advance Booking Window Elasticity Chart */}
          <LeadTimeChart
            data={elasticity}
            isLoading={isLoading}
            error={error}
            route={route}
            onRetry={refetch}
          />
        </div>
      </section>

      {/* 5. Carrier Analytics & Market Share Comparison */}
      <section aria-label='Carrier Comparison'>
        <CarrierComparison
          data={carrierAnalytics}
          isLoading={isLoading}
          error={error}
          route={route}
          onRetry={refetch}
        />
      </section>

      {/* 6. Airline Distribution Breakdown Table */}
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
