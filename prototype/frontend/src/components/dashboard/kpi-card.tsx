'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number | null;
  changeLabel?: string;
  icon?: React.ReactNode;
  badgeText?: string;
  badgeVariant?: 'default' | 'secondary' | 'success' | 'warning' | 'info';
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  change,
  changeLabel = 'vs prior period',
  icon,
  badgeText,
  badgeVariant = 'secondary',
  className,
}: KpiCardProps) {
  const isPositive = change !== undefined && change !== null && change > 0;
  const isNegative = change !== undefined && change !== null && change < 0;
  const isZero = change !== undefined && change !== null && change === 0;

  return (
    <Card className={cn('relative overflow-hidden transition-all duration-300 hover:shadow-md border-border/70 hover:border-primary/30', className)}>
      <CardContent className='p-5'>
        <div className='flex items-center justify-between'>
          <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            {title}
          </p>
          {icon && (
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              {icon}
            </div>
          )}
        </div>

        <div className='mt-3 flex items-baseline gap-2'>
          <h2 className='text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
            {value}
          </h2>
          {badgeText && (
            <Badge variant={badgeVariant} className='text-[10px]'>
              {badgeText}
            </Badge>
          )}
        </div>

        {(change !== undefined && change !== null) ? (
          <div className='mt-3 flex items-center gap-1.5 text-xs'>
            {isPositive && (
              <span className='flex items-center font-semibold text-rose-500'>
                <TrendingUp className='mr-0.5 h-3.5 w-3.5' />
                +{change.toFixed(2)}%
              </span>
            )}
            {isNegative && (
              <span className='flex items-center font-semibold text-emerald-500'>
                <TrendingDown className='mr-0.5 h-3.5 w-3.5' />
                {change.toFixed(2)}%
              </span>
            )}
            {isZero && (
              <span className='flex items-center font-medium text-muted-foreground'>
                <Minus className='mr-0.5 h-3.5 w-3.5' />
                0.00%
              </span>
            )}
            <span className='text-muted-foreground'>{changeLabel}</span>
          </div>
        ) : subtitle ? (
          <p className='mt-2 text-xs text-muted-foreground'>{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
