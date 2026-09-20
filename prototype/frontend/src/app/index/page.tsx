'use client';

import * as React from 'react';
import { useIndex } from '@/hooks/use-index';
import { useOverview } from '@/hooks/use-overview';

import { ApixPipelineDiagram } from '@/components/index/apix-pipeline-diagram';
import { IndexKpiBanner } from '@/components/index/index-kpi-banner';
import { MethodologyBreakdown } from '@/components/index/methodology-breakdown';
import { StateIndexTable } from '@/components/tables/state-index-table';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';

import { RefreshCw, Clock, TrendingUp } from 'lucide-react';

export default function IndexPage() {
  const {
    overview: indexOverview,
    isLoading: isIndexLoading,
    error: indexError,
    lastUpdated: indexUpdated,
    refetch: refetchIndex,
  } = useIndex();

  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useOverview();

  const handleRefresh = () => {
    refetchIndex();
    refetchOverview();
  };

  const formattedTime = indexUpdated
    ? new Date(indexUpdated).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const allIndiaRecords = indexOverview?.all_india || [];
  const stateRecords = indexOverview?.states || [];
  const isAnyLoading = isIndexLoading || isOverviewLoading;

  return (
    <div className='space-y-8 animate-in fade-in-50 duration-300'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4'>
        <div>
          <div className='flex items-center gap-2'>
            <TrendingUp className='h-6 w-6 text-primary' />
            <h1 className='text-2xl font-bold tracking-tight text-foreground'>
              Real-Time Airfare Price Index (APIx)
            </h1>
            <Badge variant='outline' className='text-[10px]'>
              SIH26056 Fisher-Ideal
            </Badge>
          </div>
          <p className='text-xs text-muted-foreground mt-0.5'>
            National passenger tariff indexing benchmarked against MoSPI Consumer Price Index (100.00)
          </p>
        </div>

        <div className='flex items-center gap-3'>
          {formattedTime && (
            <div className='flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/60'>
              <Clock className='h-3.5 w-3.5 text-primary' />
              <span>Last updated: {formattedTime}</span>
            </div>
          )}
          {indexOverview?.partition_table && (
            <Badge variant='outline' className='text-xs font-mono'>
              Partition: {indexOverview.partition_table}
            </Badge>
          )}
          <Button
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            className='gap-1.5 text-xs'
          >
            <RefreshCw className='h-3.5 w-3.5' /> Refresh
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {indexError && (
        <ErrorState
          title='Failed to Load APIx Index Data'
          message={indexError.message}
          code={indexError.code}
          details={indexError.details}
          onRetry={handleRefresh}
        />
      )}

      {/* 1. KEY METRIC DISTINCTION BANNER */}
      <section className='space-y-2'>
        <div className='flex items-center justify-between'>
          <h2 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            Distinct Statistical Indicators
          </h2>
          <span className='text-[11px] text-muted-foreground'>
            Separating Dimensionless Index Points from Percentage Rates and Currency Fares
          </span>
        </div>

        <IndexKpiBanner
          overview={overviewData}
          indexOverview={indexOverview}
          isLoading={isAnyLoading}
        />
      </section>

      {/* 2. VISUAL COMPUTATION PIPELINE DIAGRAM */}
      <section className='space-y-2'>
        <ApixPipelineDiagram />
      </section>

      {/* 3. ALL INDIA INDEX ACROSS HORIZONS */}
      <section className='space-y-3'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-base font-semibold text-foreground'>
              All India Index by Advance-Purchase Horizon
            </h3>
            <p className='text-xs text-muted-foreground'>
              Fisher Ideal price index computed across booking lead-time windows
            </p>
          </div>
          <Badge variant='outline' className='text-[10px]'>
            MoSPI 2024 Base = 100.00
          </Badge>
        </div>

        {isIndexLoading ? (
          <LoadingState height='h-36' message='Loading All India horizon calculations...' />
        ) : allIndiaRecords.length === 0 ? (
          <EmptyState
            title='No Horizon Index Partitions'
            description='FastAPI returned zero horizon records for the current observation partition.'
            actionLabel='Retry Connection'
            onAction={handleRefresh}
          />
        ) : (
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
            {allIndiaRecords.map((item) => {
              const divergence = item.RealTime_APIx - item.MoSPI_Base;
              const isHigher = divergence > 0;
              return (
                <Card
                  key={item.Time_Horizon}
                  className='border-border/70 text-center p-4 hover:border-primary/40 transition-colors'
                >
                  <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    {item.Time_Horizon}
                  </p>
                  <p className='mt-2 text-2xl font-extrabold text-foreground font-mono'>
                    {item.RealTime_APIx.toFixed(2)}
                  </p>
                  <div className='mt-2'>
                    <Badge
                      variant={isHigher ? 'destructive' : 'success'}
                      className='text-[10px]'
                    >
                      {item.Basket_Inflation}
                    </Badge>
                  </div>
                  <p className='mt-2 text-[10px] text-muted-foreground'>
                    Base: {item.MoSPI_Base.toFixed(2)}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. STATE-LEVEL DIVERGENCE TABLE */}
      <section className='space-y-3'>
        <Card className='border-border/70'>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='text-base font-semibold'>
                  State-Level Airfare Inflation & Divergence
                </CardTitle>
                <CardDescription className='text-xs'>
                  Aggregated Fisher Ideal price levels by state origin mapped against national MoSPI baseline
                </CardDescription>
              </div>
              <Badge variant='outline' className='text-xs'>
                {stateRecords.length} States Monitored
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isIndexLoading ? (
              <LoadingState height='h-48' message='Loading state-level index records...' />
            ) : stateRecords.length === 0 ? (
              <EmptyState
                title='No State Index Records'
                description='FastAPI returned zero state records for this observation cycle.'
                actionLabel='Retry Query'
                onAction={handleRefresh}
              />
            ) : (
              <StateIndexTable records={stateRecords} isLoading={false} />
            )}
          </CardContent>
        </Card>
      </section>

      {/* 5. METHODOLOGY & NON-CAUSAL EXPLANATION */}
      <section className='space-y-3'>
        <MethodologyBreakdown />
      </section>
    </div>
  );
}
