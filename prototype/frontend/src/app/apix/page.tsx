'use client';

import * as React from 'react';
import { useIndex } from '@/hooks/use-index';
import { useFares } from '@/hooks/use-fares';

import { StateIndexComparisonChart } from '@/components/charts/state-index-comparison-chart';
import { StateHorizonChart } from '@/components/charts/state-horizon-chart';
import { StateIndexTable } from '@/components/tables/state-index-table';
import { RecentFaresTable } from '@/components/tables/recent-fares-table';
import { StateDivergenceHeatmap } from '@/components/dashboard/state-divergence-heatmap';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';

import {
  RefreshCw, Clock, Database,
  BarChart3, Activity, Search, Filter, MapPin,
} from 'lucide-react';
import { formatTime, formatRelativeTime } from '@/lib/formatters';

const HORIZON_FILTERS = ['All', 'T+1', 'T+7', 'T+15', 'T+30', 'T+45'] as const;

/* ── Section Label Helper ─────────────────────────────────────────────────── */
function SectionLabel({
  icon, title, sub, badge,
}: { icon: React.ReactNode; title: string; sub: string; badge: string }) {
  return (
    <div className='flex items-start justify-between gap-3 border-b border-border/50 pb-3 mb-4'>
      <div className='flex items-start gap-2.5'>
        <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0'>
          {icon}
        </div>
        <div>
          <h2 className='text-base font-bold text-foreground tracking-tight leading-snug'>{title}</h2>
          <p className='text-[11px] text-muted-foreground mt-0.5 leading-relaxed max-w-2xl'>{sub}</p>
        </div>
      </div>
      <Badge variant='outline' className='text-[10px] font-mono shrink-0 mt-0.5 border-border/80'>
        {badge}
      </Badge>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function ApixIndexPage() {
  const {
    overview: indexOverview,
    isLoading,
    error,
    lastUpdated,
    refetch,
  } = useIndex();

  const { data: faresData, isLoading: isFaresLoading, error: faresError, refetch: refetchFares } = useFares({ limit: 15, offset: 0 });

  const handleRefreshAll = React.useCallback(() => {
    refetch();
    refetchFares();
  }, [refetch, refetchFares]);

  const [selectedHorizon, setSelectedHorizon] = React.useState<string>('T+7');
  const [selectedState, setSelectedState] = React.useState<string>('Delhi');
  const [tableHorizon, setTableHorizon] = React.useState<string>('All');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const allRecords = React.useMemo(
    () => [...(indexOverview?.all_india ?? []), ...(indexOverview?.states ?? [])],
    [indexOverview]
  );

  /* ── Filtered Records for Econometric Table ─────────────────────────── */
  const filteredRecords = React.useMemo(() => {
    return allRecords.filter((record) => {
      const matchesSearch = record.State.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesHorizon = tableHorizon === 'All' || record.Time_Horizon === tableHorizon;
      return matchesSearch && matchesHorizon;
    });
  }, [allRecords, searchQuery, tableHorizon]);

  /* ── Summary Insights ───────────────────────────────────────────────── */
  const summary = React.useMemo(() => {
    if (allRecords.length === 0) return null;
    let maxDiv = -Infinity;
    let minDiv = Infinity;
    let maxState = '';
    let minState = '';

    for (const r of allRecords) {
      if (r.State === 'All India') continue;
      const div = r.RealTime_APIx - r.MoSPI_Base;
      if (div > maxDiv) {
        maxDiv = div;
        maxState = `${r.State} (${r.Time_Horizon})`;
      }
      if (div < minDiv) {
        minDiv = div;
        minState = `${r.State} (${r.Time_Horizon})`;
      }
    }

    const uniqueStates = Array.from(new Set(allRecords.map((r) => r.State))).filter(
      (s) => s !== 'All India'
    ).length;

    return { maxState, maxDiv, minState, minDiv, uniqueStates };
  }, [allRecords]);

  return (
    <div className='space-y-10 animate-in fade-in-50 duration-300'>

      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-border/60'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <h1 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight'>
              Airfare Price Index (APIx)
            </h1>
            <Badge variant='outline' className='text-[10px] gap-1 border-primary/40 text-primary font-semibold'>
              <Activity className='h-2.5 w-2.5 animate-pulse' />
              Live Index
            </Badge>
            <Badge variant='secondary' className='text-[10px] font-mono'>
              State-Wise
            </Badge>
          </div>
          <div className='flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap mt-1'>
            {lastUpdated && (
              <span className='flex items-center gap-1'>
                <Clock className='h-3 w-3' />
                {formatRelativeTime(lastUpdated)} · {formatTime(lastUpdated)} IST
              </span>
            )}
            {summary && (
              <>
                <span className='text-border'>|</span>
                <span className='text-muted-foreground'>
                  {summary.uniqueStates} States Monitored
                </span>
              </>
            )}
          </div>
        </div>

        <Button
          variant='outline'
          size='sm'
          onClick={handleRefreshAll}
          className='gap-1.5 text-xs h-8 shrink-0 border-border/80 hover:border-primary/50 hover:text-primary transition-colors'
        >
          <RefreshCw className='h-3.5 w-3.5' />
          Refresh
        </Button>
      </div>

      {/* ── GLOBAL ERROR ─────────────────────────────────────────────────── */}
      {error && !isLoading && (
        <ErrorState
          title='Failed to load APIx index data'
          message={error.message}
          code={error.code}
          details={error.details}
          onRetry={refetch}
        />
      )}

      {/* ── SECTION 1: DUAL VISUAL ANALYTICS CHARTS ──────────────────────── */}
      <section aria-label='Interactive State-Wise Index Analytics'>
        <SectionLabel
          icon={<BarChart3 className='h-4 w-4' />}
          title='State-by-State Price Trends'
          sub='Compare flight prices across different states and booking horizons.'
          badge='Visual Analytics'
        />

        {summary && (
          <div className='flex items-center gap-2.5 text-xs flex-wrap mb-5'>
            <div className='px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-500 font-medium flex items-center gap-1.5'>
              <span className='text-[10px] uppercase text-muted-foreground'>Highest Surge:</span>
              <strong className='font-mono font-bold'>{summary.maxState}</strong>
              <span className='text-[10px]'>(+{summary.maxDiv.toFixed(1)} pts)</span>
            </div>
            <div className='px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 font-medium flex items-center gap-1.5'>
              <span className='text-[10px] uppercase text-muted-foreground'>Most Stable:</span>
              <strong className='font-mono font-bold'>{summary.minState}</strong>
              <span className='text-[10px]'>({summary.minDiv.toFixed(1)} pts)</span>
            </div>
          </div>
        )}

        <div className='space-y-6'>
          {/* 1. State-Wise Airfare Price Index vs MoSPI CPI Baseline */}
          <StateIndexComparisonChart
            records={allRecords}
            isLoading={isLoading}
            error={error}
            selectedHorizon={selectedHorizon === 'All' ? 'T+1' : selectedHorizon}
            onHorizonChange={(h) => setSelectedHorizon(h)}
            onRetry={refetch}
          />

          {/* 2. State-Wise APIx Divergence Heatmap (Placed after StateIndexComparisonChart) */}
          <Card className='border-border/70 overflow-hidden shadow-sm'>
            <CardHeader className='pb-3 border-b border-border/60 bg-muted/10'>
              <div className='flex items-center justify-between gap-4 flex-wrap'>
                <div className='flex items-center gap-2'>
                  <MapPin className='h-4 w-4 text-primary' />
                  <CardTitle className='text-sm font-semibold text-foreground'>
                    State-Wise APIx Divergence Heatmap
                  </CardTitle>
                  <CardDescription className='text-xs text-muted-foreground hidden sm:inline'>
                    Basket inflation vs MoSPI CPI baseline
                  </CardDescription>
                </div>
                <Badge variant='outline' className='text-[10px] font-mono'>
                  Active Horizon: {selectedHorizon === 'All' ? 'T+1' : selectedHorizon}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className='pt-4 pb-5'>
              {isLoading ? (
                <LoadingState height='h-36' message='Loading state divergence intelligence…' />
              ) : allRecords.length === 0 ? (
                <EmptyState
                  title='No State Index Records'
                  description='No state index records available for the selected criteria.'
                  actionLabel='Retry Connection'
                  onAction={refetch}
                />
              ) : (
                <StateDivergenceHeatmap
                  records={allRecords}
                  isLoading={isLoading}
                  horizon={selectedHorizon === 'All' ? 'T+1' : selectedHorizon}
                />
              )}
            </CardContent>
          </Card>

          {/* 3. Booking Horizon Escalation Curve */}
          <StateHorizonChart
            records={allRecords}
            selectedState={selectedState}
            onStateChange={(s) => setSelectedState(s)}
            isLoading={isLoading}
            error={error}
            onRetry={refetch}
          />
        </div>
      </section>

      {/* ── SECTION 2: STATE-LEVEL ECONOMETRIC INDEX MATRIX ──────────────── */}
      <section aria-label='State-level Econometric Index Matrix Table'>
        <SectionLabel
          icon={<Database className='h-4 w-4' />}
          title='State Data Table'
          sub='Comprehensive price levels, base references, and inflation data for each state.'
          badge='Data Table'
        />

        <Card className='border-border/70 shadow-sm overflow-hidden'>
          <CardHeader className='pb-4 border-b border-border/60 bg-muted/10'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
              <div>
                <CardTitle className='text-base font-bold text-foreground'>
                  Price Index Data
                </CardTitle>
                <CardDescription className='text-xs text-muted-foreground mt-0.5'>
                  {filteredRecords.length} records matching filters
                </CardDescription>
              </div>

              {/* Controls */}
              <div className='flex items-center gap-3 flex-wrap'>
                {/* Search */}
                <div className='relative w-48'>
                  <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                  <Input
                    placeholder='Search state…'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='pl-8 h-8 text-xs'
                  />
                </div>

                {/* Horizon Filter Pills */}
                <div className='flex items-center gap-1 rounded-lg border border-border/70 p-1 bg-card'>
                  <Filter className='h-3 w-3 text-muted-foreground ml-1 mr-0.5' />
                  {HORIZON_FILTERS.map((h) => (
                    <Button
                      key={h}
                      variant={tableHorizon === h ? 'default' : 'ghost'}
                      size='sm'
                      className='h-6 text-[10px] px-2 font-mono'
                      onClick={() => setTableHorizon(h)}
                    >
                      {h}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className='p-0'>
            {isLoading ? (
              <LoadingState height='h-48' message='Loading state-level index records…' />
            ) : filteredRecords.length === 0 ? (
              <EmptyState
                title='No records found'
                description='No index observations match your state search or horizon filter.'
                actionLabel='Clear Filters'
                onAction={() => {
                  setSearchQuery('');
                  setTableHorizon('All');
                }}
              />
            ) : (
              <StateIndexTable records={filteredRecords} isLoading={false} />
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── SECTION 3: LIVE FLIGHT OBSERVATIONS ───────────────────────────── */}
      <section aria-label='Flight-Level Price Surveillance'>
        <SectionLabel
          icon={<Database className='h-4 w-4' />}
          title='Flight-Level Observations'
          sub='Raw flight records with base fare, taxes, and fees breakdown.'
          badge='Live Data'
        />
        <RecentFaresTable
          data={faresData}
          isLoading={isFaresLoading}
          error={faresError}
          onRetry={refetchFares}
        />
      </section>

    </div>
  );
}
