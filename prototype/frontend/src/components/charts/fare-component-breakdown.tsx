'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatINR, formatPercentage } from '@/lib/formatters';
import { TOOLTIP_STYLE, CHART_PALETTE } from './chart-utils';
import type { RouteFeeBreakdown } from '@/types/analytics';
import type { SkyRateApiError } from '@/lib/api';

interface FareComponentBreakdownProps {
  data: RouteFeeBreakdown | null;
  isLoading: boolean;
  error: SkyRateApiError | null;
  route?: string;
  onRetry?: () => void;
}

export function FareComponentBreakdown({ data, isLoading, error, route, onRetry }: FareComponentBreakdownProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70'>
        <CardHeader className='pb-2'><Skeleton className='h-4 w-48' /></CardHeader>
        <CardContent><LoadingState height='h-[240px]' message='Loading fare components...' /></CardContent>
      </Card>
    );
  }

  if (error) return <ErrorState title='Fee Breakdown Unavailable' message={error.message} code={error.code} onRetry={onRetry} />;

  const breakdown = data?.breakdown ?? [];
  if (breakdown.length === 0) {
    return (
      <EmptyState
        title='No Fee Breakdown Available'
        description={`No component data available for ${route ?? 'selected corridor'}.`}
        actionLabel='Retry'
        onAction={onRetry}
      />
    );
  }

  const pieData = breakdown.map((item, idx) => ({
    name: item.component,
    value: item.amount,
    pct: item.percentage,
    fill: CHART_PALETTE[idx % CHART_PALETTE.length],
  }));

  return (
    <Card className='border-border/70'>
      <CardHeader className='flex flex-row items-start justify-between pb-2 flex-wrap gap-2'>
        <div>
          <CardTitle className='text-base font-semibold'>
            Fare Component Breakdown
          </CardTitle>
          <CardDescription className='text-xs'>
            Avg. Gross Fare: <strong className='text-foreground'>{formatINR(data?.avg_gross_fare)}</strong>
            {' '}— UDF, taxes, and base tariff separated
          </CardDescription>
        </div>
        <Badge variant='outline' className='text-[10px]'>{data?.route ?? route ?? 'All'}</Badge>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 items-center'>
          {/* Donut chart */}
          <div
            className='h-[220px]'
            role='img'
            aria-label={`Fare component breakdown for ${data?.route ?? route}`}
          >
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={pieData}
                  cx='50%'
                  cy='50%'
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey='value'
                  nameKey='name'
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} stroke='hsl(var(--background))' strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={TOOLTIP_STYLE} role='tooltip'>
                        <p className='font-bold text-foreground'>{d.name}</p>
                        <p className='mt-1'>{formatINR(d.value)}</p>
                        <p className='text-muted-foreground text-[10px]'>{formatPercentage(d.pct, false)} of gross fare</p>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign='bottom'
                  height={32}
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(name) => <span className='text-foreground'>{name}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Itemized table */}
          <div className='space-y-2' role='table' aria-label='Fare components'>
            <div className='grid grid-cols-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border/50'>
              <span>Component</span>
              <span className='text-right'>Amount</span>
              <span className='text-right'>Share</span>
            </div>
            {breakdown.map((item, idx) => (
              <div key={item.component} className='grid grid-cols-3 text-xs items-center' role='row'>
                <div className='flex items-center gap-1.5'>
                  <div
                    className='h-2.5 w-2.5 rounded-sm flex-shrink-0'
                    style={{ backgroundColor: CHART_PALETTE[idx % CHART_PALETTE.length] }}
                    aria-hidden='true'
                  />
                  <span className='font-medium text-foreground'>{item.component}</span>
                </div>
                <span className='text-right font-mono text-foreground'>{formatINR(item.amount)}</span>
                <span className='text-right text-muted-foreground'>
                  {formatPercentage(item.percentage, false)}
                </span>
              </div>
            ))}
            <div className='grid grid-cols-3 text-xs font-bold border-t border-border/50 pt-2 mt-1'>
              <span>Total</span>
              <span className='text-right font-mono'>{formatINR(data?.avg_gross_fare)}</span>
              <span className='text-right'>100%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
