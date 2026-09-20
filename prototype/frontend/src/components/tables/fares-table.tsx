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
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import type { FareItem } from '@/types/fare';
import { Plane, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

interface FaresTableProps {
  fares: FareItem[];
  totalCount: number;
  currentPage: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function FaresTable({
  fares,
  totalCount,
  currentPage,
  pageSize = 20,
  onPageChange,
  isLoading = false,
}: FaresTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (isLoading) {
    return (
      <div className='flex h-64 w-full items-center justify-center rounded-lg border border-border bg-card'>
        <p className='text-sm text-muted-foreground animate-pulse'>Loading flight observations...</p>
      </div>
    );
  }

  if (fares.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center'>
        <Plane className='h-8 w-8 text-muted-foreground/50' />
        <p className='mt-2 font-medium text-foreground text-sm'>No flight fares found</p>
        <p className='text-xs text-muted-foreground'>Try adjusting your route, carrier, or booking horizon filters.</p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[100px]'>Flight No.</TableHead>
            <TableHead>Corridor</TableHead>
            <TableHead>Carrier</TableHead>
            <TableHead>Horizon</TableHead>
            <TableHead>Routing</TableHead>
            <TableHead className='text-right'>Base Fare</TableHead>
            <TableHead className='text-right'>Taxes & Fees</TableHead>
            <TableHead className='text-right'>Gross Fare</TableHead>
            <TableHead className='text-center'>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fares.map((f, idx) => {
            const isSoldOut = f.status.toLowerCase().includes('sold out');
            return (
              <TableRow key={f.ID || idx} className='hover:bg-muted/30'>
                <TableCell className='font-mono font-medium text-xs'>
                  {f.flight_number}
                </TableCell>
                <TableCell className='font-semibold text-xs'>
                  {f.route}
                </TableCell>
                <TableCell className='text-xs text-foreground'>
                  {f.carrier}
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

      <div className='flex items-center justify-between px-2 text-xs text-muted-foreground'>
        <div>
          Showing {fares.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(currentPage * pageSize, totalCount)} of {totalCount} observations
        </div>
        <div className='flex items-center gap-1.5'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className='h-7 text-xs px-2'
          >
            <ChevronLeft className='h-3.5 w-3.5' /> Prev
          </Button>
          <span className='px-2 font-medium text-foreground'>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className='h-7 text-xs px-2'
          >
            Next <ChevronRight className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>
    </div>
  );
}
