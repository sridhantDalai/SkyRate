'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  ReferenceLine,
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
import { formatIndex } from '@/lib/formatters';
import {
  TOOLTIP_STYLE,
  AXIS_TICK_STYLE,
  CHART_PALETTE,
  indexTickFormatter,
  calcYDomain,
} from './chart-utils';
import type { IndexOverview } from '@/types/index';
import type { SkyRateApiError } from '@/lib/api';

interface ApixTrendChartProps {
  overview: IndexOverview | null;
  isLoading: boolean;
  error: SkyRateApiError | null;
  onRetry?: () => void;
}

const HORIZON_ORDER = ['T+45', 'T+30', 'T+15', 'T+7', 'T+1', 'T'];

export function ApixTrendChart({ overview, isLoading, error, onRetry }: ApixTrendChartProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70'>
        <CardHeader className='pb-2'>
          <Skeleton className='h-4 w-48' />
          <Skeleton className='h-3 w-64 mt-1' />
        </CardHeader>
        <CardContent>
          <LoadingState height='h-[300px]' message='Loading APIx time series...' />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorState
        title='Failed to Load APIx Index Data'
        message={error.message}
        code={error.code}
        onRetry={onRetry}
      />
    );
  }

  // IndexOverview.all_india is APIxIndexRecord[]
  // Each record: { State, Time_Horizon, MoSPI_Base, Basket_Inflation, RealTime_APIx }
  const allIndia = overview?.all_india ?? [];

  if (allIndia.length === 0) {
    return (
      <EmptyState
        title='No APIx Observations'
        description='No Fisher Ideal index data found for the active period. Check backend data ingestion.'
        actionLabel='Retry'
        onAction={onRetry}
      />
    );
  }

  const chartData = HORIZON_ORDER
    .map((h) => {
      const record = allIndia.find((r) => r.Time_Horizon === h);
      if (!record) return null;
      return {
        label: h,
        apix: record.RealTime_APIx ?? null,
        base: record.MoSPI_Base ?? 100,
        inflation: record.Basket_Inflation,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const apixValues = chartData.map((p) => p.apix).filter((v): v is number => v !== null);
  const [yMin, yMax] = calcYDomain(apixValues, 100);

  // National headline APIx (first available record)
  const nationalApix = allIndia[0]?.RealTime_APIx;
  const mospiBBase = allIndia[0]?.MoSPI_Base ?? 100;

  return (
    <Card className='border-border/70'>
      <CardHeader className='flex flex-row items-start justify-between pb-2 flex-wrap gap-2'>
        <div>
          <CardTitle className='text-base font-semibold'>
            APIx Index by Advance-Purchase Horizon
          </CardTitle>
          <CardDescription className='text-xs'>
            National basket price level vs MoSPI Base {mospiBBase}. Higher = more expensive than base year.
          </CardDescription>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant='outline' className='text-[10px] font-mono'>
            National Basket
          </Badge>
          {nationalApix != null && (
            <Badge className='text-[10px] font-mono'>
              National: {formatIndex(nationalApix)} pts
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className='h-[300px] w-full'
          role='img'
          aria-label='APIx index values by advance-purchase horizon'
        >
          <ResponsiveContainer width='100%' height='100%'>
            <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
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
                tickFormatter={indexTickFormatter}
                domain={[yMin, yMax]}
                label={{
                  value: 'APIx (pts)',
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 10,
                  dy: 40,
                }}
              />
              {/* MoSPI base reference */}
              <ReferenceLine
                y={mospiBBase}
                stroke='#f59e0b'
                strokeDasharray='5 3'
                label={{
                  value: `Base ${mospiBBase}`,
                  position: 'insideBottomRight',
                  fontSize: 10,
                  fill: '#f59e0b',
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const pt = payload[0]?.payload;
                  return (
                    <div style={TOOLTIP_STYLE} role='tooltip'>
                      <p className='font-bold text-foreground mb-1'>{label}</p>
                      {pt.apix != null && (
                        <p className='text-indigo-400'>
                          APIx:{' '}
                          <span className='font-bold text-foreground'>
                            {formatIndex(pt.apix)} pts
                          </span>
                        </p>
                      )}
                      {pt.inflation && (
                        <p className='text-amber-400 text-[10px]'>
                          Basket Inflation: {pt.inflation}
                        </p>
                      )}
                      <p className='text-muted-foreground mt-1 text-[10px]'>
                        MoSPI Base = {pt.base} pts
                      </p>
                    </div>
                  );
                }}
              />
              <Legend verticalAlign='top' height={28} wrapperStyle={{ fontSize: '11px' }} />
              <Line
                type='monotone'
                dataKey='apix'
                name='APIx Index (pts)'
                stroke={CHART_PALETTE[0]}
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: CHART_PALETTE[0],
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))',
                }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {/* Accessible tabular fallback */}
        <div className='mt-3 flex flex-wrap gap-3' aria-label='APIx values by horizon'>
          {chartData.map((d) =>
            d.apix != null ? (
              <div key={d.label} className='text-[11px] font-mono text-muted-foreground'>
                <span className='font-bold text-foreground'>{d.label}</span>:{' '}
                {formatIndex(d.apix)}
              </div>
            ) : null
          )}
        </div>
      </CardContent>
    </Card>
  );
}
