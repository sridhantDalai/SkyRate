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
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import type { FareDistributionBucket } from '@/types/fare';

interface FareDistributionChartProps {
  buckets: FareDistributionBucket[];
  sampleSize?: number;
  medianFare?: number;
  isLoading?: boolean;
}

export function FareDistributionChart({
  buckets,
  sampleSize,
  medianFare,
  isLoading = false,
}: FareDistributionChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70'>
        <CardHeader>
          <CardTitle className='text-base'>Fare Distribution Histogram</CardTitle>
          <CardDescription className='text-xs'>Price density buckets across observations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-[280px] w-full items-center justify-center rounded-lg bg-muted/20 animate-pulse'>
            <p className='text-xs text-muted-foreground'>Loading distribution...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border-border/70'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <div>
          <CardTitle className='text-base font-semibold'>Fare Distribution Histogram</CardTitle>
          <CardDescription className='text-xs'>
            Observed gross fare frequencies ({sampleSize ? `${formatNumber(sampleSize)} flights` : 'sample dataset'})
          </CardDescription>
        </div>
        {medianFare && (
          <Badge variant='secondary' className='text-[11px]'>
            Median: {formatCurrency(medianFare)}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className='h-[280px] w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={buckets} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='currentColor' className='opacity-10' />
              <XAxis
                dataKey='price_range'
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className='text-muted-foreground'
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className='text-muted-foreground'
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className='rounded-lg border border-border bg-popover p-3 shadow-lg text-xs'>
                        <p className='font-bold text-foreground'>{label}</p>
                        <p className='mt-1 text-primary font-semibold'>
                          Flights: {d.count} ({d.percentage?.toFixed(1)}%)
                        </p>
                        <p className='text-muted-foreground'>
                          Band: {formatCurrency(d.min_price)} – {formatCurrency(d.max_price)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey='count' name='Flight Count' fill='#6366f1' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
