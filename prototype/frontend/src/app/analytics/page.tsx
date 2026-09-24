'use client';

import * as React from 'react';
import { useFilters } from '@/hooks/use-filters';
import { useElasticity } from '@/hooks/use-elasticity';
import { useCarriers } from '@/hooks/use-carriers';
import { useTrends } from '@/hooks/use-trends';
import { useFeeBreakdown } from '@/hooks/use-fee-breakdown';

import { LeadTimeChart } from '@/components/charts/lead-time-chart';
import { CarrierComparison } from '@/components/charts/carrier-comparison';
import { RouteTrendChart } from '@/components/charts/route-trend-chart';
import { FareComponentBreakdown } from '@/components/charts/fare-component-breakdown';
import { FilterBar } from '@/components/filters/filter-bar';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, BarChart2, TrendingUp, Clock, Layers } from 'lucide-react';

const DEFAULTS = { route: 'DEL-BOM', horizon: 'T+1', granularity: 'daily' as const };

const CHART_TABS = [
  { id: 'all', label: 'All Charts', icon: Layers },
  { id: 'elasticity', label: 'Lead-Time Elasticity', icon: Clock },
  { id: 'carriers', label: 'Carrier Comparison', icon: BarChart2 },
  { id: 'trends', label: 'Route Trends', icon: TrendingUp },
  { id: 'components', label: 'Fare Components', icon: Layers },
] as const;

type ChartTab = (typeof CHART_TABS)[number]['id'];

export default function AnalyticsPage() {
  const { filters, setFilters } = useFilters(DEFAULTS);
  const [activeTab, setActiveTab] = React.useState<ChartTab>('all');
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const route = filters.route ?? DEFAULTS.route;
  const horizon = filters.horizon ?? DEFAULTS.horizon;
  const granularity = filters.granularity ?? DEFAULTS.granularity;

  const {
    data: elasticity,
    isLoading: isElasticityLoading,
    error: elasticityError,
    setRoute: setElasticityRoute,
    refetch: refetchElasticity,
  } = useElasticity({ route });

  const {
    data: carriersData,
    isLoading: isCarriersLoading,
    error: carriersError,
    updateFilters: updateCarrierFilters,
    refetch: refetchCarriers,
  } = useCarriers({ route, horizon });

  const {
    data: trendsData,
    isLoading: isTrendsLoading,
    error: trendsError,
    updateParams: updateTrendParams,
    refetch: refetchTrends,
  } = useTrends({ route, granularity, days: 30 });

  const {
    data: feeData,
    isLoading: isFeeLoading,
    error: feeError,
    refetch: refetchFees,
  } = useFeeBreakdown(route);

  React.useEffect(() => {
    setElasticityRoute(route);
    updateCarrierFilters({ route, horizon });
    updateTrendParams({ route, granularity });
  }, [route, horizon, granularity]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refetchElasticity();
    refetchCarriers();
    refetchTrends();
    refetchFees();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const show = (chartId: Exclude<ChartTab, 'all'>) =>
    activeTab === 'all' || activeTab === chartId;

  return (
    <div className='space-y-6 animate-in fade-in-50 duration-300'>
      {/* Page Header */}
      <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border/80 pb-4'>
        <div>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
              Analytics
            </h1>
            <Badge variant='outline' className='text-[10px] gap-1'>
              <BarChart2 className='h-3 w-3 text-indigo-500' />
              Live Empirical Data
            </Badge>
          </div>
          <p className='text-xs text-muted-foreground mt-1'>
            Advance-purchase elasticity, carrier pricing, route trends, and fare component breakdown.
            Use the tabs below to focus on a specific chart.
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={handleRefresh}
          disabled={isRefreshing}
          className='gap-1.5 text-xs shrink-0'
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing…' : 'Refresh All'}
        </Button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        variant='full'
        defaults={DEFAULTS}
        withHorizons
        withGranularity
      />

      {/* Chart Focus Tabs */}
      <div className='flex gap-2 flex-wrap'>
        {CHART_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-150
              ${activeTab === id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-transparent text-muted-foreground border-border hover:border-indigo-400 hover:text-indigo-400'
              }`}
          >
            <Icon className='h-3 w-3' />
            {label}
          </button>
        ))}
      </div>

      {/* Charts — all full width, stacked */}
      <div className='space-y-6'>
        {show('elasticity') && (
          <LeadTimeChart
            data={elasticity}
            isLoading={isElasticityLoading}
            error={elasticityError}
            route={route}
            onRetry={refetchElasticity}
          />
        )}
        {show('carriers') && (
          <CarrierComparison
            data={carriersData}
            isLoading={isCarriersLoading}
            error={carriersError}
            route={route}
            onRetry={refetchCarriers}
          />
        )}
        {show('trends') && (
          <RouteTrendChart
            data={trendsData}
            isLoading={isTrendsLoading}
            error={trendsError}
            selectedRoute={route}
            granularity={granularity}
            onGranularityChange={(g) => setFilters({ granularity: g })}
            onRetry={refetchTrends}
          />
        )}
        {show('components') && (
          <FareComponentBreakdown
            data={feeData}
            isLoading={isFeeLoading}
            error={feeError}
            route={route}
            onRetry={refetchFees}
          />
        )}
      </div>

      {/* Contextual Note */}
      <div className='flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-lg border border-border/50 bg-muted/20'>
        <BarChart2 className='h-3.5 w-3.5 mt-0.5 shrink-0 text-indigo-500' />
        <p>
          Advance-purchase curves reflect{' '}
          <strong className='text-foreground'>empirical observed pricing behaviour</strong>.
          Steeper curves indicate stronger yield management by the carrier on the selected corridor.
          These are observational measurements, not causal econometric models.
          Use the <strong className='text-foreground'>filter bar</strong> above to change the route,
          horizon, or granularity, and the <strong className='text-foreground'>tabs</strong> to focus
          on a specific chart.
        </p>
      </div>
    </div>
  );
}
