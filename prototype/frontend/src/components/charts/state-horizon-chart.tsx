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
import { TrendingUp } from 'lucide-react';

interface StateHorizonChartProps {
  records: APIxIndexRecord[];
  selectedState: string;
  onStateChange?: (state: string) => void;
  isLoading: boolean;
  error: SkyRateApiError | null;
  onRetry?: () => void;
}

const HORIZON_ORDER = ['T+45', 'T+30', 'T+15', 'T+7', 'T+1'];

export function StateHorizonChart({
  records,
  selectedState,
  onStateChange,
  isLoading,
  error,
  onRetry,
}: StateHorizonChartProps) {
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
          <LoadingState height='h-[320px]' message='Loading lead-time horizon curves...' />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorState
        title='Failed to Load Horizon Curve'
        message={error.message}
        code={error.code}
        onRetry={onRetry}
      />
    );
  }

  const allStates = Array.from(new Set(records.map((r) => r.State))).filter(
    (s) => s !== 'All India'
  );

  const activeState = selectedState || allStates[0] || 'Delhi';

  const stateRecords = records.filter((r) => r.State.toLowerCase() === activeState.toLowerCase());
  const allIndiaRecords = records.filter((r) => r.State === 'All India');

  // Build points across HORIZON_ORDER
  const chartData = HORIZON_ORDER.map((h) => {
    const sRec = stateRecords.find((r) => r.Time_Horizon === h);
    const aiRec = allIndiaRecords.find((r) => r.Time_Horizon === h);

    return {
      horizon: h,
      stateApix: sRec ? Number(sRec.RealTime_APIx.toFixed(2)) : null,
      allIndiaApix: aiRec ? Number(aiRec.RealTime_APIx.toFixed(2)) : null,
      stateBase: sRec ? Number(sRec.MoSPI_Base.toFixed(2)) : null,
      stateInflation: sRec?.Basket_Inflation,
    };
  }).filter((p) => p.stateApix !== null || p.allIndiaApix !== null);

  if (chartData.length === 0) {
    return (
      <EmptyState
        title='No Horizon Data for State'
        description={`No lead-time records available for ${activeState}.`}
        actionLabel='Select All India'
        onAction={() => onStateChange?.('All India')}
      />
    );
  }

  const stateBaseVal = stateRecords[0]?.MoSPI_Base ?? 100;
  const values = chartData.flatMap((d) => [d.stateApix, d.allIndiaApix].filter((v): v is number => v !== null));
  const [yMin, yMax] = calcYDomain(values, stateBaseVal);

  return (
    <Card className='border-border/70 overflow-hidden shadow-sm'>
      <CardHeader className='pb-3 border-b border-border/60 bg-muted/10'>
        <div className='flex items-start gap-2'>
          <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 mt-0.5'>
            <TrendingUp className='h-4 w-4' />
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <CardTitle className='text-base font-bold text-foreground leading-snug'>
                {activeState} — Booking Horizon Escalation Curve
              </CardTitle>
              <Badge variant='outline' className='text-[10px] font-mono shrink-0'>
                T+45 → T+1
              </Badge>
            </div>
            <CardDescription className='text-xs text-muted-foreground mt-1 leading-relaxed'>
              Price trends as the departure date gets closer compared to the national average
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* ── State Selector ── own row, always visible */}
      {allStates.length > 0 && onStateChange && (
        <div className='flex items-center gap-2.5 px-4 py-2.5 border-b border-border/50 bg-background/40'>
          <span className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0'>
            State:
          </span>
          <select
            value={activeState}
            onChange={(e) => onStateChange(e.target.value)}
            className='flex-1 max-w-[220px] h-8 rounded-lg border border-border/80 bg-muted/30 px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary hover:border-primary/50 transition-colors cursor-pointer'
          >
            {allStates.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      <CardContent className='pt-6'>
        <div
          className='h-[320px] w-full'
          role='img'
          aria-label={`Advance booking curve for ${activeState}`}
        >
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={chartData} margin={{ top: 15, right: 20, left: 0, bottom: 15 }}>
              <CartesianGrid
                strokeDasharray='3 3'
                vertical={false}
                stroke='hsl(var(--border))'
                opacity={0.6}
              />
              <XAxis
                dataKey='horizon'
                tick={AXIS_TICK_STYLE}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
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

                  return (
                    <div
                      style={TOOLTIP_STYLE}
                      className='p-3 rounded-lg border border-border/80 shadow-lg text-xs space-y-1.5 min-w-[200px]'
                    >
                      <div className='flex items-center justify-between border-b border-border/50 pb-1 font-bold text-foreground'>
                        <span>Horizon: {item.horizon}</span>
                        <Badge variant='outline' className='text-[10px]'>
                          {item.horizon === 'T' ? 'Same Day' : 'Advance'}
                        </Badge>
                      </div>
                      {item.stateApix !== null && (
                        <div className='flex justify-between items-center text-emerald-400 font-semibold'>
                          <span>{activeState} APIx:</span>
                          <span className='font-mono text-sm'>{formatIndex(item.stateApix)}</span>
                        </div>
                      )}
                      {item.allIndiaApix !== null && (
                        <div className='flex justify-between items-center text-sky-400 font-medium'>
                          <span>All-India Benchmark:</span>
                          <span className='font-mono'>{formatIndex(item.allIndiaApix)}</span>
                        </div>
                      )}
                      {item.stateBase !== null && (
                        <div className='flex justify-between items-center text-muted-foreground text-[11px] pt-1 border-t border-border/40'>
                          <span>MoSPI CPI Base:</span>
                          <span className='font-mono'>{formatIndex(item.stateBase)}</span>
                        </div>
                      )}
                      {item.stateInflation && (
                        <div className='flex justify-between items-center text-rose-400 text-[11px] font-bold'>
                          <span>Basket Inflation:</span>
                          <span className='font-mono'>{item.stateInflation}</span>
                        </div>
                      )}
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
                y={stateBaseVal}
                stroke='hsl(var(--muted-foreground))'
                strokeDasharray='4 4'
                strokeWidth={1.5}
                label={{
                  value: `${activeState} MoSPI (${stateBaseVal.toFixed(1)})`,
                  position: 'insideBottomLeft',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10,
                }}
              />
              <Line
                type='monotone'
                name={`${activeState} APIx`}
                dataKey='stateApix'
                stroke='#10b981'
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              <Line
                type='monotone'
                name='All-India Benchmark'
                dataKey='allIndiaApix'
                stroke='#38bdf8'
                strokeWidth={2}
                strokeDasharray='5 5'
                dot={{ r: 3, fill: '#38bdf8' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
