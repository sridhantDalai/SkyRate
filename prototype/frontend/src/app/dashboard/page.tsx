'use client';

import * as React from 'react';
import { useOverview } from '@/hooks/use-overview';
import { useIndex } from '@/hooks/use-index';
import { useElasticity } from '@/hooks/use-elasticity';
import { useFeeBreakdown } from '@/hooks/use-fee-breakdown';


import { KpiCards } from '@/components/dashboard/kpi-cards';
import { StateDivergenceHeatmap } from '@/components/dashboard/state-divergence-heatmap';
import { StateIndexComparisonChart } from '@/components/charts/state-index-comparison-chart';
import { StateHorizonChart } from '@/components/charts/state-horizon-chart';

import { LeadTimeChart } from '@/components/charts/lead-time-chart';
import { FareComponentBreakdown } from '@/components/charts/fare-component-breakdown';


import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  RefreshCw, Clock, Activity, Database,
  BarChart3, Plane, MapPin, ArrowRight,
} from 'lucide-react';
import { formatTime, formatRelativeTime, formatDate } from '@/lib/formatters';

export default function DashboardPage() {
  /* ── Data Hooks ────────────────────────────────────────────────────────── */
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
    lastUpdated,
    refetch: refetchOverview,
  } = useOverview();

  const {
    overview: indexOverview,
    isLoading: isIndexLoading,
    error: indexError,
    refetch: refetchIndex,
  } = useIndex();

  const { data: elasticityData, isLoading: isElasticityLoading, error: elasticityError, refetch: refetchElasticity } =
    useElasticity();

  const { data: feeData, isLoading: isFeeLoading, error: feeError, refetch: refetchFees } =
    useFeeBreakdown();

  const handleRefreshAll = React.useCallback(() => {
    refetchOverview();
    refetchIndex();
    refetchElasticity();
    refetchFees();
  }, [refetchOverview, refetchIndex, refetchElasticity, refetchFees]);

  const [selectedHorizon, setSelectedHorizon] = React.useState<string>('T+7');
  const [selectedState, setSelectedState] = React.useState<string>('Delhi');

  /* ── Derived State ─────────────────────────────────────────────────────── */
  const allIndexRecords = React.useMemo(() => {
    const ai = indexOverview?.all_india ?? [];
    const st = indexOverview?.states ?? [];
    return [...ai, ...st];
  }, [indexOverview]);

  const stateSummary = React.useMemo(() => {
    if (allIndexRecords.length === 0) return null;
    let maxDiv = -Infinity;
    let minDiv = Infinity;
    let maxState = '';
    let minState = '';

    for (const r of allIndexRecords) {
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

    const uniqueStates = Array.from(new Set(allIndexRecords.map((r) => r.State))).filter(
      (s) => s !== 'All India'
    ).length;

    return { maxState, maxDiv, minState, minDiv, uniqueStates };
  }, [allIndexRecords]);

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className='space-y-10 animate-in fade-in-50 duration-300'>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-border/60'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <h1 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight'>
              Airfare Price Intelligence
            </h1>
            <Badge
              variant='outline'
              className='text-[10px] gap-1 border-primary/40 text-primary font-semibold'
            >
              <Activity className='h-2.5 w-2.5 animate-pulse' />
              Live · State-Wise APIx
            </Badge>
            <Badge variant='secondary' className='text-[10px] font-mono'>
              SIH26056
            </Badge>
          </div>

          <div className='flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap mt-1'>
            {lastUpdated && (
              <span className='flex items-center gap-1'>
                <Clock className='h-3 w-3' />
                {formatRelativeTime(lastUpdated)} · {formatTime(lastUpdated)} IST
              </span>
            )}
            {overviewData?.latest_observation_date && (
              <>
                <span className='text-border'>|</span>
                <span className='flex items-center gap-1 font-mono'>
                  <Database className='h-3 w-3 text-primary/80' />
                  Partition: {formatDate(overviewData.latest_observation_date)}
                </span>
              </>
            )}
            {indexOverview?.partition_table && (
              <>
                <span className='text-border'>|</span>
                <span className='font-mono text-[10px] text-muted-foreground/70'>
                  {indexOverview.partition_table}
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
          Refresh All
        </Button>
      </div>

      {/* ── SECTION 1: NATIONAL KPI STRIP ─────────────────────────────────── */}
      <section aria-label='National Key Performance Indicators'>
        <KpiCards
          data={overviewData}
          isLoading={isOverviewLoading || isIndexLoading}
          error={overviewError ?? indexError}
          onRetry={handleRefreshAll}
        />
      </section>

      {/* ── SECTION 2: STATE INFLATION DIVERGENCE SNAPSHOT ─────────────────── */}
      <section aria-label='State-wise Airfare Price Index Intelligence' className='space-y-3'>
        <SectionLabel
          icon={<BarChart3 className='h-4 w-4' />}
          title='State Inflation Divergence Snapshot'
          sub='Fisher-Ideal price index divergence vs MoSPI CPI baseline across Indian states (index_for partition)'
          badge='Live State Intelligence'
        />

        {stateSummary && (
          <div className='flex items-center gap-2.5 text-xs flex-wrap'>
            <Badge variant='secondary' className='text-[10px]'>
              {stateSummary.uniqueStates} States Monitored
            </Badge>
            <div className='px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-500 font-medium flex items-center gap-1.5'>
              <span className='text-[10px] uppercase text-muted-foreground'>Highest Surge:</span>
              <strong className='font-mono font-bold'>{stateSummary.maxState}</strong>
              <span className='text-[10px]'>(+{stateSummary.maxDiv.toFixed(1)} pts)</span>
            </div>
            <div className='px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 font-medium flex items-center gap-1.5'>
              <span className='text-[10px] uppercase text-muted-foreground'>Most Stable:</span>
              <strong className='font-mono font-bold'>{stateSummary.minState}</strong>
              <span className='text-[10px]'>({stateSummary.minDiv.toFixed(1)} pts)</span>
            </div>
          </div>
        )}

        {/* Dual State-Wise Index Charts */}
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
          <StateIndexComparisonChart
            records={allIndexRecords}
            isLoading={isIndexLoading}
            error={indexError}
            selectedHorizon={selectedHorizon === 'All' ? 'T' : selectedHorizon}
            onHorizonChange={(h) => setSelectedHorizon(h)}
            onRetry={refetchIndex}
          />

          <StateHorizonChart
            records={allIndexRecords}
            selectedState={selectedState}
            onStateChange={(s) => setSelectedState(s)}
            isLoading={isIndexLoading}
            error={indexError}
            onRetry={refetchIndex}
          />
        </div>

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
              <Link
                href='/apix'
                className='inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors'
              >
                Full Econometric Deep Dive
                <ArrowRight className='h-3.5 w-3.5' />
              </Link>
            </div>
          </CardHeader>
          <CardContent className='pt-4 pb-5'>
            {isIndexLoading ? (
              <LoadingState height='h-36' message='Loading state divergence intelligence…' />
            ) : allIndexRecords.length === 0 ? (
              <EmptyState
                title='No State Index Records'
                description='FastAPI returned zero state records for this partition.'
                actionLabel='Retry Connection'
                onAction={refetchIndex}
              />
            ) : (
              <StateDivergenceHeatmap
                records={allIndexRecords}
                isLoading={isIndexLoading}
                horizon='T+7'
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-label='Statutory Fare Decomposition' className='space-y-4'>
        <SectionLabel
          icon={<Plane className='h-4 w-4' />}
          title='Statutory Fare Decomposition'
          sub='Deconstructing gross airfares into Base Fare, Taxes & UDF — with advance-purchase lead-time elasticity'
          badge='scraped_on surveillance'
        />

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-5'>
          <FareComponentBreakdown
            data={feeData}
            isLoading={isFeeLoading}
            error={feeError}
            onRetry={refetchFees}
          />
          <LeadTimeChart
            data={elasticityData}
            isLoading={isElasticityLoading}
            error={elasticityError}
            onRetry={refetchElasticity}
          />
        </div>
      </section>



    </div>
  );
}

/* ── Section Label Helper ─────────────────────────────────────────────────── */
function SectionLabel({
  icon,
  title,
  sub,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  badge: string;
}) {
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
