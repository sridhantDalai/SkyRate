'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { formatDate } from '@/lib/formatters';
import type { AnalyticsOverview } from '@/types/analytics';
import type { SkyRateApiError } from '@/lib/api';
import {
  Activity,
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
      <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
        {[1, 2].map((i) => (
          <Card key={i} className='border-border/70 p-5'>
            <div className='flex items-center justify-between'>
              <Skeleton className='h-3 w-28' />
              <Skeleton className='h-8 w-8 rounded-lg' />
            </div>
            <Skeleton className='mt-3 h-8 w-36' />
            <Skeleton className='mt-2 h-4 w-48' />
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
    <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
      {/* 1. RealTime APIx */}
      <Card className='border-border/70 p-5 hover:border-primary/40 transition-colors shadow-sm'>
        <div className='flex items-center justify-between'>
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            Real-Time APIx Index
          </p>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Activity className='h-4 w-4' />
          </div>
        </div>

        <div className='mt-3 flex items-baseline gap-2.5 flex-wrap'>
          <h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground'>
            {data.latest_apix !== null && data.latest_apix !== undefined
              ? data.latest_apix.toFixed(2)
              : '—'}
          </h2>
          <Badge variant='outline' className='text-[10px] font-mono'>
            Base 100.00
          </Badge>
          <span className='text-xs text-muted-foreground font-medium'>
            National Fisher-Ideal Benchmark
          </span>
        </div>

        {change !== undefined && change !== null ? (
          <div className='mt-2.5 flex items-center gap-1.5 text-xs flex-wrap'>
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
            <span className='text-muted-foreground text-[11px]'>vs prior partition cycle · MoSPI CPI reference</span>
          </div>
        ) : (
          <p className='mt-2 text-xs text-muted-foreground'>MoSPI CPI reference baseline</p>
        )}
      </Card>

      {/* 2. Surveillance Partition */}
      <Card className='border-border/70 p-5 hover:border-primary/40 transition-colors shadow-sm'>
        <div className='flex items-center justify-between'>
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            Surveillance Partition
          </p>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Calendar className='h-4 w-4' />
          </div>
        </div>

        <div className='mt-3 flex items-baseline gap-2.5'>
          <h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground'>
            {data.latest_observation_date ? formatDate(data.latest_observation_date) : '—'}
          </h2>
          <Badge variant='success' className='text-[10px]'>
            Live
          </Badge>
        </div>

        <p className='mt-2.5 text-xs text-muted-foreground'>
          Daily automated flight fare surveillance
        </p>
      </Card>
    </div>
  );
}
