'use client';

import * as React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { APIxIndexRecord } from '@/types/index';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StateDivergenceHeatmapProps {
  records: APIxIndexRecord[];
  isLoading?: boolean;
  /** Which horizon to snapshot. Defaults to 'T+7' */
  horizon?: string;
}

export function StateDivergenceHeatmap({
  records,
  isLoading = false,
  horizon = 'T+7',
}: StateDivergenceHeatmapProps) {
  /* ── pick the best available horizon ─────────────────────────────────── */
  const available = React.useMemo(
    () => Array.from(new Set(records.map((r) => r.Time_Horizon))),
    [records]
  );
  const effectiveH = available.includes(horizon)
    ? horizon
    : available.includes('T+7')
    ? 'T+7'
    : available[0] ?? horizon;

  /* ── filter to one horizon, exclude All India, sort by divergence desc ─ */
  const tiles = React.useMemo(() => {
    return records
      .filter((r) => r.Time_Horizon === effectiveH && r.State !== 'All India')
      .map((r) => ({
        state: r.State,
        apix: r.RealTime_APIx,
        base: r.MoSPI_Base,
        inflation: r.Basket_Inflation,
        div: r.RealTime_APIx - r.MoSPI_Base,
      }))
      .sort((a, b) => b.div - a.div);
  }, [records, effectiveH]);

  /* ── All India reference for this horizon ─────────────────────────────── */
  const allIndia = records.find(
    (r) => r.State === 'All India' && r.Time_Horizon === effectiveH
  );

  if (isLoading) {
    return (
      <div className='space-y-3'>
        <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5'>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className='h-20 rounded-xl' />
          ))}
        </div>
      </div>
    );
  }

  if (tiles.length === 0) return null;

  /* ── colour ramp helper ─────────────────────────────────────────────── */
  function tileStyle(div: number) {
    if (div > 5)  return { ring: 'ring-rose-500/40',    bg: 'bg-rose-500/8',    text: 'text-rose-400',    badge: 'destructive' as const };
    if (div > 0)  return { ring: 'ring-amber-500/30',   bg: 'bg-amber-500/6',   text: 'text-amber-400',   badge: 'secondary' as const  };
    if (div < -5) return { ring: 'ring-emerald-500/40', bg: 'bg-emerald-500/8', text: 'text-emerald-400', badge: 'success' as const    };
    if (div < 0)  return { ring: 'ring-sky-500/30',     bg: 'bg-sky-500/6',     text: 'text-sky-400',     badge: 'secondary' as const  };
    return         { ring: 'ring-border/60',             bg: 'bg-muted/20',      text: 'text-muted-foreground', badge: 'outline' as const };
  }

  return (
    <div className='space-y-4'>
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className='flex items-center justify-between gap-3 flex-wrap'>
        <div className='flex items-center gap-2 flex-wrap'>
          <span className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
            Snapshot at:
          </span>
          <Badge variant='outline' className='text-[10px] font-mono'>{effectiveH}</Badge>
          {allIndia && (
            <>
              <span className='text-border text-[10px]'>·</span>
              <span className='text-[10px] text-muted-foreground'>
                All-India APIx:{' '}
                <strong className='text-foreground font-mono'>
                  {allIndia.RealTime_APIx.toFixed(2)}
                </strong>
              </span>
              <Badge
                variant={allIndia.RealTime_APIx - allIndia.MoSPI_Base > 0 ? 'destructive' : 'success'}
                className='text-[10px]'
              >
                {allIndia.Basket_Inflation}
              </Badge>
            </>
          )}
        </div>

        {/* Legend */}
        <div className='flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap'>
          <span className='flex items-center gap-1'><TrendingUp className='h-3 w-3 text-rose-400' />Surge</span>
          <span className='flex items-center gap-1'><TrendingDown className='h-3 w-3 text-emerald-400' />Deflation</span>
          <span className='flex items-center gap-1'><Minus className='h-3 w-3 text-muted-foreground' />Neutral</span>
        </div>
      </div>

      {/* ── State tiles ────────────────────────────────────────────────── */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5'>
        {tiles.map((t) => {
          const s = tileStyle(t.div);
          const Icon = t.div > 0 ? TrendingUp : t.div < 0 ? TrendingDown : Minus;
          return (
            <div
              key={t.state}
              className={`rounded-xl ring-1 ${s.ring} ${s.bg} p-3 space-y-1.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div className='flex items-center justify-between gap-1'>
                <span className='text-[11px] font-bold text-foreground truncate'>{t.state}</span>
                <Icon className={`h-3 w-3 shrink-0 ${s.text}`} />
              </div>
              <p className={`text-lg font-extrabold tracking-tight font-mono leading-none ${s.text}`}>
                {t.apix.toFixed(1)}
              </p>
              <Badge variant={s.badge} className='text-[9px] w-full justify-center truncate'>
                {t.inflation}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* ── CTA to full table ────────────────────────────────────────────── */}
      <div className='flex justify-end'>
        <Link
          href='/apix'
          className='inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1.5 px-3 rounded-md hover:bg-primary/5'
        >
          Full state-wise drill-down
          <ArrowRight className='h-3.5 w-3.5' />
        </Link>
      </div>
    </div>
  );
}
