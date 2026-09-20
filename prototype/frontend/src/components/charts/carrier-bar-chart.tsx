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
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import type { CarrierFareStats } from '@/types/analytics';

interface CarrierBarChartProps {
  carriers: CarrierFareStats[];
  route?: string | null;
  horizon?: string | null;
  isLoading?: boolean;
}

export function CarrierBarChart({
  carriers,
  route,
  horizon,
  isLoading = false,
}: CarrierBarChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70'>
        <CardHeader>
          <CardTitle className='text-base'>Carrier Fare Comparison</CardTitle>
          <CardDescription className='text-xs'>Comparing observed fare metrics across airline carriers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-[320px] w-full items-center justify-center rounded-lg bg-muted/20 animate-pulse'>
            <p className='text-xs text-muted-foreground'>Loading carrier metrics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = carriers.map((c) => ({
    carrier: c.carrier,
    minimum: c.minimum ?? c.min_fare ?? 0,
    median: c.median ?? 0,
    average: c.average ?? c.avg_gross_fare ?? 0,
    maximum: c.maximum ?? c.max_fare ?? 0,
    observations: c.observations ?? c.flight_count ?? 0,
    available: c.available_count ?? 0,
    sold_out: c.sold_out_count ?? 0,
  }));

  return (
    <Card className='border-border/70'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <div>
          <CardTitle className='text-base font-semibold'>
            Carrier Fare Metrics Comparison
          </CardTitle>
          <CardDescription className='text-xs'>
            Observed fare metrics per carrier
            {route ? ` for corridor ${route}` : ''}
            {horizon ? ` (${horizon})` : ''}
          </CardDescription>
        </div>
        <Badge variant='outline' className='text-[10px]'>
          Unranked Statistics
        </Badge>
      </CardHeader>
      <CardContent>
        <div className='h-[320px] w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='currentColor' className='opacity-10' />
              <XAxis
                dataKey='carrier'
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
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className='rounded-lg border border-border bg-popover p-3 shadow-lg text-xs'>
                        <p className='font-bold text-foreground'>{label}</p>
                        <p className='mt-1 text-emerald-500 font-medium'>
                          Minimum: {formatCurrency(d.minimum)}
                        </p>
                        <p className='text-primary font-semibold'>
                          Median: {formatCurrency(d.median)}
                        </p>
                        <p className='text-blue-500 font-medium'>
                          Average: {formatCurrency(d.average)}
                        </p>
                        <p className='text-rose-500 font-medium'>
                          Maximum: {formatCurrency(d.maximum)}
                        </p>
                        <div className='mt-2 border-t border-border pt-1 text-[11px] text-muted-foreground'>
                          <span>Observations: {d.observations} flights</span>
                          {d.sold_out > 0 && <span> · Sold out: {d.sold_out}</span>}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign='top'
                height={36}
                wrapperStyle={{ fontSize: '11px' }}
              />
              <Bar dataKey='minimum' name='Minimum Fare' fill='#10b981' radius={[4, 4, 0, 0]} />
              <Bar dataKey='median' name='Median Fare' fill='#8b5cf6' radius={[4, 4, 0, 0]} />
              <Bar dataKey='average' name='Average Fare' fill='#3b82f6' radius={[4, 4, 0, 0]} />
              <Bar dataKey='maximum' name='Maximum Fare' fill='#f43f5e' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
