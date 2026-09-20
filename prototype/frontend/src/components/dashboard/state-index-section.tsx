'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StateIndexTable } from '@/components/tables/state-index-table';
import type { APIxIndexRecord } from '@/types/index';
import type { SkyRateApiError } from '@/lib/api';
import { Search, MapPin } from 'lucide-react';

interface StateIndexSectionProps {
  records: APIxIndexRecord[];
  isLoading: boolean;
  error: SkyRateApiError | null;
  onRetry?: () => void;
}

const HORIZONS = ['All', 'T+1', 'T+7', 'T+15', 'T+30', 'T+45'];

export function StateIndexSection({
  records,
  isLoading,
  error,
  onRetry,
}: StateIndexSectionProps) {
  const [selectedHorizon, setSelectedHorizon] = React.useState<string>('All');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  const filteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      const matchesHorizon = selectedHorizon === 'All' || r.Time_Horizon === selectedHorizon;
      const matchesSearch =
        !searchQuery.trim() ||
        r.State.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesHorizon && matchesSearch;
    });
  }, [records, selectedHorizon, searchQuery]);

  // Derive quick summary stats
  const summary = React.useMemo(() => {
    if (records.length === 0) return null;
    let maxDiv = -Infinity;
    let minDiv = Infinity;
    let maxState = '';
    let minState = '';
    let sumDiv = 0;

    for (const r of records) {
      const div = r.RealTime_APIx - r.MoSPI_Base;
      sumDiv += div;
      if (div > maxDiv) {
        maxDiv = div;
        maxState = `${r.State} (${r.Time_Horizon})`;
      }
      if (div < minDiv) {
        minDiv = div;
        minState = `${r.State} (${r.Time_Horizon})`;
      }
    }

    const avgDiv = sumDiv / records.length;
    return {
      maxState,
      maxDiv,
      minState,
      minDiv,
      avgDiv,
      uniqueStates: Array.from(new Set(records.map((r) => r.State))).length,
    };
  }, [records]);

  if (error) {
    return (
      <Card className='border-border/70'>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <MapPin className='h-5 w-5 text-primary' />
            <CardTitle className='text-base font-semibold'>State-wise Airfare Price Index (APIx)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ErrorState
            title='Failed to load state-wise index'
            message={error.message}
            onRetry={onRetry}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border-border/70 overflow-hidden shadow-sm'>
      <CardHeader className='pb-4 border-b border-border/60'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2 flex-wrap'>
              <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <MapPin className='h-4 w-4' />
              </div>
              <CardTitle className='text-lg font-bold text-foreground'>
                State-wise Airfare Price Index (APIx)
              </CardTitle>
              {summary && (
                <Badge variant='outline' className='text-[10px] font-mono'>
                  {summary.uniqueStates} States Monitored
                </Badge>
              )}
            </div>
            <CardDescription className='text-xs text-muted-foreground mt-1'>
              State-level price divergence mapped against the MoSPI CPI baseline (100.00)
            </CardDescription>
          </div>

          {/* Filters: Horizon pills + Search input */}
          <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5'>
            <div className='relative'>
              <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                placeholder='Search state...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='h-8 w-full sm:w-44 pl-8 text-xs'
              />
            </div>

            <div className='flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0'>
              {HORIZONS.map((h) => (
                <Button
                  key={h}
                  variant={selectedHorizon === h ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setSelectedHorizon(h)}
                  className='h-7 text-xs px-2.5 shrink-0'
                >
                  {h}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick summary stat banner if records present */}
        {summary && (
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-border/50 text-xs'>
            <div className='p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium'>Highest Inflation:</span>
              <span className='font-bold text-rose-500 truncate ml-2 font-mono text-[11px]'>
                {summary.maxState} (+{summary.maxDiv.toFixed(2)} pts)
              </span>
            </div>
            <div className='p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium'>Lowest / Discount:</span>
              <span className='font-bold text-emerald-500 truncate ml-2 font-mono text-[11px]'>
                {summary.minState} ({summary.minDiv.toFixed(2)} pts)
              </span>
            </div>
            <div className='p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between'>
              <span className='text-muted-foreground text-[11px] font-medium'>Average Divergence:</span>
              <span className='font-bold text-foreground font-mono text-[11px]'>
                {summary.avgDiv >= 0 ? `+${summary.avgDiv.toFixed(2)}` : summary.avgDiv.toFixed(2)} pts
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className='p-0'>
        {isLoading ? (
          <div className='p-6'>
            <LoadingState height='h-48' message='Loading state-level index records from FastAPI...' />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className='p-6'>
            <EmptyState
              title='No State Index Records Match Filters'
              description='Try clearing search queries or selecting a different horizon window.'
              actionLabel='Reset Filters'
              onAction={() => {
                setSelectedHorizon('All');
                setSearchQuery('');
              }}
            />
          </div>
        ) : (
          <StateIndexTable records={filteredRecords} isLoading={false} />
        )}
      </CardContent>
    </Card>
  );
}
