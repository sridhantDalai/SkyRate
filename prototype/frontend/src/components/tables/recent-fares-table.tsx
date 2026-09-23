'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { formatCurrency } from '@/lib/formatters';
import type { LatestFaresResponse } from '@/types/fare';
import type { SkyRateApiError } from '@/lib/api';
import { CheckCircle2, Plane, Database } from 'lucide-react';

interface RecentFaresTableProps {
  data: LatestFaresResponse | null;
  isLoading: boolean;
  error: SkyRateApiError | null;
  onRetry?: () => void;
}

export function RecentFaresTable({
  data,
  isLoading,
  error,
  onRetry,
}: RecentFaresTableProps) {
  if (isLoading) {
    return <LoadingState height='h-48' message='Loading live flight observations from partition...' />;
  }

  if (error) {
    return (
      <ErrorState
        title='Failed to Load Recent Fares'
        message={error.message}
        code={error.code}
        onRetry={onRetry}
      />
    );
  }

  const items = data?.items || [];

  if (items.length === 0) {
    return (
      <EmptyState
        title='No Flight Observations Recorded'
        description='FastAPI returned zero flight observations for the active query partition.'
        actionLabel='Retry Query'
        onAction={onRetry}
      />
    );
  }

  return (
    <Card className='border-border/70 overflow-hidden shadow-sm'>
      <CardHeader className='pb-3 border-b border-border/60 bg-muted/10'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div>
            <div className='flex items-center gap-2'>
              <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Plane className='h-4 w-4' />
              </div>
              <CardTitle className='text-base font-bold text-foreground'>
                Flight-Level Price Surveillance Observations
              </CardTitle>
              <Badge variant='outline' className='text-[10px] font-mono'>
                scraped_on partition
              </Badge>
            </div>
            <CardDescription className='text-xs text-muted-foreground mt-1'>
              Raw flight itineraries with statutory fee decomposition (Base Fare, Taxes, UDF Fee, Gross Fare)
            </CardDescription>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant='secondary' className='text-xs font-mono'>
              <Database className='h-3 w-3 mr-1 text-primary' />
              {data?.total || items.length} Total Records
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className='p-0 overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground'>
              <TableHead className='w-[90px]'>Flight No.</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className='text-right'>Base Fare</TableHead>
              <TableHead className='text-right'>Taxes</TableHead>
              <TableHead className='text-right text-primary font-semibold'>UDF Fee</TableHead>
              <TableHead className='text-right font-bold'>Gross Fare</TableHead>
              <TableHead className='text-center'>Status</TableHead>
              <TableHead className='text-center'>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.slice(0, 15).map((f, idx) => {
              const isSoldOut =
                f.status?.toLowerCase().includes('sold out') ||
                f.status?.toLowerCase().includes('cancelled');

              return (
                <TableRow key={f.ID || idx} className='hover:bg-muted/30 text-xs transition-colors'>
                  <TableCell className='font-mono font-bold text-xs text-foreground'>
                    {f.flight_number}
                  </TableCell>
                  <TableCell className='font-medium text-foreground'>
                    {f.carrier}
                  </TableCell>
                  <TableCell className='font-mono font-medium text-xs text-muted-foreground'>
                    {f.route}
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline' className='text-[10px] font-mono font-semibold'>
                      {f.t_window}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {f.is_non_stop ? (
                      <span className='inline-flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-medium'>
                        <CheckCircle2 className='mr-1 h-3 w-3' /> Non-stop
                      </span>
                    ) : (
                      <span className='inline-flex items-center text-[11px] text-muted-foreground'>
                        1-stop
                      </span>
                    )}
                  </TableCell>
                  <TableCell className='text-right font-mono text-muted-foreground'>
                    {f.base_fare != null ? formatCurrency(f.base_fare) : '—'}
                  </TableCell>
                  <TableCell className='text-right font-mono text-muted-foreground'>
                    {f.taxes != null ? formatCurrency(f.taxes) : '—'}
                  </TableCell>
                  <TableCell className='text-right font-mono font-semibold text-primary'>
                    {f.udf_fee != null ? formatCurrency(f.udf_fee) : '—'}
                  </TableCell>
                  <TableCell className='text-right font-mono font-bold text-foreground text-sm'>
                    {f.gross_fare != null ? formatCurrency(f.gross_fare) : '—'}
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      variant={isSoldOut ? 'destructive' : 'success'}
                      className='text-[10px]'
                    >
                      {f.status}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge variant='secondary' className='text-[9px] font-mono'>
                      {f.source || 'Scraper'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
