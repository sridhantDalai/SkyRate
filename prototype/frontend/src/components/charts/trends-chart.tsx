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
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { TimeSeriesPoint } from '@/types/analytics';

interface TrendsChartProps {
  series: TimeSeriesPoint[];
  title?: string;
  description?: string;
  metricLabel?: string;
  granularity?: string;
  isLoading?: boolean;
}

export function TrendsChart({
  series,
  title = 'Airfare Trend Time-Series',
  description = 'Normalized historical fare movement across selected aviation corridors',
  metricLabel = 'Average Gross Fare',
  granularity = 'daily',
  isLoading = false,
}: TrendsChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70'>
        <CardHeader>
          <CardTitle className='text-base'>{title}</CardTitle>
          <CardDescription className='text-xs'>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-[320px] w-full items-center justify-center rounded-lg bg-muted/20 animate-pulse'>
            <p className='text-xs text-muted-foreground'>Loading trend series...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = series.map((pt) => ({
    date: pt.date,
    displayDate: formatDate(pt.date),
    value: pt.value,
    min_value: pt.min_value,
    max_value: pt.max_value,
    sample_count: pt.sample_count,
  }));

  return (
    <Card className='border-border/70'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <div>
          <CardTitle className='text-base font-semibold'>{title}</CardTitle>
          <CardDescription className='text-xs'>{description}</CardDescription>
        </div>
        <Badge variant='outline' className='uppercase text-[10px] tracking-wider'>
          {granularity} Granularity
        </Badge>
      </CardHeader>
      <CardContent>
        <div className='h-[320px] w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id='colorValue' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#3b82f6' stopOpacity={0.4} />
                  <stop offset='95%' stopColor='#3b82f6' stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' stroke='currentColor' className='opacity-10' />
              <XAxis
                dataKey='displayDate'
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className='text-muted-foreground'
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className='text-muted-foreground'
                tickFormatter={(val) => `₹${val}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className='rounded-lg border border-border bg-popover p-3 shadow-lg text-xs'>
                        <p className='font-semibold text-foreground'>{label}</p>
                        <p className='mt-1 text-primary font-medium'>
                          {metricLabel}: <span className='font-bold'>{formatCurrency(data.value)}</span>
                        </p>
                        {data.sample_count && (
                          <p className='text-muted-foreground'>
                            Observations: {data.sample_count} flights
                          </p>
                        )}
                        {data.min_value && data.max_value && (
                          <p className='text-muted-foreground'>
                            Range: {formatCurrency(data.min_value)} – {formatCurrency(data.max_value)}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type='monotone'
                dataKey='value'
                stroke='#3b82f6'
                strokeWidth={2.5}
                fillOpacity={1}
                fill='url(#colorValue)'
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
