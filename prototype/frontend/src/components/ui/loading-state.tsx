'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  height?: string;
  message?: string;
  className?: string;
}

export function LoadingState({
  height = 'h-64',
  message = 'Fetching live data from FastAPI...',
  className,
}: LoadingStateProps) {
  return (
    <Card className={cn('border-border/60 bg-muted/5', className)}>
      <CardContent className={cn('flex flex-col items-center justify-center p-8 space-y-3', height)}>
        <div className='h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin' />
        <p className='text-xs text-muted-foreground animate-pulse'>{message}</p>
      </CardContent>
    </Card>
  );
}
