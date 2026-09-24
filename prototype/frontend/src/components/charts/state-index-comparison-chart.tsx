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
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatIndex } from '@/lib/formatters';
import { TOOLTIP_STYLE, AXIS_TICK_STYLE, calcYDomain } from './chart-utils';
import type { APIxIndexRecord } from '@/types/index';
import type { SkyRateApiError } from '@/lib/api';
import { BarChart3 } from 'lucide-react';

interface StateIndexComparisonChartProps {
  records: APIxIndexRecord[];
  isLoading: boolean;
  error: SkyRateApiError | null;
  selectedHorizon?: string;
  onHorizonChange?: (horizon: string) => void;
  onRetry?: () => void;
}

export function StateIndexComparisonChart({
  records,
  isLoading,
  error,
  selectedHorizon = 'T',
  onHorizonChange,
  onRetry,
}: StateIndexComparisonChartProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70 shadow-sm'>
        <CardHeader className='pb-2'>
          <Skeleton className='h-5 w-64' />
          <Skeleton className='h-3.5 w-80 mt-1' />
        </CardHeader>
        <CardContent>
          <LoadingState height='h-[320px]' message='Loading state-wise APIx metrics...' />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorState
        title='Failed to Load State-wise Index'
        message={error.message}
        code={error.code}
        onRetry={onRetry}
      />
    );
  }

  // Filter records by the chosen horizon or fallback to first available horizon
  const availableHorizons = Array.from(new Set(records.map((r) => r.Time_Horizon)));
  const effectiveHorizon =
    selectedHorizon && availableHorizons.includes(selectedHorizon)
      ? selectedHorizon
      : availableHorizons[0] || 'T';

  const horizonRecords = records.filter((r) => r.Time_Horizon === effectiveHorizon);

  if (horizonRecords.length === 0) {
    return (
      <EmptyState
        title='No State Index Records for Horizon'
        description={`No index data found for horizon ${effectiveHorizon}.`}
        actionLabel='Reset Horizon'
        onAction={() => onHorizonChange?.(availableHorizons[0] || 'T')}
      />
    );
  }

  // Order with All India first or last, then sorted by RealTime_APIx descending
  const sorted = [...horizonRecords].sort((a, b) => {
    if (a.State === 'All India') return -1;
    if (b.State === 'All India') return 1;
    return b.RealTime_APIx - a.RealTime_APIx;
  });

  const chartData = sorted.map((r) => ({
    state: r.State,
    apix: Number(r.RealTime_APIx.toFixed(2)),
    base: Number(r.MoSPI_Base.toFixed(2)),
    divergence: Number((r.RealTime_APIx - r.MoSPI_Base).toFixed(2)),
    inflation: r.Basket_Inflation,
    horizon: r.Time_Horizon,
  }));

  const allIndiaRecord = horizonRecords.find((r) => r.State === 'All India');
  const allIndiaBase = allIndiaRecord?.MoSPI_Base ?? 134.2;

  const allVals = chartData.flatMap((d) => [d.apix, d.base]);
  const [yMin, yMax] = calcYDomain(allVals, 100);

  return (
    <Card className='border-border/70 overflow-hidden shadow-sm'>
      <CardHeader className='pb-3 border-b border-border/60 bg-muted/10'>
        <div className='flex items-start gap-2'>
          <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5'>
            <BarChart3 className='h-4 w-4' />
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <CardTitle className='text-base font-bold text-foreground leading-snug'>
                State-Wise Airfare Price Index vs MoSPI CPI Baseline
              </CardTitle>
              <Badge variant='outline' className='text-[10px] font-mono shrink-0'>
                {effectiveHorizon}
              </Badge>
            </div>
            <CardDescription className='text-xs text-muted-foreground mt-1 leading-relaxed'>
              Direct comparison of RealTime APIx vs state-level MoSPI CPI baseline
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* ── Horizon Selector ── always visible, wraps on narrow screens */}
      {availableHorizons.length > 1 && onHorizonChange && (
        <div className='flex items-center gap-1.5 flex-wrap px-4 py-2.5 border-b border-border/50 bg-background/40'>
          <span className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1 shrink-0'>
            Horizon:
          </span>
          {availableHorizons.map((h) => (
            <button
              key={h}
              type='button'
              onClick={() => onHorizonChange(h)}
              className={`text-[11px] px-3 py-1 rounded-full font-mono font-semibold transition-all duration-150 shrink-0
                ${ effectiveHorizon === h
                  ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/50'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70 hover:border-border'
                }`}
            >
              {h}
            </button>
          ))}
        </div>
      )}

      <CardContent className='pt-6'>
        <div
          className='h-[320px] w-full'
          role='img'
          aria-label='State-wise APIx vs MoSPI Base comparison chart'
        >
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 20, left: 0, bottom: 20 }}
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray='3 3'
                vertical={false}
                stroke='hsl(var(--border))'
                opacity={0.6}
              />
              <XAxis
                dataKey='state'
                tick={AXIS_TICK_STYLE}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor='end'
                height={40}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={AXIS_TICK_STYLE}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatIndex(v)}
                width={50}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  const isSurge = item.divergence > 0;

                  return (
                    <div
                      style={TOOLTIP_STYLE}
                      className='p-3 rounded-lg border border-border/80 shadow-lg text-xs space-y-1.5 min-w-[200px]'
                    >
                      <div className='flex items-center justify-between border-b border-border/50 pb-1 font-bold text-foreground'>
                        <span>{item.state}</span>
                        <Badge variant='outline' className='text-[10px] font-mono'>
                          {item.horizon}
                        </Badge>
                      </div>
                      <div className='flex justify-between items-center text-emerald-400 font-semibold'>
                        <span>RealTime APIx:</span>
                        <span className='font-mono text-sm'>{formatIndex(item.apix)}</span>
                      </div>
                      <div className='flex justify-between items-center text-muted-foreground'>
                        <span>MoSPI Base:</span>
                        <span className='font-mono'>{formatIndex(item.base)}</span>
                      </div>
                      <div className='flex justify-between items-center pt-1 border-t border-border/40 text-[11px]'>
                        <span className='text-muted-foreground'>Basket Inflation:</span>
                        <span className={`font-mono font-bold ${isSurge ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {item.inflation}
                        </span>
                      </div>
                      <div className='flex justify-between items-center text-[10px] text-muted-foreground'>
                        <span>Divergence:</span>
                        <span className='font-mono'>
                          {isSurge ? `+${item.divergence}` : item.divergence} pts
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign='top'
                align='right'
                iconType='circle'
                wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
              />
              <ReferenceLine
                y={allIndiaBase}
                stroke='hsl(var(--muted-foreground))'
                strokeDasharray='4 4'
                strokeWidth={1.5}
                label={{
                  value: `All-India MoSPI (${allIndiaBase})`,
                  position: 'insideTopLeft',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10,
                }}
              />
              <Bar
                name='Real-Time APIx'
                dataKey='apix'
                fill='#10b981'
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                name='MoSPI CPI Base'
                dataKey='base'
                fill='#64748b'
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
