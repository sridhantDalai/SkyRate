'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatINR } from '@/lib/formatters';
import { MONITORED_ROUTES, HORIZONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface HeatmapCell {
  route: string;
  horizon: string;
  median_fare: number | null;
}

interface RouteHeatmapProps {
  cells: HeatmapCell[];
  isLoading: boolean;
  className?: string;
}

/** Returns a hsl color interpolating from cool-blue (low) to hot-red (high). */
function heatColor(value: number, min: number, max: number): string {
  if (max === min) return 'hsl(220, 60%, 22%)';
  const t = (value - min) / (max - min); // 0..1
  // Interpolate: 220° (blue) → 0° (red), sat 60%, light 18..32%
  const hue = Math.round(220 - t * 220);
  const light = Math.round(18 + t * 16);
  return `hsl(${hue}, 70%, ${light}%)`;
}

function textColor(value: number, min: number, max: number): string {
  if (max === min) return 'text-blue-200';
  const t = (value - min) / (max - min);
  return t > 0.6 ? 'text-orange-100' : 'text-blue-100';
}

export function RouteHeatmap({ cells, isLoading, className }: RouteHeatmapProps) {
  if (isLoading) {
    return (
      <Card className={cn('border-border/70', className)}>
        <CardHeader className='pb-2'><Skeleton className='h-4 w-48' /></CardHeader>
        <CardContent><LoadingState height='h-[200px]' message='Building heatmap...' /></CardContent>
      </Card>
    );
  }

  if (cells.length === 0) {
    return (
      <EmptyState
        title='No Heatmap Data'
        description='No route × horizon fare data available for the current partition.'
      />
    );
  }

  // Only show horizons and routes we actually have data for
  const activeHorizons = HORIZONS.map((h) => h.value).filter((h) =>
    cells.some((c) => c.horizon === h && c.median_fare != null)
  );
  const activeRoutes = MONITORED_ROUTES.map((r) => r.route).filter((r) =>
    cells.some((c) => c.route === r && c.median_fare != null)
  );

  const fareValues = cells.map((c) => c.median_fare).filter((v): v is number => v != null);
  const min = Math.min(...fareValues);
  const max = Math.max(...fareValues);

  const lookup = new Map(cells.map((c) => [`${c.route}|${c.horizon}`, c.median_fare]));

  return (
    <Card className={cn('border-border/70', className)}>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base font-semibold'>Route × Horizon Fare Heatmap</CardTitle>
        <CardDescription className='text-xs'>
          Median observed fare by corridor and advance-purchase window.{' '}
          <span className='text-blue-400'>Blue = lower</span> ·{' '}
          <span className='text-orange-400'>Red = higher</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='overflow-x-auto'>
          <table
            className='w-full text-xs border-collapse min-w-[480px]'
            role='table'
            aria-label='Route and horizon fare heatmap'
          >
            <thead>
              <tr>
                <th className='text-left text-muted-foreground font-semibold px-2 py-1.5 border-b border-border/50 sticky left-0 bg-card z-10'>
                  Route
                </th>
                {activeHorizons.map((h) => (
                  <th
                    key={h}
                    className='text-center text-muted-foreground font-semibold px-2 py-1.5 border-b border-border/50 font-mono'
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRoutes.map((route) => (
                <tr key={route} className='group'>
                  <td className='text-left font-mono font-semibold text-foreground px-2 py-1.5 border-b border-border/30 sticky left-0 bg-card z-10 group-hover:text-primary'>
                    {route}
                  </td>
                  {activeHorizons.map((h) => {
                    const fare = lookup.get(`${route}|${h}`) ?? null;
                    const cellStyle =
                      fare != null
                        ? { backgroundColor: heatColor(fare, min, max) }
                        : undefined;
                    return (
                      <td
                        key={h}
                        className={cn(
                          'text-center px-2 py-2 border-b border-border/30 font-mono transition-opacity',
                          fare == null && 'text-muted-foreground/40'
                        )}
                        style={cellStyle}
                        title={fare != null ? `${route} ${h}: ${formatINR(fare)}` : 'No data'}
                        aria-label={fare != null ? `${route} ${h}: ${formatINR(fare)}` : `${route} ${h}: no data`}
                      >
                        {fare != null ? (
                          <span className={cn('font-semibold text-[11px]', textColor(fare, min, max))}>
                            {formatINR(fare)}
                          </span>
                        ) : (
                          <span className='text-[11px]'>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className='flex items-center gap-2 mt-3 text-[10px] text-muted-foreground'>
          <div className='h-2.5 w-16 rounded' style={{ background: 'linear-gradient(to right, hsl(220,70%,22%), hsl(0,70%,34%))' }} />
          <span>Lower → Higher median fare</span>
          <Badge variant='outline' className='text-[10px] ml-auto'>
            Range: {formatINR(min)} – {formatINR(max)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
