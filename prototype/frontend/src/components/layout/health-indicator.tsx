'use client';

import { useHealth } from '@/hooks/use-health';
import { Badge } from '@/components/ui/badge';

export function HealthIndicator() {
  const { isHealthy, isLoading, refresh } = useHealth(30000);

  if (isLoading) {
    return (
      <Badge variant='outline' className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
        <span className='h-2 w-2 rounded-full bg-amber-400 animate-ping' />
        Connecting...
      </Badge>
    );
  }

  if (isHealthy) {
    return (
      <button
        type='button'
        className='rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        onClick={() => refresh()}
        title='API is connected. Click to check again.'
      >
        <Badge variant='success' className='flex items-center gap-1.5 text-[11px] cursor-pointer'>
          <span className='h-2 w-2 rounded-full bg-emerald-500' />
          API Live
        </Badge>
      </button>
    );
  }

  return (
    <button
      type='button'
      className='rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      onClick={() => refresh()}
      title='The API is unavailable. Click to retry.'
    >
      <Badge variant='destructive' className='flex items-center gap-1.5 text-[11px] cursor-pointer'>
        <span className='h-2 w-2 rounded-full bg-red-500' />
        API Disconnected
      </Badge>
    </button>
  );
}
