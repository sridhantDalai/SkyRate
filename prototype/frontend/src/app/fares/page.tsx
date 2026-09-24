'use client';

import * as React from 'react';
import { useFares } from '@/hooks/use-fares';
import { useFilters } from '@/hooks/use-filters';
import { useOverview } from '@/hooks/use-overview';
import { useIndex } from '@/hooks/use-index';
import { getFareDistribution } from '@/lib/api';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { RouteHighlights } from '@/components/dashboard/route-highlights';
import { FaresTable } from '@/components/tables/fares-table';
import { FareDistributionChart } from '@/components/charts/fare-distribution-chart';
import { FilterBar } from '@/components/filters/filter-bar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FareDistributionResponse } from '@/types/fare';
import { RefreshCw, Clock, Activity } from 'lucide-react';
import { formatRelativeTime, formatTime, formatDate } from '@/lib/formatters';

const DEFAULTS = { route: 'DEL-BOM', limit: 20 };
const PAGE_SIZE = 20;

export default function FaresPage() {
  const { filters, setFilters } = useFilters(DEFAULTS);
  const page = filters.page ?? 1;
  const route = filters.route;
  const carrier = filters.carrier;
  const horizon = filters.horizon;
  const offset = (page - 1) * PAGE_SIZE;

  const [distData, setDistData] = React.useState<FareDistributionResponse | null>(null);
  const [isDistLoading, setIsDistLoading] = React.useState(false);

  const { data: faresData, isLoading, lastUpdated, refetch } = useFares({
    route,
    carrier,
    horizon,
    limit: PAGE_SIZE,
    offset,
  });

  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
    lastUpdated: overviewLastUpdated,
    refetch: refetchOverview,
  } = useOverview();

  const {
    overview: indexOverview,
    isLoading: isIndexLoading,
    error: indexError,
    refetch: refetchIndex,
  } = useIndex();

  const handleRefreshAll = React.useCallback(() => {
    refetch();
    refetchOverview();
    refetchIndex();
  }, [refetch, refetchOverview, refetchIndex]);

  React.useEffect(() => {
    let active = true;
    async function loadDistribution() {
      setIsDistLoading(true);
      try {
        const res = await getFareDistribution({ route, carrier, horizon });
        if (active) { setDistData(res); }
      } catch {
        if (active) setDistData(null);
      } finally {
        if (active) setIsDistLoading(false);
      }
    }
    loadDistribution();
    return () => { active = false; };
  }, [route, carrier, horizon]);

  const fares = faresData?.items ?? [];
  const totalCount = faresData?.total ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className='space-y-6 animate-in fade-in-50 duration-300'>
      {/* 1. Page Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4'>
        <div>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
              Flight Fares Explorer
            </h1>
            <Badge variant='outline' className='text-[10px] gap-1'>
              <Activity className='h-3 w-3 text-emerald-500' />
              Live Flight Data
            </Badge>
          </div>
          <div className='flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap'>
            {overviewLastUpdated && (
              <span className='flex items-center gap-1'>
                <Clock className='h-3 w-3' />
                Refreshed {formatRelativeTime(overviewLastUpdated)} • {formatTime(overviewLastUpdated)} IST
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

      {/* 2. Unified Filter Bar */}
      <FilterBar variant='full' defaults={{ route: 'DEL-BOM', granularity: 'daily' }} withGranularity withHorizons />

      {/* 3. National KPI Cards */}
      <section aria-label='National Key Performance Indicators'>
        <KpiCards
          data={overviewData}
          isLoading={isOverviewLoading || isIndexLoading}
          error={overviewError ?? indexError}
          onRetry={handleRefreshAll}
        />
      </section>

      {/* 4. Active Corridor Highlights */}
      <section aria-label='Active Corridor Highlights'>
        <RouteHighlights route={route || 'DEL-BOM'} />
      </section>

      {(distData || isDistLoading) && (
        <FareDistributionChart
          buckets={distData?.buckets ?? []}
          sampleSize={distData?.sample_size}
          medianFare={distData?.median_fare}
          isLoading={isDistLoading}
        />
      )}

      <Card className='border-border/70'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <div>
            <CardTitle className='text-base font-semibold'>Live Fare Observations</CardTitle>
            <CardDescription className='text-xs'>
              {totalCount > 0
                ? `${totalCount} records · page ${page} of ${Math.max(1, totalPages)}`
                : isLoading
                ? 'Loading observations...'
                : 'No observations found'}
            </CardDescription>
          </div>
          {route && <Badge variant='outline' className='text-[10px]'>{route}</Badge>}
        </CardHeader>
        <CardContent>
          <FaresTable
            fares={fares}
            totalCount={totalCount}
            currentPage={page}
            pageSize={PAGE_SIZE}
            onPageChange={(p) => setFilters({ page: p })}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
