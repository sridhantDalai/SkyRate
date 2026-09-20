'use client';

import * as React from 'react';
import { useOverview } from '@/hooks/use-overview';
import { useIndex } from '@/hooks/use-index';
import { useTrends } from '@/hooks/use-trends';
import { useElasticity } from '@/hooks/use-elasticity';
import { useFeeBreakdown } from '@/hooks/use-fee-breakdown';
import { useCarriers } from '@/hooks/use-carriers';
import { useFares } from '@/hooks/use-fares';

import { KpiCards } from '@/components/dashboard/kpi-cards';
import { ApixTrendChart } from '@/components/charts/apix-trend-chart';
import { RouteTrendChart } from '@/components/charts/route-trend-chart';
import { LeadTimeChart } from '@/components/charts/lead-time-chart';
import { FareComponentBreakdown } from '@/components/charts/fare-component-breakdown';
import { CarrierComparison } from '@/components/charts/carrier-comparison';
import { RecentFaresTable } from '@/components/tables/recent-fares-table';
import { CorridorFilter } from '@/components/filters/corridor-filter';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock } from 'lucide-react';

export default function DashboardPage() {
  const [selectedRoute, setSelectedRoute] = React.useState<string>('DEL-BOM');
  const [granularity, setGranularity] = React.useState<'daily' | 'weekly' | 'monthly'>('daily');

  // 1. Overview KPIs
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
    lastUpdated: overviewUpdated,
    refetch: refetchOverview,
  } = useOverview();

  // 2. APIx Index Records
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
  } = useTrends({ route: selectedRoute, granularity, days: 30 });

  // 4. Lead-Time Advance Purchase Pricing
  const {
    data: elasticityData,
    isLoading: isElasticityLoading,
    error: elasticityError,
    setRoute: setElasticityRoute,
    refetch: refetchElasticity,
  } = useElasticity({ route: selectedRoute });

  // 5. Fee Component Breakdown
  const {
    data: feeData,
    isLoading: isFeeLoading,
    error: feeError,
    refetch: refetchFees,
  } = useFeeBreakdown(selectedRoute);

  // 6. Carrier Comparison
  const {
    data: carriersData,
    isLoading: isCarriersLoading,
    error: carriersError,
    updateFilters: updateCarrierFilters,
    refetch: refetchCarriers,
  } = useCarriers({ route: selectedRoute });

  // 7. Recent Fares
  const {
    data: faresData,
    isLoading: isFaresLoading,
    error: faresError,
    updateFilters: updateFaresFilters,
    refetch: refetchFares,
  } = useFares({ route: selectedRoute, limit: 10, offset: 0 });

  const handleCorridorChange = (newRoute: string) => {
    const route = newRoute || 'DEL-BOM';
    setSelectedRoute(route);
    updateTrendParams({ route });
    setElasticityRoute(route);
    updateCarrierFilters({ route });
    updateFaresFilters({ route });
  };

  const handleGranularityChange = (g: 'daily' | 'weekly' | 'monthly') => {
    setGranularity(g);
    updateTrendParams({ granularity: g });
  };

  const handleRefreshAll = () => {
    refetchOverview();
    refetchIndex();
    refetchTrends();
    refetchElasticity();
    refetchFees();
    refetchCarriers();
    refetchFares();
  };

  const displayTimestamp = overviewUpdated
    ? new Date(overviewUpdated).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <div className='space-y-6'>
      {/* Header & Last Updated Timestamp */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4'>
        <div>
          <div className='flex items-center gap-2'>
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              SkyRate Analytics Dashboard
            </h1>
            <Badge variant='outline' className='text-[10px]'>
              SIH26056 Production
            </Badge>
          </div>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Empirical airfare intelligence, Fisher-Ideal APIx indexation, and DGCA tariff surveillance
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          {displayTimestamp && (
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/60'>
              <Clock className='h-3.5 w-3.5 text-primary' />
              <span>Last updated: {displayTimestamp}</span>
            </div>
          )}

          <div className='w-56'>
            <CorridorFilter
              value={selectedRoute}
              onChange={handleCorridorChange}
              includeAllOption={false}
            />
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={handleRefreshAll}
            className='gap-1.5 text-xs'
          >
            <RefreshCw className='h-3.5 w-3.5' /> Refresh All
          </Button>
        </div>
      </div>

      {/* 1. KPI Cards */}
      <section className='space-y-2'>
        <KpiCards
          data={overviewData}
          isLoading={isOverviewLoading}
          error={overviewError}
          onRetry={refetchOverview}
        />
      </section>

      {/* 2 & 3. Charts: APIx Index & Route Trend */}
      <section className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <ApixTrendChart
          overview={indexOverview}
          isLoading={isIndexLoading}
          error={indexError}
          onRetry={refetchIndex}
        />

        <RouteTrendChart
          data={trendsData}
          isLoading={isTrendsLoading}
          error={trendsError}
          selectedRoute={selectedRoute}
          granularity={granularity}
          onGranularityChange={handleGranularityChange}
          onRetry={refetchTrends}
        />
      </section>

      {/* 4 & 5. Charts: Lead-Time & Fee Breakdown */}
      <section className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <LeadTimeChart
          data={elasticityData}
          isLoading={isElasticityLoading}
          error={elasticityError}
          route={selectedRoute}
          onRetry={refetchElasticity}
        />

        <FareComponentBreakdown
          data={feeData}
          isLoading={isFeeLoading}
          error={feeError}
          route={selectedRoute}
          onRetry={refetchFees}
        />
      </section>

      {/* 6. Carrier Comparison */}
      <section className='space-y-2'>
        <CarrierComparison
          data={carriersData}
          isLoading={isCarriersLoading}
          error={carriersError}
          route={selectedRoute}
          onRetry={refetchCarriers}
        />
      </section>

      {/* 7. Recent Data Table */}
      <section className='space-y-2'>
        <RecentFaresTable
          data={faresData}
          isLoading={isFaresLoading}
          error={faresError}
          onRetry={refetchFares}
        />
      </section>
    </div>
  );
}
