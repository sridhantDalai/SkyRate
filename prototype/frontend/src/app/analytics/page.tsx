'use client';

import * as React from 'react';
import { useFilters } from '@/hooks/use-filters';
import { useElasticity } from '@/hooks/use-elasticity';
import { useCarriers } from '@/hooks/use-carriers';
import { useFeeBreakdown } from '@/hooks/use-fee-breakdown';

import { LeadTimeChart } from '@/components/charts/lead-time-chart';
import { CarrierComparison } from '@/components/charts/carrier-comparison';
import { FareComponentBreakdown } from '@/components/charts/fare-component-breakdown';
import { FilterBar } from '@/components/filters/filter-bar';

import { Button } from '@/components/ui/button';
import { Info, RefreshCw } from 'lucide-react';

const DEFAULTS = { route: 'DEL-BOM', horizon: 'T+1' };

export default function AnalyticsPage() {
  const { filters } = useFilters(DEFAULTS);

  const route = filters.route ?? DEFAULTS.route;
  const horizon = filters.horizon ?? DEFAULTS.horizon;

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
    data: feeData,
    isLoading: isFeeLoading,
    error: feeError,
    refetch: refetchFees,
  } = useFeeBreakdown(route);

  React.useEffect(() => {
    setElasticityRoute(route);
    updateCarrierFilters({ route, horizon });
  }, [route, horizon]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    refetchElasticity();
    refetchCarriers();
    refetchFees();
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4'>
        <div>
          <h1 className='text-xl font-bold text-foreground'>Analytics</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Advance-purchase price behaviour, carrier pricing, and fare component analysis
          </p>
        </div>
        <Button variant='outline' size='sm' onClick={handleRefresh} className='gap-1.5 text-xs'>
          <RefreshCw className='h-3.5 w-3.5' />
          Refresh
        </Button>
      </div>

      <FilterBar
        variant='full'
        defaults={DEFAULTS}
        withHorizons
      />

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
        <div className='xl:col-span-2'>
          <CarrierComparison
            data={carriersData}
            isLoading={isCarriersLoading}
            error={carriersError}
            route={route}
            onRetry={refetchCarriers}
          />
        </div>
        <LeadTimeChart
          data={elasticity}
          isLoading={isElasticityLoading}
          error={elasticityError}
          route={route}
          onRetry={refetchElasticity}
        />
        <FareComponentBreakdown
          data={feeData}
          isLoading={isFeeLoading}
          error={feeError}
          route={route}
          onRetry={refetchFees}
        />
      </div>

      <div className='flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-lg border border-border/50 bg-muted/20'>
        <Info className='h-3.5 w-3.5 mt-0.5 shrink-0 text-primary' />
        <p>
          Advance-purchase curves reflect{' '}
          <strong className='text-foreground'>empirical observed pricing behaviour</strong>.
          Steeper curves indicate stronger yield management by the carrier on the selected corridor.
          These are observational measurements, not causal econometric models.
        </p>
      </div>
    </div>
  );
}
