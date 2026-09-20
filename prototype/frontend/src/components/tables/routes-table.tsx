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
import type { RouteItem } from '@/types/fare';
import { Eye } from 'lucide-react';

interface RoutesTableProps {
  routes: RouteItem[];
  selectedRoute?: string | null;
  onSelectRoute: (route: string) => void;
  isLoading?: boolean;
}

export function RoutesTable({
  routes,
  selectedRoute,
  onSelectRoute,
  isLoading = false,
}: RoutesTableProps) {
  if (isLoading) {
    return (
      <div className='flex h-48 w-full items-center justify-center rounded-lg border border-border bg-card'>
        <p className='text-sm text-muted-foreground animate-pulse'>Loading monitored corridors...</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Corridor</TableHead>
          <TableHead>Origin City</TableHead>
          <TableHead>Destination City</TableHead>
          <TableHead>Traffic Density</TableHead>
          <TableHead className='text-right'>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {routes.map((r) => {
          const isSelected = selectedRoute === r.route;
          return (
            <TableRow
              key={r.route}
              className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 font-medium' : 'hover:bg-muted/30'}`}
              onClick={() => onSelectRoute(r.route)}
            >
              <TableCell className='font-mono font-bold text-xs text-foreground'>
                {r.route}
              </TableCell>
              <TableCell className='text-xs'>
                <span className='font-medium'>{r.origin_city}</span>{' '}
                <span className='text-muted-foreground font-mono'>({r.origin})</span>
              </TableCell>
              <TableCell className='text-xs'>
                <span className='font-medium'>{r.destination_city}</span>{' '}
                <span className='text-muted-foreground font-mono'>({r.destination})</span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    r.density === 'High'
                      ? 'destructive'
                      : r.density === 'Medium'
                      ? 'warning'
                      : 'secondary'
                  }
                  className='text-[10px]'
                >
                  {r.density}
                </Badge>
              </TableCell>
              <TableCell className='text-right'>
                <Button
                  size='xs'
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRoute(r.route);
                  }}
                  className='text-[11px] gap-1'
                >
                  <Eye className='h-3 w-3' /> Details
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
