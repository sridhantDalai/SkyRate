'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import type { AnalyticsOverview } from '@/types/analytics';
import type { IndexOverview } from '@/types/index';
import { Activity, Percent, IndianRupee, Scale, TrendingUp, TrendingDown } from 'lucide-react';

interface IndexKpiBannerProps {
  overview: AnalyticsOverview | null;
  indexOverview: IndexOverview | null;
  isLoading: boolean;
}

export function IndexKpiBanner({ overview, indexOverview, isLoading }: IndexKpiBannerProps) {
  if (isLoading) {
    return (
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className='p-4 border-border/70'>
            <Skeleton className='h-3 w-24' />
            <Skeleton className='mt-2 h-8 w-32' />
            <Skeleton className='mt-2 h-3 w-40' />
          </Card>
        ))}
      </div>
    );
  }

  // 1. Index Value (Points, NOT currency, NOT percentage)
  const indexValue = overview?.latest_apix ?? indexOverview?.all_india?.[0]?.RealTime_APIx ?? null;

  // 2. Percentage Change (Rate of change between partitions)
  const pctChange = overview?.percentage_change ?? null;
  const isPositive = pctChange !== null && pctChange > 0;
  const isNegative = pctChange !== null && pctChange < 0;

  // 3. Observed Fare Statistics (Actual INR currency amounts)
  const medianFare = overview?.median_fare ?? null;
  const lowestFare = overview?.lowest_observed_fare ?? null;
  const highestFare = overview?.highest_observed_fare ?? null;
  const flightCount = overview?.number_of_observed_fares ?? 0;

  // 4. Benchmark Baseline Divergence
  const baselineDivergence = indexValue !== null ? indexValue - 100.0 : null;

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {/* 1. INDEX VALUE */}
      <Card className='border-border/70 p-4 bg-primary/5 border-primary/30'>
        <div className='flex items-center justify-between'>
          <span className='text-[11px] font-bold text-primary uppercase tracking-wider'>
            APIx Index Value
          </span>
          <Activity className='h-4 w-4 text-primary' />
        </div>
        <div className='mt-2'>
          <div className='flex items-baseline gap-2'>
            <h2 className='text-3xl font-extrabold tracking-tight text-foreground'>
              {indexValue !== null ? indexValue.toFixed(2) : '—'}
            </h2>
            <span className='text-xs font-semibold text-muted-foreground'>pts</span>
          </div>
          <p className='text-[11px] text-muted-foreground mt-1'>
            Dimensionless Index (MoSPI Base = 100.00)
          </p>
        </div>
      </Card>

      {/* 2. PERCENTAGE CHANGE */}
      <Card className='border-border/70 p-4'>
        <div className='flex items-center justify-between'>
          <span className='text-[11px] font-bold text-muted-foreground uppercase tracking-wider'>
            Index % Change
          </span>
          <Percent className='h-4 w-4 text-primary' />
        </div>
        <div className='mt-2'>
          <div className='flex items-baseline gap-2'>
            <h2 className='text-3xl font-extrabold tracking-tight text-foreground'>
              {pctChange !== null ? (pctChange > 0 ? `+${pctChange.toFixed(2)}%` : `${pctChange.toFixed(2)}%`) : '—'}
            </h2>
          </div>
          <div className='mt-1 flex items-center gap-1 text-[11px] text-muted-foreground'>
            {isPositive && <TrendingUp className='h-3.5 w-3.5 text-rose-500' />}
            {isNegative && <TrendingDown className='h-3.5 w-3.5 text-emerald-500' />}
            <span>Rate of change vs prior observation cycle</span>
          </div>
        </div>
      </Card>

      {/* 3. OBSERVED FARE STATISTICS */}
      <Card className='border-border/70 p-4'>
        <div className='flex items-center justify-between'>
          <span className='text-[11px] font-bold text-muted-foreground uppercase tracking-wider'>
            Observed Fare Median
          </span>
          <IndianRupee className='h-4 w-4 text-primary' />
        </div>
        <div className='mt-2'>
          <h2 className='text-2xl font-bold tracking-tight text-foreground'>
            {formatCurrency(medianFare)}
          </h2>
          <p className='text-[11px] text-muted-foreground mt-1 truncate'>
            Spread: {formatCurrency(lowestFare)} – {formatCurrency(highestFare)} ({formatNumber(flightCount)} flights)
          </p>
        </div>
      </Card>

      {/* 4. BASELINE DIVERGENCE */}
      <Card className='border-border/70 p-4'>
        <div className='flex items-center justify-between'>
          <span className='text-[11px] font-bold text-muted-foreground uppercase tracking-wider'>
            Basket Divergence
          </span>
          <Scale className='h-4 w-4 text-primary' />
        </div>
        <div className='mt-2'>
          <div className='flex items-baseline gap-2'>
            <h2 className='text-3xl font-extrabold tracking-tight text-foreground'>
              {baselineDivergence !== null
                ? (baselineDivergence > 0 ? `+${baselineDivergence.toFixed(2)}` : baselineDivergence.toFixed(2))
                : '—'}
            </h2>
            <span className='text-xs font-semibold text-muted-foreground'>pts</span>
          </div>
          <p className='text-[11px] text-muted-foreground mt-1'>
            Deviation from 2024 Reference Baseline
          </p>
        </div>
      </Card>
    </div>
  );
}
