'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatINR, formatDateShort, formatMonthLabel, formatNumber } from '@/lib/formatters';
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, inrTickFormatter, calcYDomain } from './chart-utils';
import type { AnalyticsTrendsResponse } from '@/types/analytics';
import type { SkyRateApiError } from '@/lib/api';

interface RouteTrendChartProps {
  data: AnalyticsTrendsResponse | null;
  isLoading: boolean;
  error: SkyRateApiError | null;
  selectedRoute?: string;
  granularity: 'daily' | 'weekly' | 'monthly';
  onGranularityChange: (g: 'daily' | 'weekly' | 'monthly') => void;
  onRetry?: () => void;
}

export function RouteTrendChart({
  data,
  isLoading,
  error,
  selectedRoute,
  granularity,
  onGranularityChange,
  onRetry,
}: RouteTrendChartProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <Skeleton className='h-4 w-48' />
          <div className='flex gap-1'>
            {['Daily', 'Weekly', 'Monthly'].map((l) => (
              <Skeleton key={l} className='h-6 w-14' />
            ))}
          </div>
        </CardHeader>
        <CardContent><LoadingState height='h-[280px]' message='Loading fare trend...' /></CardContent>
      </Card>
    );
  }

  if (error) return <ErrorState title='Route Trend Unavailable' message={error.message} code={error.code} onRetry={onRetry} />;

  const series = data?.series ?? [];
  if (series.length === 0) {
    return (
      <EmptyState
        title='No Trend Data'
        description={`No fare records found for ${selectedRoute ?? 'selected corridor'} in this window.`}
        actionLabel='Retry'
        onAction={onRetry}
      />
    );
  }

  const dateFormatter = granularity === 'monthly' ? formatMonthLabel : formatDateShort;

  const chartData = series.map((pt) => ({
    date: pt.date,
    label: dateFormatter(pt.date),
    value: pt.value,
    min: pt.min_value,
    max: pt.max_value,
    n: pt.sample_count,
  }));

  const allValues = chartData.flatMap((d) => [d.value, d.min, d.max]).filter((v): v is number => v != null);
  const [yMin, yMax] = calcYDomain(allValues);

  // Compute rolling reference median for anomaly line
  const median = allValues.length
    ? allValues.slice().sort((a, b) => a - b)[Math.floor(allValues.length / 2)]
    : null;

  return (
    <Card className='border-border/70'>
      <CardHeader className='flex flex-row items-start justify-between pb-2 gap-2 flex-wrap'>
        <div>
          <CardTitle className='text-base font-semibold'>
            Route Fare Trend: {selectedRoute ?? 'All Corridors'}
          </CardTitle>
          <CardDescription className='text-xs'>
            {series.length} {granularity} observation points
          </CardDescription>
        </div>
        <div className='flex gap-1'>
          {(['daily', 'weekly', 'monthly'] as const).map((g) => (
            <Button
              key={g}
              variant={granularity === g ? 'default' : 'outline'}
              size='xs'
              className='text-[10px] capitalize h-7'
              onClick={() => onGranularityChange(g)}
              aria-pressed={granularity === g}
            >
              {g}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className='h-[280px] w-full'
          role='img'
          aria-label={`Fare trend chart for ${selectedRoute ?? 'all corridors'}`}
        >
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id='rtFill' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#3b82f6' stopOpacity={0.3} />
                  <stop offset='95%' stopColor='#3b82f6' stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' stroke='currentColor' className='opacity-10' />
              <XAxis
                dataKey='label'
                tickLine={false}
                axisLine={false}
                tick={AXIS_TICK_STYLE}
                className='text-muted-foreground'
                interval='preserveStartEnd'
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={AXIS_TICK_STYLE}
                className='text-muted-foreground'
                tickFormatter={inrTickFormatter}
                domain={[yMin, yMax]}
              />
              {median != null && (
                <ReferenceLine
                  y={median}
                  stroke='#f59e0b'
                  strokeDasharray='5 3'
                  label={{ value: 'Median', position: 'insideBottomRight', fontSize: 10, fill: '#f59e0b' }}
                />
              )}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={TOOLTIP_STYLE} role='tooltip'>
                      <p className='font-bold text-foreground mb-1'>{label}</p>
                      {d.value != null && (
                        <p className='text-blue-400'>Avg Fare: <span className='font-bold text-foreground'>{formatINR(d.value)}</span></p>
                      )}
                      {d.min != null && d.max != null && (
                        <p className='text-muted-foreground'>Range: {formatINR(d.min)} – {formatINR(d.max)}</p>
                      )}
                      {d.n != null && d.n > 0 && (
                        <p className='text-muted-foreground text-[10px] mt-1'>n = {formatNumber(d.n)} observations</p>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type='monotone'
                dataKey='value'
                name='Avg Gross Fare'
                stroke='#3b82f6'
                strokeWidth={2.5}
                fillOpacity={1}
                fill='url(#rtFill)'
                dot={false}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
