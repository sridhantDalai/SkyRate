'use client';

import * as React from 'react';
import { useOverview } from '@/hooks/use-overview';
import { useIndex } from '@/hooks/use-index';
import { useTrends } from '@/hooks/use-trends';
import { useElasticity } from '@/hooks/use-elasticity';
import { useFeeBreakdown } from '@/hooks/use-fee-breakdown';
import { useCarriers } from '@/hooks/use-carriers';
import { useFares } from '@/hooks/use-fares';
import { useFilters } from '@/hooks/use-filters';

import { KpiCards } from '@/components/dashboard/kpi-cards';
import { RouteHighlights } from '@/components/dashboard/route-highlights';
import { StateIndexSection } from '@/components/dashboard/state-index-section';
import { MethodologySummaryCard } from '@/components/dashboard/methodology-summary-card';

import { ApixTrendChart } from '@/components/charts/apix-trend-chart';
import { RouteTrendChart } from '@/components/charts/route-trend-chart';
import { LeadTimeChart } from '@/components/charts/lead-time-chart';
import { FareComponentBreakdown } from '@/components/charts/fare-component-breakdown';
import { CarrierComparison } from '@/components/charts/carrier-comparison';
import { RecentFaresTable } from '@/components/tables/recent-fares-table';
import { FilterBar } from '@/components/filters/filter-bar';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, Activity } from 'lucide-react';
import { formatTime, formatRelativeTime, formatDate } from '@/lib/formatters';

const DEFAULTS = {
  route: 'DEL-BOM',
  origin: 'DEL',
  destination: 'BOM',
  granularity: 'daily' as const,
};

