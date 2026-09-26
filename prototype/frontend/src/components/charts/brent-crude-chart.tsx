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
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';

import { Lightbulb } from 'lucide-react';
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, calcYDomain } from './chart-utils';
import type { MacroAnalyticsResponse } from '@/types/analytics';
import type { SkyRateApiError } from '@/lib/api';

interface BrentCrudeChartProps {
  data: MacroAnalyticsResponse | null;
  isLoading: boolean;
  error: SkyRateApiError | null;
  onRetry?: () => void;
}

const USD_TO_INR = 83.50;

const formatINR = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export function BrentCrudeChart({ data, isLoading, error, onRetry }: BrentCrudeChartProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70'>
        <CardHeader className='pb-2'><Skeleton className='h-4 w-48' /></CardHeader>
        <CardContent><LoadingState height='h-[300px]' message='Loading Brent Crude data...' /></CardContent>
      </Card>
    );
  }

  if (error) {
    return <ErrorState title='Macro Data Unavailable' message={error.message} code={error.code} onRetry={onRetry} />;
  }

  const records = data?.oil_records ?? [];
  if (records.length === 0) {
    return (
      <EmptyState
        title='No Oil Data Available'
        description='Unable to load Brent Crude trends at this time.'
        actionLabel='Retry'
        onAction={onRetry}
      />
    );
  }

  const chartData = records.map(r => ({
    ...r,
    brent_crude_inr: r.brent_crude_usd * USD_TO_INR
  }));
  const allValues = chartData.map((r) => r.brent_crude_inr);
  const [yMin, yMax] = calcYDomain(allValues);

  return (
    <Card className='border-border/70'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-base font-semibold'>
          Brent Crude Oil (Macro Trend)
        </CardTitle>
        <CardDescription className='text-xs'>
          Global benchmark pricing (INR/bbl) impacting Aviation Turbine Fuel (ATF)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='h-[300px] w-full' role='img' aria-label='Brent Crude Oil Price Chart'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id='oilBandFill' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#f59e0b' stopOpacity={0.25} />
                  <stop offset='95%' stopColor='#f59e0b' stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' stroke='currentColor' className='opacity-10' />
              <XAxis
                dataKey='date'
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
                tickFormatter={(val) => `₹${val}`}
                domain={[yMin, yMax]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={TOOLTIP_STYLE} role='tooltip'>
                      <p className='font-bold text-foreground mb-1'>{label}</p>
                      <p className='text-amber-500'>
                        Price: <span className='font-bold text-foreground'>{formatINR(d.brent_crude_inr)}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type='monotone'
                dataKey='brent_crude_inr'
                name='Brent Crude (INR)'
                stroke='#f59e0b'
                strokeWidth={2.5}
                fill='url(#oilBandFill)'
                dot={false}
                activeDot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {data?.correlation_insight && (
          <div className='mt-4'>
            <div className='flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'>
              <Lightbulb className='h-4 w-4 mt-0.5 shrink-0 stroke-amber-600 dark:stroke-amber-400' />
              <div className='text-xs leading-relaxed'>
                {data.correlation_insight}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
