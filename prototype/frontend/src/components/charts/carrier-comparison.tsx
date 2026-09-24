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
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatINR, formatNumber, formatPercentage } from '@/lib/formatters';
import { AXIS_TICK_STYLE, inrTickFormatter, CHART_PALETTE, calcYDomain } from './chart-utils';
import type { CarrierAnalyticsResponse } from '@/types/analytics';
import type { SkyRateApiError } from '@/lib/api';

interface CarrierComparisonProps {
  data: CarrierAnalyticsResponse | null;
  isLoading: boolean;
  error: SkyRateApiError | null;
  route?: string | null;
  onRetry?: () => void;
}

export function CarrierComparison({ data, isLoading, error, route, onRetry }: CarrierComparisonProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted || isLoading) {
    return (
      <Card className='border-border/70'>
        <CardHeader className='pb-2'><Skeleton className='h-4 w-48' /></CardHeader>
        <CardContent><LoadingState height='h-[300px]' message='Loading carrier statistics...' /></CardContent>
      </Card>
    );
  }

  if (error) return <ErrorState title='Carrier Data Unavailable' message={error.message} code={error.code} onRetry={onRetry} />;

  const carriers = data?.carriers ?? [];
  if (carriers.length === 0) {
    return (
      <EmptyState
        title='No Carrier Statistics'
        description={`No airline observations for ${route ?? 'selected corridor'}.`}
        actionLabel='Retry'
        onAction={onRetry}
      />
    );
  }

  const chartData = carriers
    .map((c, idx) => ({
      carrier: c.carrier,
      shortName: c.carrier.replace('Air ', '').replace(' Air', '').slice(0, 8),
      min: c.minimum ?? c.min_fare ?? 0,
      median: c.median ?? 0,
      avg: c.average ?? c.avg_gross_fare ?? 0,
      max: c.maximum ?? c.max_fare ?? 0,
      observations: c.observations ?? c.flight_count ?? 0,
      marketShare: c.market_share_pct ?? null,
      fill: CHART_PALETTE[idx % CHART_PALETTE.length],
    }))
    .sort((a, b) => a.median - b.median); // ascending median

  const allFares = chartData.flatMap((d) => [d.min, d.median, d.max]).filter((v) => v > 0);
  const [yMin, yMax] = calcYDomain(allFares);

  return (
    <Card className='border-border/70'>
      <CardHeader className='flex flex-row items-start justify-between pb-2 flex-wrap gap-2'>
        <div>
          <CardTitle className='text-base font-semibold'>
            Carrier Fare Comparison
          </CardTitle>
          <CardDescription className='text-xs'>
            Unranked fare dispersion across {data?.total_carriers ?? carriers.length} airlines
            — {formatNumber(data?.total_observations)} total observations
          </CardDescription>
        </div>
        {route && <Badge variant='outline' className='text-[10px]'>{route}</Badge>}
      </CardHeader>
      <CardContent>
        <div
          className='h-[300px] w-full'
          role='img'
          aria-label={`Carrier fare comparison for ${route ?? 'all corridors'}`}
        >
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={chartData} margin={{ top: 10, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' stroke='currentColor' className='opacity-10' />
              <XAxis
                dataKey='shortName'
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
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div
                      role='tooltip'
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        fontSize: '12px',
                        minWidth: '180px',
                        color: '#f1f5f9',
                      }}
                    >
                      <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px', color: '#e2e8f0', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                        ✈ {d.carrier}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#34d399', fontWeight: 600 }}>Min Fare</span>
                          <span style={{ color: '#f1f5f9', fontWeight: 700, fontFamily: 'monospace' }}>{formatINR(d.min)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#818cf8', fontWeight: 600 }}>Median Fare</span>
                          <span style={{ color: '#f1f5f9', fontWeight: 700, fontFamily: 'monospace' }}>{formatINR(d.median)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#fb7185', fontWeight: 600 }}>Max Fare</span>
                          <span style={{ color: '#f1f5f9', fontWeight: 700, fontFamily: 'monospace' }}>{formatINR(d.max)}</span>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid #334155', marginTop: '8px', paddingTop: '8px', color: '#94a3b8', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span>📊 {formatNumber(d.observations)} observations</span>
                        {d.marketShare != null && (
                          <span>📈 Market share: <strong style={{ color: '#e2e8f0' }}>{formatPercentage(d.marketShare, false, 1)}</strong></span>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend verticalAlign='top' height={28} wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey='min' name='Min Fare' fill='#10b981' radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fillOpacity={0.7} />
                ))}
              </Bar>
              <Bar dataKey='median' name='Median Fare' fill='#6366f1' radius={[3, 3, 0, 0]} />
              <Bar dataKey='max' name='Max Fare' fill='#f43f5e' radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
