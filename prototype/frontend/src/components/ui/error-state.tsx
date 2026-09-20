'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Backend Request Failed',
  message = 'Failed to load data from the FastAPI service.',
  code,
  details,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn('border-destructive/30 bg-destructive/5', className)}>
      <CardContent className='flex flex-col items-center justify-center p-6 text-center'>
        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3'>
          <AlertTriangle className='h-5 w-5' />
        </div>
        <div className='flex items-center gap-2 mb-1'>
          <h3 className='text-sm font-semibold text-foreground'>{title}</h3>
          {code && (
            <Badge variant='destructive' className='text-[10px] font-mono'>
              {code}
            </Badge>
          )}
        </div>
        <p className='text-xs text-muted-foreground max-w-md leading-relaxed'>
          {message}
        </p>
        {details && Object.keys(details).length > 0 && (
          <pre className='mt-2 max-w-md overflow-x-auto rounded bg-background/80 p-2 text-[10px] text-muted-foreground border border-border text-left font-mono'>
            {JSON.stringify(details, null, 2)}
          </pre>
        )}
        {onRetry && (
          <Button
            variant='outline'
            size='sm'
            onClick={onRetry}
            className='mt-3 text-xs gap-1.5'
          >
            <RefreshCw className='h-3 w-3' />
            Retry Request
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
