'use client';

import { AIRLINE_CARRIERS } from '@/lib/constants';
import { Select } from '@/components/ui/select';

interface CarrierFilterProps {
  value?: string;
  onChange: (carrier: string) => void;
  includeAllOption?: boolean;
  className?: string;
}

export function CarrierFilter({
  value,
  onChange,
  includeAllOption = true,
  className,
}: CarrierFilterProps) {
  return (
    <Select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {includeAllOption && <option value=''>All Airline Carriers</option>}
      {AIRLINE_CARRIERS.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Select>
  );
}
