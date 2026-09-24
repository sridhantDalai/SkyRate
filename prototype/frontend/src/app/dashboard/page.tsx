'use client';

import * as React from 'react';

import { useIndex } from '@/hooks/use-index';

import { useFares } from '@/hooks/use-fares';
import { useFilters } from '@/hooks/use-filters';


import { StateIndexSection } from '@/components/dashboard/state-index-section';
import { MethodologySummaryCard } from '@/components/dashboard/methodology-summary-card';

import { ApixTrendChart } from '@/components/charts/apix-trend-chart';

import { RecentFaresTable } from '@/components/tables/recent-fares-table';


import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

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


  // 2. Index Overview (All-India and State-level records)
  const {
    overview: indexOverview,
    isLoading: isIndexLoading,
    error: indexError,
    refetch: refetchIndex,
  } = useIndex();



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
    refetchIndex();
    refetchFares();
  }, [
    refetchIndex,
    refetchFares,
  ]);

  const stateRecords = indexOverview?.states || [];

  return (
    <div className='space-y-8 animate-in fade-in-50 duration-300'>
      <div className='flex items-center justify-between gap-4 border-b border-border/80 pb-4'>
        <div>
          <h1 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
            Air Price intelligence dashboard
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Real-time macroeconomic monitoring of flight prices, analyzing state-level inflation metrics 
            and advance booking price behaviors using live partitioned datasets.
          </p>
        </div>
        <Button variant='outline' size='sm' onClick={handleRefreshAll} className='gap-2'>
          <RefreshCw className='h-4 w-4' />
          Refresh Data
        </Button>
      </div>

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

        <div className='w-full'>
          {/* 7. All-India Index Progression */}
          <ApixTrendChart
            overview={indexOverview}
            isLoading={isIndexLoading}
            error={indexError}
            onRetry={refetchIndex}
          />
        </div>
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