export default function DashboardPage() {
  const { filters, setFilters } = useFilters(DEFAULTS);

  const route = filters.route ?? DEFAULTS.route;
  const granularity = filters.granularity ?? DEFAULTS.granularity;

  // 1. National Overview Metrics
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
    lastUpdated,
    refetch: refetchOverview,
  } = useOverview();

  // 2. Index Overview (All-India and State-level records)
  const {
    overview: indexOverview,
    isLoading: isIndexLoading,
    error: indexError,
    refetch: refetchIndex,
  } = useIndex();

  // 3. Route Trends
  const {
    data: trendsData,
    isLoading: isTrendsLoading,
    error: trendsError,
    updateParams: updateTrendParams,
    refetch: refetchTrends,
  } = useTrends({ route, granularity, days: 30 });

  const prevTrendRoute = React.useRef(route);
  const prevGranularity = React.useRef(granularity);

  React.useEffect(() => {
    if (prevTrendRoute.current !== route || prevGranularity.current !== granularity) {
      prevTrendRoute.current = route;
      prevGranularity.current = granularity;
      updateTrendParams({ route, granularity });
    }
  }, [route, granularity, updateTrendParams]);

  // 4. Advance Booking Lead-Time Elasticity
  const {
    data: elasticityData,
    isLoading: isElasticityLoading,
    error: elasticityError,
    setRoute: setElasticityRoute,
    refetch: refetchElasticity,
  } = useElasticity({ route });

  const prevElasticityRoute = React.useRef(route);
  React.useEffect(() => {
    if (prevElasticityRoute.current !== route) {
      prevElasticityRoute.current = route;
      setElasticityRoute(route);
    }
  }, [route, setElasticityRoute]);

  // 5. Statutory Fee Breakdown
  const {
    data: feeData,
    isLoading: isFeeLoading,
    error: feeError,
    refetch: refetchFees,
  } = useFeeBreakdown(route);

  // 6. Carrier Comparison
  const {
    data: carriersData,
    isLoading: isCarriersLoading,
    error: carriersError,
    updateFilters: updateCarrierFilters,
    refetch: refetchCarriers,
  } = useCarriers({ route });

  const prevCarrierRoute = React.useRef(route);
  React.useEffect(() => {
    if (prevCarrierRoute.current !== route) {
      prevCarrierRoute.current = route;
      updateCarrierFilters({ route });
    }
  }, [route, updateCarrierFilters]);

  // 7. Recent Fares
  const {
    data: faresData,
    isLoading: isFaresLoading,
    error: faresError,
    updateFilters: updateFaresFilters,
    refetch: refetchFares,
  } = useFares({ route, limit: 10, offset: 0 });

  const prevFaresRoute = React.useRef(route);
  React.useEffect(() => {
    if (prevFaresRoute.current !== route) {
      prevFaresRoute.current = route;
      updateFaresFilters({ route });
    }
  }, [route, updateFaresFilters]);

  const handleRefreshAll = React.useCallback(() => {
    refetchOverview();
    refetchIndex();
    refetchTrends();
    refetchElasticity();
    refetchFees();
    refetchCarriers();
    refetchFares();
  }, [
    refetchOverview,
    refetchIndex,
    refetchTrends,
    refetchElasticity,
    refetchFees,
    refetchCarriers,
    refetchFares,
  ]);

  const stateRecords = indexOverview?.states || [];

  return (
    <div className='space-y-8 animate-in fade-in-50 duration-300'>
      {/* 1. Dashboard Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4'>
        <div>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
              Airfare Price Intelligence Dashboard
            </h1>
            <Badge variant='outline' className='text-[10px] gap-1'>
              <Activity className='h-3 w-3 text-emerald-500' />
              Live Intelligence
            </Badge>
            <Badge variant='secondary' className='text-[10px]'>
              SIH26056 Specification
            </Badge>
          </div>
          <div className='flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap'>
            {lastUpdated && (
              <span className='flex items-center gap-1'>
                <Clock className='h-3 w-3' />
                Refreshed {formatRelativeTime(lastUpdated)} • {formatTime(lastUpdated)} IST
              </span>
            )}
            {overviewData?.latest_observation_date && (
              <span className='hidden sm:inline text-muted-foreground/60'>•</span>
            )}
            {overviewData?.latest_observation_date && (
              <span>Partition Date: {formatDate(overviewData.latest_observation_date)}</span>
            )}
            {overviewData?.calculation_date && (
              <span className='hidden sm:inline text-muted-foreground/60'>•</span>
            )}
            {overviewData?.calculation_date && (
              <span>Calculated: {formatDate(overviewData.calculation_date)}</span>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleRefreshAll}
            className='gap-1.5 text-xs h-9'
          >
            <RefreshCw className='h-3.5 w-3.5' />
            Refresh All
          </Button>
        </div>
      </div>

      {/* 2. Unified Filter Bar (Route, Granularity, Horizon) */}
      <FilterBar variant='full' defaults={DEFAULTS} withGranularity withHorizons />

      {/* 3. National KPI Cards (Current Index, Change, Freshness, Routes Tracked, Observations) */}
      <section aria-label='National Key Performance Indicators'>
        <KpiCards
          data={overviewData}
          isLoading={isOverviewLoading || isIndexLoading}
          error={overviewError ?? indexError}
          onRetry={handleRefreshAll}
        />
      </section>

      {/* 4. Active Corridor Highlights (Distance, Duration, Density, Monitored Airlines, Surge Window, Median) */}
      <section aria-label='Active Corridor Highlights'>
        <RouteHighlights route={route} />
      </section>

      {/* 5. Core Analytical Charts Grid */}
      <section aria-label='Analytical Charts' className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-base font-bold text-foreground'>
            Price Trends & Advance Booking Dynamics
          </h2>
          <span className='text-xs text-muted-foreground'>
            FastAPI Live Empirical Aggregations
          </span>
        </div>

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
          {/* 7. All-India Index Progression */}
          <ApixTrendChart
            overview={indexOverview}
            isLoading={isIndexLoading}
            error={indexError}
            onRetry={refetchIndex}
          />

          {/* 8. Corridor Fare Trends */}
          <RouteTrendChart
            data={trendsData}
            isLoading={isTrendsLoading}
            error={trendsError}
            selectedRoute={route}
            granularity={granularity}
            onGranularityChange={(g) => setFilters({ granularity: g })}
            onRetry={refetchTrends}
          />

          {/* 9. Advance Booking Window Comparison */}
          <LeadTimeChart
            data={elasticityData}
            isLoading={isElasticityLoading}
            error={elasticityError}
            route={route}
            onRetry={refetchElasticity}
          />

          {/* Statutory Fee Breakdown */}
          <FareComponentBreakdown
            data={feeData}
            isLoading={isFeeLoading}
            error={feeError}
            route={route}
            onRetry={refetchFees}
          />
        </div>
      </section>

      {/* 10. Carrier Comparison Section */}
      <section aria-label='Carrier Comparison'>
        <CarrierComparison
          data={carriersData}
          isLoading={isCarriersLoading}
          error={carriersError}
          route={route}
          onRetry={refetchCarriers}
        />
      </section>

      {/* 6. State-wise Index Section */}
      <section aria-label='State-wise Airfare Price Index'>
        <StateIndexSection
          records={stateRecords}
          isLoading={isIndexLoading}
          error={indexError}
          onRetry={refetchIndex}
        />
      </section>

      {/* Real-time Fare Observations Table */}
      <section aria-label='Recent Fare Observations'>
        <RecentFaresTable
          data={faresData}
          isLoading={isFaresLoading}
          error={faresError}
          onRetry={refetchFares}
        />
      </section>

      {/* 12. Methodology & Data Source Governance Summary */}
      <section aria-label='Methodology and Data Governance'>
        <MethodologySummaryCard />
      </section>
    </div>
  );
}
