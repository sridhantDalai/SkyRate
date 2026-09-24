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
import { Badge } from '@/components/ui/badge';
import { formatHorizon } from '@/lib/formatters';
import type { APIxIndexRecord } from '@/types/index';

interface StateIndexTableProps {
  records: APIxIndexRecord[];
  allIndiaBase?: number;
  isLoading?: boolean;
}

export function StateIndexTable({
  records,
  isLoading = false,
}: StateIndexTableProps) {
  if (isLoading) {
    return (
      <div className='flex h-48 w-full items-center justify-center rounded-lg border border-border bg-card'>
        <p className='text-sm text-muted-foreground animate-pulse'>Loading state index records...</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>State / Region</TableHead>
          <TableHead>Horizon</TableHead>
          <TableHead className='text-right'>MoSPI Base</TableHead>
          <TableHead className='text-right'>Real-Time APIx</TableHead>
          <TableHead className='text-right'>Basket Inflation</TableHead>
          <TableHead className='text-center'>Divergence</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((r, idx) => {
          const divergence = r.RealTime_APIx - r.MoSPI_Base;
          const isHigher = divergence > 0;
          const isLower = divergence < 0;

          return (
            <TableRow key={idx} className='hover:bg-muted/30'>
              <TableCell className='font-semibold text-xs text-foreground'>
                {r.State}
              </TableCell>
              <TableCell>
                <Badge variant='outline' className='text-[10px] font-medium bg-muted/20 whitespace-nowrap'>
                  {formatHorizon(r.Time_Horizon)}
                </Badge>
              </TableCell>
              <TableCell className='text-right text-xs text-muted-foreground'>
                {r.MoSPI_Base.toFixed(2)}
              </TableCell>
              <TableCell className='text-right font-bold text-sm text-foreground'>
                {r.RealTime_APIx.toFixed(2)}
              </TableCell>
              <TableCell className='text-right font-medium text-xs'>
                <span className={isHigher ? 'text-rose-500' : isLower ? 'text-emerald-500' : 'text-muted-foreground'}>
                  {r.Basket_Inflation}
                </span>
              </TableCell>
              <TableCell className='text-center'>
                <Badge
                  variant={isHigher ? 'destructive' : isLower ? 'success' : 'secondary'}
                  className='text-[10px]'
                >
                  {isHigher ? `+${divergence.toFixed(2)} pts` : `${divergence.toFixed(2)} pts`}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
