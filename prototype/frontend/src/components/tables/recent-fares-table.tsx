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
import { CheckCircle2 } from 'lucide-react';

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
    <Card className='border-border/70'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-base font-semibold'>
              Recent Flight Observations
            </CardTitle>
            <CardDescription className='text-xs'>
              Live scraped flight observations from partition {data?.partition_date || 'active'}
            </CardDescription>
          </div>
          <Badge variant='outline' className='text-xs'>
            {data?.total || items.length} Flights
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[100px]'>Flight No.</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Corridor</TableHead>
              <TableHead>Horizon</TableHead>
              <TableHead>Routing</TableHead>
              <TableHead className='text-right'>Base Fare</TableHead>
              <TableHead className='text-right'>Taxes & Fees</TableHead>
              <TableHead className='text-right'>Gross Fare</TableHead>
              <TableHead className='text-center'>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.slice(0, 10).map((f, idx) => {
              const isSoldOut = f.status?.toLowerCase().includes('sold out');
              return (
                <TableRow key={f.ID || idx} className='hover:bg-muted/30'>
                  <TableCell className='font-mono font-medium text-xs'>
                    {f.flight_number}
                  </TableCell>
                  <TableCell className='text-xs font-semibold text-foreground'>
                    {f.carrier}
                  </TableCell>
                  <TableCell className='font-mono text-xs'>
                    {f.route}
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline' className='text-[10px]'>
                      {f.t_window}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {f.is_non_stop ? (
                      <span className='inline-flex items-center text-[11px] text-emerald-600 dark:text-emerald-400'>
                        <CheckCircle2 className='mr-1 h-3 w-3' /> Non-stop
                      </span>
                    ) : (
                      <span className='inline-flex items-center text-[11px] text-muted-foreground'>
                        1-stop
                      </span>
                    )}
                  </TableCell>
                  <TableCell className='text-right text-xs text-muted-foreground'>
                    {formatCurrency(f.base_fare)}
                  </TableCell>
                  <TableCell className='text-right text-xs text-muted-foreground'>
                    {formatCurrency((f.taxes || 0) + (f.udf_fee || 0))}
                  </TableCell>
                  <TableCell className='text-right font-bold text-sm text-foreground'>
                    {formatCurrency(f.gross_fare)}
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      variant={isSoldOut ? 'destructive' : 'success'}
                      className='text-[10px]'
                    >
                      {f.status}
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
