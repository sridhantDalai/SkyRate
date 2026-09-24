'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatINR, formatNumber, formatPercentage } from '@/lib/formatters';
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, inrTickFormatter, CHART_PALETTE, calcYDomain } from './chart-utils';
import type { CarrierAnalyticsResponse } from '@/types/analytics';
import type { SkyRateApiError } from '@/lib/api';

interface CarrierComparisonProps {
  data: CarrierAnalyticsResponse | null;
  isLoading: boolean;
  error: SkyRateApiError | null;
  route?: string | null;
  onRetry?: () => void;
}

export function CarrierComparison({ data, isLoading, error, route, onRetry }: CarrierComparisonProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70'>
        <CardHeader className='pb-2'><Skeleton className='h-4 w-48' /></CardHeader>
        <CardContent><LoadingState height='h-[300px]' message='Loading carrier statistics...' /></CardContent>
      </Card>
    );
  }

  if (error) return <ErrorState title='Carrier Data Unavailable' message={error.message} code={error.code} onRetry={onRetry} />;

  const carriers = data?.carriers ?? [];
  if (carriers.length === 0) {
    return (
      <EmptyState
        title='No Carrier Statistics'
        description={`No airline observations for ${route ?? 'selected corridor'}.`}
        actionLabel='Retry'
        onAction={onRetry}
      />
    );
  }

  const chartData = carriers
    .map((c, idx) => ({
      carrier: c.carrier,
      displayName: c.carrier,
      min: c.minimum ?? c.min_fare ?? 0,
      median: c.median ?? 0,
      avg: c.average ?? c.avg_gross_fare ?? 0,
      max: c.maximum ?? c.max_fare ?? 0,
      observations: c.observations ?? c.flight_count ?? 0,
      marketShare: c.market_share_pct ?? null,
      fill: CHART_PALETTE[idx % CHART_PALETTE.length],
    }))
    .sort((a, b) => a.median - b.median); // ascending median

  const allFares = chartData.flatMap((d) => [d.min, d.median, d.max]).filter((v) => v > 0);
  const [yMin, yMax] = calcYDomain(allFares);

  return (
    <Card className='border-border/70'>
      <CardHeader className='flex flex-row items-start justify-between pb-2 flex-wrap gap-2'>
        <div>
          <CardTitle className='text-base font-semibold'>
            Carrier Fare Comparison
          </CardTitle>
          <CardDescription className='text-xs'>
            Unranked fare dispersion across {data?.total_carriers ?? carriers.length} airlines
            — {formatNumber(data?.total_observations)} total observations
          </CardDescription>
        </div>
        {route && <Badge variant='outline' className='text-[10px]'>{route}</Badge>}
      </CardHeader>
      <CardContent>
        <div
          className='h-[300px] w-full'
          role='img'
          aria-label={`Carrier fare comparison for ${route ?? 'all corridors'}`}
        >
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={chartData} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='currentColor' className='opacity-10' />
              <XAxis
                dataKey='displayName'
                tickLine={false}
                axisLine={false}
                tick={AXIS_TICK_STYLE}
                className='text-muted-foreground'
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={AXIS_TICK_STYLE}
                className='text-muted-foreground'
                tickFormatter={inrTickFormatter}
                domain={[yMin, yMax]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={TOOLTIP_STYLE} role='tooltip'>
                      <p className='font-bold text-foreground mb-1.5'>{d.carrier}</p>
                      <p className='text-emerald-400'>Min: <span className='font-bold text-foreground'>{formatINR(d.min)}</span></p>
                      <p className='text-indigo-400'>Median: <span className='font-bold text-foreground'>{formatINR(d.median)}</span></p>
                      <p className='text-rose-400'>Max: <span className='font-bold text-foreground'>{formatINR(d.max)}</span></p>
                      <div className='border-t border-border/50 mt-1.5 pt-1.5 text-[10px] text-muted-foreground space-y-0.5'>
                        <p>Observations: {formatNumber(d.observations)} flights</p>
                        {d.marketShare != null && <p>Market share: {formatPercentage(d.marketShare, false, 1)}</p>}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend verticalAlign='top' height={28} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey='min' name='Min Fare' fill='#10b981' radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fillOpacity={0.7} />
                ))}
              </Bar>
              <Bar dataKey='median' name='Median Fare' fill='#6366f1' radius={[3, 3, 0, 0]} />
              <Bar dataKey='max' name='Max Fare' fill='#f43f5e' radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
