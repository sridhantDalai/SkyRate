'use client';

import { MONITORED_ROUTES } from '@/lib/constants';
import { Select } from '@/components/ui/select';

interface CorridorFilterProps {
  value?: string;
  onChange: (route: string) => void;
  includeAllOption?: boolean;
  className?: string;
}

export function CorridorFilter({
  value,
  onChange,
  includeAllOption = true,
  className,
}: CorridorFilterProps) {
  return (
    <Select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {includeAllOption && <option value=''>All Aviation Corridors</option>}
      {MONITORED_ROUTES.map((item) => (
        <option key={item.route} value={item.route}>
          {item.route} ({item.origin_city} ➔ {item.destination_city})
        </option>
      ))}
    </Select>
  );
}
