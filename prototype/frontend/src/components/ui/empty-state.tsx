'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'No Data Available',
  description = 'No observations found for the selected query parameters.',
  actionLabel,
  onAction,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('border-border/60 border-dashed bg-muted/10', className)}>
      <CardContent className='flex flex-col items-center justify-center p-8 text-center'>
        <div className='flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3'>
          {icon || <Database className='h-6 w-6' />}
        </div>
        <h3 className='text-sm font-semibold text-foreground tracking-tight'>{title}</h3>
        <p className='mt-1 max-w-sm text-xs text-muted-foreground leading-relaxed'>
          {description}
        </p>
        {actionLabel && onAction && (
          <Button
            variant='outline'
            size='sm'
            onClick={onAction}
            className='mt-4 text-xs gap-1.5'
          >
            <RefreshCw className='h-3 w-3' />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
