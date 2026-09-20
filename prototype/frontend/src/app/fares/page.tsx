'use client';

import * as React from 'react';
import { useFares } from '@/hooks/use-fares';
import { useFilters } from '@/hooks/use-filters';
import { getFareDistribution } from '@/lib/api';
import { FaresTable } from '@/components/tables/fares-table';
import { FareDistributionChart } from '@/components/charts/fare-distribution-chart';
import { FilterBar } from '@/components/filters/filter-bar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FareDistributionResponse } from '@/types/fare';
import { RefreshCw, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatters';

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
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4'>
        <div>
          <h1 className='text-xl font-bold text-foreground'>Flight Fare Explorer</h1>
          {lastUpdated && (
            <p className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
              <Clock className='h-3 w-3' />
              {formatRelativeTime(lastUpdated)}
            </p>
          )}
        </div>
        <Button variant='outline' size='sm' onClick={refetch} className='gap-1.5 text-xs'>
          <RefreshCw className='h-3.5 w-3.5' />
          Refresh
        </Button>
      </div>

      <FilterBar
        variant='corridor-carrier'
        defaults={DEFAULTS}
        withHorizons
        withDateRange
        withSearch
      />

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
