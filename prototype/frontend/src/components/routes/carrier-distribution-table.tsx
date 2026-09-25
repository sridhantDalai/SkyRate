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
import { formatCurrency, formatNumber } from '@/lib/formatters';
import type { CarrierFareStats } from '@/types/analytics';

interface CarrierDistributionTableProps {
  carriers: CarrierFareStats[];
  isLoading: boolean;
  selectedRoute: string;
}

export function CarrierDistributionTable({
  carriers,
  isLoading,
  selectedRoute,
}: CarrierDistributionTableProps) {
  if (carriers.length === 0 && !isLoading) {
    return (
      <EmptyState
        title='No Carrier Distribution Available'
        description={`No operating carrier observations recorded for corridor ${selectedRoute} in the current surveillance window.`}
      />
    );
  }

  return (
    <Card className='border-border/70'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-base font-semibold'>
              Carrier Distribution & Inventory Breakdown
            </CardTitle>
            <CardDescription className='text-xs'>
              Comparable fare statistics and availability counts across airlines for {selectedRoute}
            </CardDescription>
          </div>
          <Badge variant='outline' className='text-xs'>
            {carriers.length} Airlines Tracked
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Airline Carrier</TableHead>
              <TableHead className='text-right'>Observations</TableHead>
              <TableHead className='text-right'>Available</TableHead>
              <TableHead className='text-right'>Sold Out</TableHead>
              <TableHead className='text-right'>Minimum</TableHead>
              <TableHead className='text-right'>Median</TableHead>
              <TableHead className='text-right'>Average</TableHead>
              <TableHead className='text-right'>Maximum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carriers.map((c) => (
              <TableRow key={c.carrier} className='hover:bg-muted/30'>
                <TableCell className='font-semibold text-xs text-foreground'>
                  {c.carrier}
                </TableCell>
                <TableCell className='text-right text-xs font-mono'>
                  {formatNumber(c.observations ?? c.flight_count)}
                </TableCell>
                <TableCell className='text-right text-xs text-emerald-600 dark:text-emerald-400 font-mono'>
                  {formatNumber(c.available_count)}
                </TableCell>
                <TableCell className='text-right text-xs text-rose-500 font-mono'>
                  {formatNumber(c.sold_out_count)}
                </TableCell>
                <TableCell className='text-right text-xs text-muted-foreground font-mono'>
                  {formatCurrency(c.minimum ?? c.min_fare)}
                </TableCell>
                <TableCell className='text-right text-xs font-bold text-foreground font-mono'>
                  {formatCurrency(c.median)}
                </TableCell>
                <TableCell className='text-right text-xs text-muted-foreground font-mono'>
                  {formatCurrency(c.average ?? c.avg_gross_fare)}
                </TableCell>
                <TableCell className='text-right text-xs text-muted-foreground font-mono'>
                  {formatCurrency(c.maximum ?? c.max_fare)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
