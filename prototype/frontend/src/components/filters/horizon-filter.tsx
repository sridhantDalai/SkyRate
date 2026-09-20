'use client';

import { HORIZONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HorizonFilterProps {
  value?: string;
  onChange: (horizon: string) => void;
  includeAllOption?: boolean;
  className?: string;
}

export function HorizonFilter({
  value,
  onChange,
  includeAllOption = true,
  className,
}: HorizonFilterProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {includeAllOption && (
        <Button
          type='button'
          size='sm'
          variant={!value ? 'default' : 'outline'}
          onClick={() => onChange('')}
          className='text-xs'
        >
          All Horizons
        </Button>
      )}
      {HORIZONS.map((h) => {
        const isSelected = value === h.value;
        return (
          <Button
            key={h.value}
            type='button'
            size='sm'
            variant={isSelected ? 'default' : 'outline'}
            onClick={() => onChange(h.value)}
            className={cn('text-xs font-medium', isSelected && 'shadow-sm')}
            title={h.description}
          >
            {h.value}
          </Button>
        );
      })}
    </div>
  );
}
