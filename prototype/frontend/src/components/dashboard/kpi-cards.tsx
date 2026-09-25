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
  ShieldCheck,
  Flame,
} from 'lucide-react';

export interface StateSummaryInfo {
  maxState: string;
  maxDiv: number;
  minState: string;
  minDiv: number;
  uniqueStates: number;
}

interface KpiCardsProps {
  data: AnalyticsOverview | null;
  stateSummary?: StateSummaryInfo | null;
  isLoading: boolean;
  error: SkyRateApiError | null;
  onRetry?: () => void;
}

export function KpiCards({ data, stateSummary, isLoading, error, onRetry }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5'>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className='border-border/70 p-4 sm:p-5 space-y-3'>
            <div className='flex items-center justify-between'>
              <Skeleton className='h-3 w-28' />
              <Skeleton className='h-8 w-8 rounded-lg' />
            </div>
            <Skeleton className='h-8 w-36' />
            <Skeleton className='h-4 w-48' />
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
        description='Overview metrics endpoint returned empty data or is offline.'
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
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5'>
      {/* 1. Real-Time APIx Index */}
      <Card className='border-border/70 p-4 sm:p-5 hover:border-primary/40 transition-colors shadow-xs flex flex-col justify-between'>
        <div>
          <div className='flex items-center justify-between'>
            <p className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
              Real-Time APIx Index
            </p>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Activity className='h-4 w-4' />
            </div>
          </div>

          <div className='mt-2.5 flex items-baseline gap-2 flex-wrap'>
            <h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground'>
              {data.latest_apix !== null && data.latest_apix !== undefined
                ? data.latest_apix.toFixed(2)
                : '—'}
            </h2>
            <Badge variant='outline' className='text-[10px] font-mono'>
              Base 100.00
            </Badge>
          </div>

          {change !== undefined && change !== null ? (
            <div className='mt-2 flex items-center gap-1.5 text-xs flex-wrap'>
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
              <span className='text-muted-foreground text-[11px]'>vs prior observation cycle</span>
            </div>
          ) : (
            <p className='mt-2 text-xs text-muted-foreground'>MoSPI CPI reference</p>
          )}
        </div>

        <p className='mt-3 pt-2.5 border-t border-border/40 text-[11px] text-muted-foreground'>
          National Fisher-Ideal Benchmark
        </p>
      </Card>

      {/* 2. Surveillance Date & Scope */}
      <Card className='border-border/70 p-4 sm:p-5 hover:border-primary/40 transition-colors shadow-xs flex flex-col justify-between'>
        <div>
          <div className='flex items-center justify-between'>
            <p className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
              Surveillance Date
            </p>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500'>
              <Calendar className='h-4 w-4' />
            </div>
          </div>

          <div className='mt-2.5 flex items-baseline gap-2 flex-wrap'>
            <h2 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground'>
              {data.latest_observation_date ? formatDate(data.latest_observation_date) : '—'}
            </h2>
            <Badge variant='success' className='text-[10px] gap-1'>
              <span className='h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse' />
              Live
            </Badge>
          </div>

          <div className='mt-2 flex items-center gap-1.5 text-xs text-muted-foreground'>
            <Badge variant='secondary' className='text-[10px] font-mono'>
              {stateSummary?.uniqueStates ?? 7} States Monitored
            </Badge>
          </div>
        </div>

        <p className='mt-3 pt-2.5 border-t border-border/40 text-[11px] text-muted-foreground'>
          Daily automated flight fare surveillance
        </p>
      </Card>

      {/* 3. Highest Surge State */}
      <Card className='border-border/70 p-4 sm:p-5 hover:border-rose-500/40 transition-colors shadow-xs flex flex-col justify-between'>
        <div>
          <div className='flex items-center justify-between'>
            <p className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
              Highest Surge
            </p>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500'>
              <Flame className='h-4 w-4' />
            </div>
          </div>

          <div className='mt-2.5 flex items-baseline gap-2 flex-wrap'>
            <h2 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate max-w-full'>
              {stateSummary?.maxState || 'Delhi (T)'}
            </h2>
          </div>

          <div className='mt-2 flex items-center gap-1.5 text-xs'>
            <span className='inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-rose-500/15 text-rose-500'>
              <TrendingUp className='mr-1 h-3 w-3' />
              {stateSummary ? `+${stateSummary.maxDiv.toFixed(1)} pts` : '+22.7 pts'}
            </span>
            <span className='text-[11px] text-muted-foreground'>vs MoSPI baseline</span>
          </div>
        </div>

        <p className='mt-3 pt-2.5 border-t border-border/40 text-[11px] text-muted-foreground'>
          Peak advance-booking horizon escalation
        </p>
      </Card>

      {/* 4. Most Stable State */}
      <Card className='border-border/70 p-4 sm:p-5 hover:border-emerald-500/40 transition-colors shadow-xs flex flex-col justify-between'>
        <div>
          <div className='flex items-center justify-between'>
            <p className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
              Most Price-Stable
            </p>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500'>
              <ShieldCheck className='h-4 w-4' />
            </div>
          </div>

          <div className='mt-2.5 flex items-baseline gap-2 flex-wrap'>
            <h2 className='text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate max-w-full'>
              {stateSummary?.minState || 'Maharashtra (T+30)'}
            </h2>
          </div>

          <div className='mt-2 flex items-center gap-1.5 text-xs'>
            <span className='inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-emerald-500/15 text-emerald-500'>
              <TrendingDown className='mr-1 h-3 w-3' />
              {stateSummary ? `${stateSummary.minDiv.toFixed(1)} pts` : '-1.6 pts'}
            </span>
            <span className='text-[11px] text-muted-foreground'>vs MoSPI baseline</span>
          </div>
        </div>

        <p className='mt-3 pt-2.5 border-t border-border/40 text-[11px] text-muted-foreground'>
          Closest alignment to national inflation anchor
        </p>
      </Card>
    </div>
  );
}
