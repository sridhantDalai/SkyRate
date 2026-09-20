'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatters';
import type { AnalyticsOverview } from '@/types/analytics';
import type { SkyRateApiError } from '@/lib/api';
import {
  Activity,
  Plane,
  IndianRupee,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface KpiCardsProps {
  data: AnalyticsOverview | null;
  isLoading: boolean;
  error: SkyRateApiError | null;
  onRetry?: () => void;
}

export function KpiCards({ data, isLoading, error, onRetry }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className='border-border/70 p-5'>
            <div className='flex items-center justify-between'>
              <Skeleton className='h-3 w-24' />
              <Skeleton className='h-8 w-8 rounded-lg' />
            </div>
            <Skeleton className='mt-3 h-8 w-32' />
            <Skeleton className='mt-2 h-4 w-40' />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title='Failed to Load Key Performance Indicators'
        message={error.message}
        code={error.code}
        details={error.details}
        onRetry={onRetry}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title='No Overview Metrics Available'
        description='FastAPI analytics/overview endpoint returned empty data or is offline.'
        actionLabel='Retry Connection'
        onAction={onRetry}
      />
    );
  }

  const change = data.percentage_change;
  const isPositive = change !== undefined && change !== null && change > 0;
  const isNegative = change !== undefined && change !== null && change < 0;
  const isZero = change !== undefined && change !== null && change === 0;

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {/* 1. RealTime APIx */}
      <Card className='border-border/70 p-5 hover:border-primary/40 transition-colors'>
        <div className='flex items-center justify-between'>
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            Real-Time APIx Index
          </p>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Activity className='h-4 w-4' />
          </div>
        </div>

        <div className='mt-3 flex items-baseline gap-2'>
          <h2 className='text-2xl sm:text-3xl font-bold tracking-tight text-foreground'>
            {data.latest_apix !== null && data.latest_apix !== undefined
              ? data.latest_apix.toFixed(2)
              : '—'}
          </h2>
          <Badge variant='outline' className='text-[10px]'>
            Base 100.00
          </Badge>
        </div>

        {change !== undefined && change !== null ? (
          <div className='mt-2.5 flex items-center gap-1.5 text-xs'>
            {isPositive && (
              <span className='flex items-center font-semibold text-rose-500'>
                <TrendingUp className='mr-0.5 h-3.5 w-3.5' />
                +{change.toFixed(2)}%
              </span>
            )}
            {isNegative && (
              <span className='flex items-center font-semibold text-emerald-500'>
                <TrendingDown className='mr-0.5 h-3.5 w-3.5' />
                {change.toFixed(2)}%
              </span>
            )}
            {isZero && (
              <span className='flex items-center font-medium text-muted-foreground'>
                <Minus className='mr-0.5 h-3.5 w-3.5' />
                0.00%
              </span>
            )}
            <span className='text-muted-foreground text-[11px]'>vs prior partition</span>
          </div>
        ) : (
          <p className='mt-2 text-xs text-muted-foreground'>MoSPI CPI reference</p>
        )}
      </Card>

      {/* 2. Observed Median Fare */}
      <Card className='border-border/70 p-5 hover:border-primary/40 transition-colors'>
        <div className='flex items-center justify-between'>
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            Observed Median Fare
          </p>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <IndianRupee className='h-4 w-4' />
          </div>
        </div>

        <div className='mt-3 flex items-baseline gap-2'>
          <h2 className='text-2xl sm:text-3xl font-bold tracking-tight text-foreground'>
            {formatCurrency(data.median_fare)}
          </h2>
        </div>

        <p className='mt-2.5 text-xs text-muted-foreground truncate'>
          Range:{' '}
          <strong className='text-foreground font-mono'>
            {formatCurrency(data.lowest_observed_fare)}
          </strong>{' '}
          –{' '}
          <strong className='text-foreground font-mono'>
            {formatCurrency(data.highest_observed_fare)}
          </strong>
        </p>
      </Card>

      {/* 3. Monitored Scope */}
      <Card className='border-border/70 p-5 hover:border-primary/40 transition-colors'>
        <div className='flex items-center justify-between'>
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            Monitored Inventory
          </p>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Plane className='h-4 w-4' />
          </div>
        </div>

        <div className='mt-3 flex items-baseline gap-2'>
          <h2 className='text-2xl sm:text-3xl font-bold tracking-tight text-foreground'>
            {formatNumber(data.number_of_observed_fares)}
          </h2>
          <span className='text-xs text-muted-foreground'>flights</span>
        </div>

        <p className='mt-2.5 text-xs text-muted-foreground'>
          <strong className='text-foreground'>{data.number_of_routes}</strong> Corridors ·{' '}
          <strong className='text-foreground'>{data.number_of_carriers}</strong> Airlines
        </p>
      </Card>

      {/* 4. Data Freshness & Partition */}
      <Card className='border-border/70 p-5 hover:border-primary/40 transition-colors'>
        <div className='flex items-center justify-between'>
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            Data Freshness
          </p>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Calendar className='h-4 w-4' />
          </div>
        </div>

        <div className='mt-3 flex items-baseline gap-2'>
          <h2 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground'>
            {data.latest_observation_date ? formatDate(data.latest_observation_date) : '—'}
          </h2>
        </div>

        <div className='mt-2.5 flex items-center gap-1.5 flex-wrap'>
          <Badge variant='success' className='text-[10px]'>
            Live Partition
          </Badge>
          {data.calculation_date ? (
            <span className='text-[11px] text-muted-foreground'>
              Calculated: {formatDate(data.calculation_date)}
            </span>
          ) : (
            <span className='text-[11px] text-muted-foreground'>DGCA Scope</span>
          )}
        </div>
      </Card>
    </div>
  );
}
