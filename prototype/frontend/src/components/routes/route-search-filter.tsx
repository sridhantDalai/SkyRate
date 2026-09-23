'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { HorizonFilter } from '@/components/filters/horizon-filter';
import { MONITORED_ROUTES, AIRLINE_CARRIERS, AIRPORT_METADATA } from '@/lib/constants';
import { useDebounce } from '@/hooks/use-debounce';
import type { RouteExplorerFilters } from '@/hooks/use-route-explorer';
import {
  Search,
  ArrowLeftRight,
  RotateCcw,
  Filter,
  Plane,
} from 'lucide-react';

interface RouteSearchFilterProps {
  filters: RouteExplorerFilters;
  onUpdateFilters: (newFilters: Partial<RouteExplorerFilters>) => void;
  onReset: () => void;
}

const AIRPORTS = Object.entries(AIRPORT_METADATA).map(([code, meta]) => ({
  code,
  city: meta.city,
  name: meta.name,
}));

export function RouteSearchFilter({
  filters,
  onUpdateFilters,
  onReset,
}: RouteSearchFilterProps) {
  const [searchInput, setSearchInput] = React.useState('');
  const debouncedSearch = useDebounce(searchInput, 250);

  // Filter monitored corridors based on debounced search text
  const matchingCorridors = React.useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    const query = debouncedSearch.toLowerCase().trim();
    return MONITORED_ROUTES.filter(
      (r) =>
        r.route.toLowerCase().includes(query) ||
        r.origin.toLowerCase().includes(query) ||
        r.destination.toLowerCase().includes(query) ||
        r.origin_city.toLowerCase().includes(query) ||
        r.destination_city.toLowerCase().includes(query)
    );
  }, [debouncedSearch]);

  const activeOrigin = filters.origin || (filters.route?.includes('-') ? filters.route.split('-')[0] : 'DEL');
  const activeDestination = filters.destination || (filters.route?.includes('-') ? filters.route.split('-')[1] : 'BOM');

  // Handle swapping origin and destination
  const handleSwap = () => {
    onUpdateFilters({
      origin: activeDestination,
      destination: activeOrigin,
      route: `${activeDestination}-${activeOrigin}`,
    });
  };

  const handleSelectCorridor = (route: string, origin: string, destination: string) => {
    onUpdateFilters({ route, origin, destination });
    setSearchInput('');
  };

  return (
    <Card className='border-border/70 overflow-hidden shadow-sm'>
      <CardContent className='p-5 space-y-4'>
        {/* Header & Reset */}
        <div className='flex items-center justify-between border-b border-border/60 pb-3'>
          <div className='flex items-center gap-2 text-xs font-semibold text-foreground'>
            <Filter className='h-4 w-4 text-primary' />
            <span>Corridor Exploration & Parameter Filters</span>
          </div>
          <Button
            variant='ghost'
            size='xs'
            onClick={() => {
              setSearchInput('');
              onReset();
            }}
            className='text-xs text-muted-foreground hover:text-foreground gap-1'
          >
            <RotateCcw className='h-3 w-3' />
            Reset Defaults
          </Button>
        </div>

        {/* 1. Debounced Route Search Bar */}
        <div className='space-y-2'>
          <label htmlFor='route-search-input' className='block text-[11px] font-semibold text-muted-foreground'>
            Fast Route Search (Search by airport code or city name)
          </label>
          <div className='relative'>
            <Search className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              id='route-search-input'
              type='text'
              placeholder='Search corridor (e.g. DEL-BOM, Mumbai, BLR, Kolkata, Hyderabad)...'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className='pl-9 text-xs h-9 bg-background/80'
            />
            {searchInput && (
              <Button
                variant='ghost'
                size='xs'
                onClick={() => setSearchInput('')}
                className='absolute right-2 top-1.5 h-6 text-[10px] text-muted-foreground hover:text-foreground'
              >
                Clear
              </Button>
            )}
          </div>

          {/* Quick Corridor Selection Suggestions */}
          {matchingCorridors.length > 0 && (
            <div className='flex items-center gap-1.5 flex-wrap pt-1'>
              <span className='text-[10px] text-muted-foreground'>Matches:</span>
              {matchingCorridors.map((c) => (
                <button
                  key={c.route}
                  type='button'
                  onClick={() => handleSelectCorridor(c.route, c.origin, c.destination)}
                  className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors'
                >
                  <Plane className='h-2.5 w-2.5' />
                  <span className='font-mono font-bold'>{c.route}</span>
                  <span className='text-[10px] text-muted-foreground'>({c.origin_city} ➔ {c.destination_city})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Origin / Swap / Destination / Carrier Row */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1'>
          {/* Origin Selector */}
          <div>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>
              Origin
            </label>
            <Select
              value={activeOrigin}
              onChange={(e) => {
                const newOrigin = e.target.value;
                const dest = activeDestination === newOrigin ? (newOrigin === 'DEL' ? 'BOM' : 'DEL') : activeDestination;
                onUpdateFilters({
                  origin: newOrigin,
                  destination: dest,
                  route: `${newOrigin}-${dest}`,
                });
              }}
            >
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} – {a.city} ({a.name.split(' ')[0]})
                </option>
              ))}
            </Select>
          </div>

          {/* Destination Selector with Swap Button */}
          <div>
            <div className='flex items-center justify-between mb-1'>
              <label className='text-[11px] font-semibold text-muted-foreground'>
                Destination
              </label>
              <button
                type='button'
                onClick={handleSwap}
                title='Swap Origin and Destination'
                className='flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium cursor-pointer'
              >
                <ArrowLeftRight className='h-3 w-3' />
                <span>Swap</span>
              </button>
            </div>
            <Select
              value={activeDestination}
              onChange={(e) => {
                const newDest = e.target.value;
                const orig = activeOrigin === newDest ? (newDest === 'BOM' ? 'DEL' : 'BOM') : activeOrigin;
                onUpdateFilters({
                  origin: orig,
                  destination: newDest,
                  route: `${orig}-${newDest}`,
                });
              }}
            >
              {AIRPORTS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} – {a.city} ({a.name.split(' ')[0]})
                </option>
              ))}
            </Select>
          </div>

          {/* Carrier Selector */}
          <div>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>
              Carrier
            </label>
            <Select
              value={filters.carrier || ''}
              onChange={(e) => onUpdateFilters({ carrier: e.target.value || undefined })}
            >
              <option value=''>All Operating Airlines</option>
              {AIRLINE_CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* 3. Advanced Horizon & Granularity */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/40'>
          <div>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>
              Booking Horizon
            </label>
            <HorizonFilter
              value={filters.horizon}
              onChange={(h) => onUpdateFilters({ horizon: h || undefined })}
              includeAllOption={true}
            />
          </div>

          <div>
            <label className='block text-[11px] font-semibold text-muted-foreground mb-1'>
              Aggregation
            </label>
            <Select
              value={filters.granularity || 'daily'}
              onChange={(e) =>
                onUpdateFilters({
                  granularity: e.target.value as 'daily' | 'weekly' | 'monthly',
                })
              }
            >
              <option value='daily'>Daily Grain</option>
              <option value='weekly'>Weekly Aggregate</option>
              <option value='monthly'>Monthly Summary</option>
            </Select>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
