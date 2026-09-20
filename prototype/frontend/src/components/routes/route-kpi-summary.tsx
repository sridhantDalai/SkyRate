'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import type { RouteDetails, FareDistributionResponse } from '@/types/fare';
import type { CarrierAnalyticsResponse, AnalyticsTrendsResponse } from '@/types/analytics';
import type { StateIndexComparison } from '@/types/index';
import {
  IndianRupee,
  Activity,
  Navigation,
  Clock,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Calendar,
} from 'lucide-react';

interface RouteKpiSummaryProps {
  routeDetails: RouteDetails | null;
  distribution: FareDistributionResponse | null;
  carrierAnalytics: CarrierAnalyticsResponse | null;
  trends?: AnalyticsTrendsResponse | null;
  indexContext?: StateIndexComparison | null;
  isLoading: boolean;
  selectedRoute: string;
}

export function RouteKpiSummary({
  routeDetails,
  distribution,
  carrierAnalytics,
  trends,
  indexContext,
  isLoading,
  selectedRoute,
}: RouteKpiSummaryProps) {
  if (isLoading) {
    return (
      <div className='space-y-3'>
        <div className='p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between'>
          <Skeleton className='h-6 w-48' />
          <Skeleton className='h-5 w-32' />
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className='p-4 border-border/70'>
              <Skeleton className='h-3 w-24' />
              <Skeleton className='mt-2 h-7 w-32' />
              <Skeleton className='mt-2 h-3 w-40' />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Current fare metrics from distribution
  const medianFare = distribution?.median_fare ?? null;
  const minFare = distribution?.min_fare ?? null;
  const maxFare = distribution?.max_fare ?? null;
  const observations = distribution?.sample_size ?? carrierAnalytics?.total_observations ?? 0;

  // Availability from carrier analytics
  const carriers = carrierAnalytics?.carriers || [];
  const totalAvailable = carriers.reduce((acc, c) => acc + (c.available_count || 0), 0);
  const totalSoldOut = carriers.reduce((acc, c) => acc + (c.sold_out_count || 0), 0);
  const totalReported = totalAvailable + totalSoldOut;
  const availablePct = totalReported > 0 ? ((totalAvailable / totalReported) * 100).toFixed(1) : null;

  // Historical fare analysis from trends time series
  const series = trends?.series || [];
  let historicalTrendShift: number | null = null;
  let historicalAvgFare: number | null = null;

  if (series.length >= 2) {
    const earliest = series[0].value;
    const latest = series[series.length - 1].value;
    if (earliest > 0) {
      historicalTrendShift = ((latest - earliest) / earliest) * 100;
    }
    const sum = series.reduce((acc, p) => acc + p.value, 0);
    historicalAvgFare = sum / series.length;
  } else if (series.length === 1) {
    historicalAvgFare = series[0].value;
  }

  const isTrendPositive = historicalTrendShift !== null && historicalTrendShift > 0;
  const isTrendNegative = historicalTrendShift !== null && historicalTrendShift < 0;

  return (
    <div className='space-y-3'>
      {/* Route Corridor Badge Bar */}
      <div className='flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border/80 shadow-sm'>
        <div className='flex items-center gap-2.5 flex-wrap'>
          <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-mono text-sm font-bold'>
            <span>{selectedRoute}</span>
          </div>
          {routeDetails && (
            <span className='text-xs font-medium text-foreground'>
              ({routeDetails.origin_city} ➔ {routeDetails.destination_city})
            </span>
          )}
          {routeDetails?.density && (
            <Badge
              variant={
                routeDetails.density.toLowerCase() === 'high'
                  ? 'destructive'
                  : routeDetails.density.toLowerCase() === 'medium'
                  ? 'warning'
                  : 'secondary'
              }
              className='text-[10px]'
            >
              {routeDetails.density} Traffic Density
            </Badge>
          )}
          {distribution?.partition_date && (
            <Badge variant='outline' className='text-[10px] gap-1 font-mono'>
              <Calendar className='h-3 w-3 text-primary' />
              Partition: {distribution.partition_date}
            </Badge>
          )}
        </div>

        <div className='flex items-center gap-3 text-xs text-muted-foreground flex-wrap'>
          {routeDetails?.distance_km && (
            <span className='flex items-center gap-1'>
              <Navigation className='h-3.5 w-3.5 text-primary' />
              <span className='font-mono font-medium text-foreground'>{routeDetails.distance_km} km</span>
            </span>
          )}
          {routeDetails?.avg_flight_duration && (
            <span className='flex items-center gap-1'>
              <Clock className='h-3.5 w-3.5 text-primary' />
              <span>Block Time: <strong className='text-foreground font-mono'>{routeDetails.avg_flight_duration}</strong></span>
            </span>
          )}
          {routeDetails?.peak_surge_window && (
            <Badge variant='secondary' className='text-[10px]'>
              Peak: {routeDetails.peak_surge_window}
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* 1. Current Fare (Median & Range) */}
        <Card className='border-border/70 p-4 hover:border-primary/40 transition-colors'>
          <div className='flex items-center justify-between'>
            <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
              Current Median Fare
            </span>
            <div className='flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary'>
              <IndianRupee className='h-3.5 w-3.5' />
            </div>
          </div>
          <div className='mt-2'>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              {formatCurrency(medianFare)}
            </h2>
            <p className='text-[11px] text-muted-foreground mt-1'>
              Range:{' '}
              <strong className='text-foreground font-mono'>
                {formatCurrency(minFare)} – {formatCurrency(maxFare)}
              </strong>
            </p>
          </div>
        </Card>

        {/* 2. Historical Fare & Trend Shift */}
        <Card className='border-border/70 p-4 hover:border-primary/40 transition-colors'>
          <div className='flex items-center justify-between'>
            <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
              Historical Trend
            </span>
            <div className='flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary'>
              <Activity className='h-3.5 w-3.5' />
            </div>
          </div>
          <div className='mt-2'>
            <div className='flex items-baseline gap-2'>
              {historicalTrendShift !== null ? (
                <div className='flex items-center text-lg font-bold'>
                  {isTrendPositive && (
                    <span className='flex items-center text-rose-500'>
                      <TrendingUp className='mr-1 h-4 w-4' />
                      +{historicalTrendShift.toFixed(1)}%
                    </span>
                  )}
                  {isTrendNegative && (
                    <span className='flex items-center text-emerald-500'>
                      <TrendingDown className='mr-1 h-4 w-4' />
                      {historicalTrendShift.toFixed(1)}%
                    </span>
                  )}
                  {!isTrendPositive && !isTrendNegative && (
                    <span className='flex items-center text-muted-foreground'>
                      <Minus className='mr-1 h-4 w-4' />
                      0.0%
                    </span>
                  )}
                </div>
              ) : (
                <span className='text-lg font-bold text-foreground'>
                  {historicalAvgFare ? formatCurrency(historicalAvgFare) : '—'}
                </span>
              )}
              <span className='text-[10px] text-muted-foreground'>30d window</span>
            </div>
            <p className='text-[11px] text-muted-foreground mt-1'>
              Hist. Avg: <strong className='text-foreground font-mono'>{formatCurrency(historicalAvgFare)}</strong>
            </p>
          </div>
        </Card>

        {/* 3. Observations & Seat Inventory */}
        <Card className='border-border/70 p-4 hover:border-primary/40 transition-colors'>
          <div className='flex items-center justify-between'>
            <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
              Observations & Seats
            </span>
            <div className='flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary'>
              <ShieldCheck className='h-3.5 w-3.5' />
            </div>
          </div>
          <div className='mt-2'>
            <div className='flex items-baseline gap-2'>
              <h2 className='text-2xl font-bold tracking-tight text-foreground'>
                {formatNumber(observations)}
              </h2>
              <span className='text-xs text-muted-foreground'>flights</span>
            </div>
            <p className='text-[11px] text-muted-foreground mt-1'>
              {availablePct ? (
                <span>
                  Availability: <strong className='text-emerald-500 font-mono'>{availablePct}%</strong> ({totalAvailable} seats)
                </span>
              ) : (
                <span>Sample from active partition</span>
              )}
            </p>
          </div>
        </Card>

        {/* 4. Regional Index Context (State APIx vs MoSPI Base) */}
        <Card className='border-border/70 p-4 hover:border-primary/40 transition-colors'>
          <div className='flex items-center justify-between'>
            <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
              Regional Index Context
            </span>
            <div className='flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary'>
              <MapPin className='h-3.5 w-3.5' />
            </div>
          </div>
          <div className='mt-2'>
            {indexContext ? (
              <>
                <div className='flex items-baseline gap-2'>
                  <h2 className='text-2xl font-bold tracking-tight text-foreground font-mono'>
                    {indexContext.latest_apix.toFixed(2)}
                  </h2>
                  <Badge variant='outline' className='text-[10px]'>
                    {indexContext.state}
                  </Badge>
                </div>
                <p className='text-[11px] text-muted-foreground mt-1 truncate'>
                  MoSPI Base: <strong className='text-foreground font-mono'>{indexContext.mospi_base.toFixed(2)}</strong> (
                  <span className={indexContext.latest_apix > indexContext.mospi_base ? 'text-rose-500 font-medium' : 'text-emerald-500 font-medium'}>
                    {indexContext.basket_inflation}
                  </span>)
                </p>
              </>
            ) : (
              <>
                <div className='flex items-baseline gap-2'>
                  <h2 className='text-xl font-bold tracking-tight text-foreground font-mono'>
                    100.00
                  </h2>
                  <Badge variant='outline' className='text-[10px]'>
                    National Base
                  </Badge>
                </div>
                <p className='text-[11px] text-muted-foreground mt-1'>
                  MoSPI CPI standard reference
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
