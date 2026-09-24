'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatINR } from '@/lib/formatters';
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, inrTickFormatter, calcYDomain } from './chart-utils';
import type { LeadTimeAnalysisResponse } from '@/types/analytics';
import type { SkyRateApiError } from '@/lib/api';

interface LeadTimeChartProps {
  data: LeadTimeAnalysisResponse | null;
  isLoading: boolean;
  error: SkyRateApiError | null;
  route: string;
  onRetry?: () => void;
}

export function LeadTimeChart({ data, isLoading, error, route, onRetry }: LeadTimeChartProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70'>
        <CardHeader className='pb-2'><Skeleton className='h-4 w-48' /></CardHeader>
        <CardContent><LoadingState height='h-[300px]' message='Loading advance-purchase curve...' /></CardContent>
      </Card>
    );
  }

  if (error) {
    return <ErrorState title='Lead-Time Curve Unavailable' message={error.message} code={error.code} onRetry={onRetry} />;
  }

  const points = data?.points ?? [];
  if (points.length === 0) {
    return (
      <EmptyState
        title='No Lead-Time Observations'
        description={`No advance-purchase data recorded across T+1–T+45 for corridor ${route}.`}
        actionLabel='Retry'
        onAction={onRetry}
      />
    );
  }

  // Sort descending by days so chart reads: T+45 (far future) → T (departure)
  const chartData = [...points]
    .sort((a, b) => b.days_before_departure - a.days_before_departure)
    .map((p) => ({
      horizon: p.horizon,
      days: p.days_before_departure,
      label: p.days_before_departure === 0 ? 'T (Same Day)' : `T+${p.days_before_departure}`,
      median: p.median_fare ?? p.avg_gross_fare ?? null,
      min: p.min_fare ?? p.min_gross_fare ?? null,
      max: p.max_fare ?? p.max_gross_fare ?? null,
      samples: p.sample_size ?? 0,
    }));

  const allValues = chartData.flatMap((d) => [d.median, d.min, d.max]).filter((v): v is number => v !== null);
  const [yMin, yMax] = calcYDomain(allValues);

  // Spread band (range area) uses [min, max] as lower/upper
  const bandData = chartData.map((d) => ({
    ...d,
    band: d.min != null && d.max != null ? [d.min, d.max] as [number, number] : null,
  }));

  return (
    <Card className='border-border/70'>
      <CardHeader className='flex flex-row items-start justify-between pb-2 flex-wrap gap-2'>
        <div>
          <CardTitle className='text-base font-semibold'>
            Advance-Purchase Price Behaviour
          </CardTitle>
          <CardDescription className='text-xs'>
            Empirical yield management curves for <strong className='text-foreground'>{route}</strong> — T+45 (early) → T (departure)
          </CardDescription>
        </div>
        {data?.carrier && (
          <Badge variant='outline' className='text-[10px]'>{data.carrier}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className='h-[300px] w-full' role='img' aria-label={`Lead-time price curve for ${route}`}>
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart data={bandData} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id='ltBandFill' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#6366f1' stopOpacity={0.15} />
                  <stop offset='95%' stopColor='#6366f1' stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' stroke='currentColor' className='opacity-10' />
              <XAxis
                dataKey='label'
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
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={TOOLTIP_STYLE} role='tooltip'>
                      <p className='font-bold text-foreground mb-1'>{label}</p>
                      {d.median != null && <p className='text-indigo-400'>Median: <span className='font-bold text-foreground'>{formatINR(d.median)}</span></p>}
                      {d.min != null && <p className='text-emerald-400'>Minimum: {formatINR(d.min)}</p>}
                      {d.max != null && <p className='text-rose-400'>Maximum: {formatINR(d.max)}</p>}
                      {d.samples > 0 && <p className='text-muted-foreground mt-1 text-[10px]'>n = {d.samples} flights</p>}
                    </div>
                  );
                }}
              />
              <Legend verticalAlign='top' height={28} wrapperStyle={{ fontSize: '11px' }} />
              {/* Min band (shaded range) */}
              <Area
                type='monotone'
                dataKey='min'
                name='Min Fare'
                stroke='#10b981'
                strokeWidth={1}
                strokeDasharray='4 2'
                fill='url(#ltBandFill)'
                connectNulls={false}
              />
              <Line
                type='monotone'
                dataKey='median'
                name='Median Fare'
                stroke='#6366f1'
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
              <Line
                type='monotone'
                dataKey='max'
                name='Max Fare'
                stroke='#f43f5e'
                strokeWidth={1}
                strokeDasharray='4 2'
                dot={false}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {/* Accessibility summary */}
        <div className='mt-3 flex flex-wrap gap-3' aria-label='Curve summary statistics'>
          {chartData.map((d) =>
            d.median != null ? (
              <div key={d.horizon} className='text-[11px] font-mono text-muted-foreground'>
                <span className='font-bold text-foreground'>{d.label}</span>: {formatINR(d.median)}
              </div>
            ) : null
          )}
        </div>
      </CardContent>
    </Card>
  );
}
