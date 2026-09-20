'use client';

import * as React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { getRouteDetails, getFareDistribution, SkyRateApiError } from '@/lib/api';
import type { RouteDetails, FareDistributionResponse } from '@/types/fare';
import {
  Navigation,
  Clock,
  Plane,
  TrendingUp,
  IndianRupee,
  RefreshCw,
} from 'lucide-react';

interface RouteHighlightsProps {
  route: string;
}

export function RouteHighlights({ route }: RouteHighlightsProps) {
  const [details, setDetails] = React.useState<RouteDetails | null>(null);
  const [distribution, setDistribution] = React.useState<FareDistributionResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<SkyRateApiError | null>(null);

  const fetchHighlights = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [detailsRes, distRes] = await Promise.all([
        getRouteDetails(route).catch(() => null),
        getFareDistribution({ route }).catch(() => null),
      ]);
      setDetails(detailsRes);
      setDistribution(distRes);
      if (!detailsRes && !distRes) {
        setError(new SkyRateApiError(`Corridor data unavailable for ${route}`, 'NOT_FOUND', 404));
      }
    } catch (err: any) {
      setError(err instanceof SkyRateApiError ? err : new SkyRateApiError(err.message));
    } finally {
      setIsLoading(false);
    }
  }, [route]);

  React.useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  if (isLoading) {
    return (
      <Card className='border-border/70 overflow-hidden'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <Skeleton className='h-6 w-48' />
            <Skeleton className='h-5 w-24 rounded-full' />
          </div>
          <Skeleton className='h-4 w-72 mt-1' />
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className='p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2'>
                <Skeleton className='h-3 w-20' />
                <Skeleton className='h-7 w-28' />
                <Skeleton className='h-3 w-36' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className='border-border/70'>
        <CardContent className='pt-6'>
          <ErrorState
            title={`Unable to load highlights for ${route}`}
            message={error.message}
            onRetry={fetchHighlights}
          />
        </CardContent>
      </Card>
    );
  }

  const origin = details?.origin || route.split('-')[0] || 'DEL';
  const destination = details?.destination || route.split('-')[1] || 'BOM';
  const originCity = details?.origin_city || origin;
  const destCity = details?.destination_city || destination;
  const carriers = details?.monitored_carriers || [];

  return (
    <Card className='border-border/70 overflow-hidden bg-gradient-to-b from-card via-card to-card/90 shadow-sm'>
      <CardHeader className='pb-4 border-b border-border/60'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2.5 flex-wrap'>
              <div className='flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-mono text-sm font-bold'>
                <span>{origin}</span>
                <span className='text-xs text-primary/70'>➔</span>
                <span>{destination}</span>
              </div>
              <h2 className='text-lg font-bold text-foreground'>
                {originCity} to {destCity} Corridor
              </h2>
              {details?.density && (
                <Badge
                  variant={
                    details.density.toLowerCase() === 'high'
                      ? 'destructive'
                      : details.density.toLowerCase() === 'medium'
                      ? 'warning'
                      : 'secondary'
                  }
                  className='text-[10px]'
                >
                  {details.density} Density
                </Badge>
              )}
            </div>
            <p className='text-xs text-muted-foreground flex items-center gap-2'>
              <span>Monitored High-Frequency Trunk Sector</span>
              {distribution?.partition_date && (
                <>
                  <span>•</span>
                  <span>Partition Date: {distribution.partition_date}</span>
                </>
              )}
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='sm'
              onClick={fetchHighlights}
              className='h-8 text-xs text-muted-foreground hover:text-foreground gap-1'
            >
              <RefreshCw className='h-3 w-3' />
              Refresh Corridor
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className='pt-5 space-y-5'>
        {/* Core Metrics Grid */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {/* 1. Distance & Airtime */}
          <div className='p-4 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/30 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                Distance & Duration
              </span>
              <div className='flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary'>
                <Navigation className='h-3.5 w-3.5' />
              </div>
            </div>
            <div className='mt-2.5'>
              <div className='text-xl font-bold tracking-tight text-foreground font-mono'>
                {details?.distance_km ? `${details.distance_km} km` : '—'}
              </div>
              <p className='text-[11px] text-muted-foreground mt-1 flex items-center gap-1'>
                <Clock className='h-3 w-3 text-primary' />
                Avg Block Time: <strong className='text-foreground'>{details?.avg_flight_duration || '—'}</strong>
              </p>
            </div>
          </div>

          {/* 2. Route Median Fare */}
          <div className='p-4 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/30 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                Corridor Median Fare
              </span>
              <div className='flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary'>
                <IndianRupee className='h-3.5 w-3.5' />
              </div>
            </div>
            <div className='mt-2.5'>
              <div className='text-xl font-bold tracking-tight text-foreground'>
                {distribution?.median_fare !== undefined && distribution?.median_fare !== null
                  ? formatCurrency(distribution.median_fare)
                  : '—'}
              </div>
              <p className='text-[11px] text-muted-foreground mt-1'>
                Spread:{' '}
                <strong className='text-foreground font-mono'>
                  {distribution?.min_fare && distribution?.max_fare
                    ? formatCurrency(distribution.max_fare - distribution.min_fare)
                    : '—'}
                </strong>
              </p>
            </div>
          </div>

          {/* 3. Dynamic Surge Window */}
          <div className='p-4 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/30 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                Peak Surge Window
              </span>
              <div className='flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-500'>
                <TrendingUp className='h-3.5 w-3.5' />
              </div>
            </div>
            <div className='mt-2.5'>
              <div className='text-base font-bold tracking-tight text-foreground'>
                {details?.peak_surge_window || 'T+1 to T+3'}
              </div>
              <p className='text-[11px] text-muted-foreground mt-1'>
                Steepest price escalation zone
              </p>
            </div>
          </div>

          {/* 4. Observed Flights */}
          <div className='p-4 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/30 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                Corridor Observations
              </span>
              <div className='flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500'>
                <Plane className='h-3.5 w-3.5' />
              </div>
            </div>
            <div className='mt-2.5'>
              <div className='text-xl font-bold tracking-tight text-foreground'>
                {distribution?.sample_size ? formatNumber(distribution.sample_size) : '—'}
              </div>
              <p className='text-[11px] text-muted-foreground mt-1'>
                Flights analyzed in active partition
              </p>
            </div>
          </div>
        </div>

        {/* Carrier Coverage & Price Bounds Footer */}
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='font-semibold text-muted-foreground text-[11px] uppercase tracking-wider'>
              Competing Carriers:
            </span>
            {carriers.length > 0 ? (
              carriers.map((carrier) => (
                <Badge key={carrier} variant='secondary' className='text-[11px] font-medium'>
                  {carrier}
                </Badge>
              ))
            ) : (
              <span className='text-muted-foreground text-xs'>All DGCA scheduled operators</span>
            )}
          </div>

          {distribution && distribution.min_fare !== undefined && distribution.max_fare !== undefined && (
            <div className='flex items-center gap-3 text-muted-foreground text-xs'>
              <span>
                Min: <strong className='text-emerald-500 font-mono'>{formatCurrency(distribution.min_fare)}</strong>
              </span>
              <span>•</span>
              <span>
                Max: <strong className='text-rose-500 font-mono'>{formatCurrency(distribution.max_fare)}</strong>
              </span>
              {distribution.std_dev !== undefined && (
                <>
                  <span>•</span>
                  <span>StdDev: <strong className='text-foreground font-mono'>₹{distribution.std_dev.toFixed(0)}</strong></span>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
