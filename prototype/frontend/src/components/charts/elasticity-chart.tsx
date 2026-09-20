'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import type { LeadTimePoint } from '@/types/analytics';

interface ElasticityChartProps {
  points: LeadTimePoint[];
  route: string;
  carrier?: string | null;
  isLoading?: boolean;
}

export function ElasticityChart({
  points,
  route,
  carrier,
  isLoading = false,
}: ElasticityChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70'>
        <CardHeader>
          <CardTitle className='text-base'>Observed Lead-Time Price Behaviour</CardTitle>
          <CardDescription className='text-xs'>Advance-purchase price trajectory across T+1 to T+45</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-[320px] w-full items-center justify-center rounded-lg bg-muted/20 animate-pulse'>
            <p className='text-xs text-muted-foreground'>Loading advance-purchase curve...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [...points]
    .sort((a, b) => b.days_before_departure - a.days_before_departure)
    .map((p) => ({
      horizon: p.horizon,
      days: `${p.days_before_departure}d prior`,
      median: p.median_fare,
      min: p.min_fare,
      max: p.max_fare,
      samples: p.sample_size,
    }));

  return (
    <Card className='border-border/70'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <div>
          <CardTitle className='text-base font-semibold'>
            Observed Lead-Time Price Behaviour
          </CardTitle>
          <CardDescription className='text-xs'>
            Empirical fare progression for corridor{' '}
            <strong className='text-foreground'>{route}</strong>
            {carrier ? ` (${carrier})` : ' across all carriers'} (T+45 ➔ T+1)
          </CardDescription>
        </div>
        <Badge variant='secondary' className='text-[10px]'>
          Non-Causal Observed
        </Badge>
      </CardHeader>
      <CardContent>
        <div className='h-[320px] w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='currentColor' className='opacity-10' />
              <XAxis
                dataKey='horizon'
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
                    const d = payload[0].payload;
                    return (
                      <div className='rounded-lg border border-border bg-popover p-3 shadow-lg text-xs'>
                        <p className='font-bold text-foreground'>{label} ({d.days})</p>
                        <p className='mt-1 text-primary font-semibold'>
                          Median Fare: {formatCurrency(d.median)}
                        </p>
                        <p className='text-muted-foreground'>
                          Min: {formatCurrency(d.min)} · Max: {formatCurrency(d.max)}
                        </p>
                        {d.samples && (
                          <p className='text-muted-foreground'>
                            Observations: {d.samples} flights
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type='monotone'
                dataKey='median'
                name='Median Fare'
                stroke='#8b5cf6'
                strokeWidth={3}
                dot={{ r: 4, fill: '#8b5cf6' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type='monotone'
                dataKey='min'
                name='Min Fare'
                stroke='#10b981'
                strokeWidth={1.5}
                strokeDasharray='3 3'
                dot={false}
              />
              <Line
                type='monotone'
                dataKey='max'
                name='Max Fare'
                stroke='#ef4444'
                strokeWidth={1.5}
                strokeDasharray='3 3'
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
