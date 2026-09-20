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
      <Badge
        variant='success'
        className='flex items-center gap-1.5 text-[11px] cursor-pointer'
        onClick={() => refresh()}
        title='FastAPI Backend is connected. Click to ping.'
      >
        <span className='h-2 w-2 rounded-full bg-emerald-500' />
        API Live
      </Badge>
    );
  }

  return (
    <Badge
      variant='warning'
      className='flex items-center gap-1.5 text-[11px] cursor-pointer'
      onClick={() => refresh()}
      title='FastAPI backend not detected on :8000. Operating in offline demonstration mode. Click to retry.'
    >
      <span className='h-2 w-2 rounded-full bg-amber-500' />
      Sample Demo Mode
    </Badge>
  );
}
