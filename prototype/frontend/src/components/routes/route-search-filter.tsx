'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MONITORED_ROUTES, AIRLINE_CARRIERS, AIRPORT_METADATA, HORIZONS } from '@/lib/constants';
import { useDebounce } from '@/hooks/use-debounce';
import type { RouteExplorerFilters } from '@/hooks/use-route-explorer';
import {
  Search,
  ArrowLeftRight,
  RotateCcw,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Building2,
  Calendar,
  Layers,
  SlidersHorizontal,
  Activity,
  X,
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
  const activeRoute = filters.route || `${activeOrigin}-${activeDestination}`;

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

  const liveCorridors = MONITORED_ROUTES.filter((r) => r.hasData);

  return (
    <Card className='border-border/70 overflow-hidden shadow-xs bg-card'>
      <CardContent className='p-4 sm:p-5 space-y-4'>
        {/* ── 1. Top Header Row: Title, Active Badge, Reset ── */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5'>
          <div className='flex items-center gap-2.5 flex-wrap'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <SlidersHorizontal className='h-4 w-4' />
            </div>
            <div>
              <div className='flex items-center gap-2 flex-wrap'>
                <span className='text-sm font-bold text-foreground'>
                  Corridor & Surveillance Parameters
                </span>
                <Badge variant='outline' className='text-[10px] font-mono gap-1 border-primary/30 text-primary'>
                  <Activity className='h-2.5 w-2.5 text-emerald-500' />
                  {activeRoute}
                </Badge>
              </div>
              <p className='text-[11px] text-muted-foreground mt-0.5'>
                Select airports, airline carrier, booking horizon, and aggregation granularity
              </p>
            </div>
          </div>

          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setSearchInput('');
              onReset();
            }}
            className='self-start sm:self-auto text-xs text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2.5'
          >
            <RotateCcw className='h-3.5 w-3.5' />
            Reset Defaults
          </Button>
        </div>

        {/* ── 2. Primary Corridor Flight Deck: Origin ⇄ Destination & Carrier ── */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-end'>
          {/* Origin & Destination Group (8 cols on desktop) */}
          <div className='lg:col-span-8 flex flex-col sm:flex-row items-center gap-2 sm:gap-2.5 w-full'>
            {/* Origin */}
            <div className='w-full flex-1'>
              <label htmlFor='corridor-origin-select' className='flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1.5'>
                <PlaneTakeoff className='h-3.5 w-3.5 text-primary' />
                <span>Origin Airport</span>
              </label>
              <Select
                id='corridor-origin-select'
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
                className='h-10 text-xs font-medium'
              >
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.city} ({a.name.split(' ')[0]})
                  </option>
                ))}
              </Select>
            </div>

            {/* Swap Button */}
            <div className='shrink-0 self-center sm:mt-5'>
              <button
                type='button'
                onClick={handleSwap}
                title='Swap Origin and Destination'
                aria-label='Swap Origin and Destination'
                className='flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary text-muted-foreground shadow-xs transition-all duration-200 cursor-pointer active:scale-95'
              >
                <ArrowLeftRight className='h-4 w-4' />
              </button>
            </div>

            {/* Destination */}
            <div className='w-full flex-1'>
              <label htmlFor='corridor-dest-select' className='flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1.5'>
                <PlaneLanding className='h-3.5 w-3.5 text-primary' />
                <span>Destination Airport</span>
              </label>
              <Select
                id='corridor-dest-select'
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
                className='h-10 text-xs font-medium'
              >
                {AIRPORTS.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.city} ({a.name.split(' ')[0]})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Carrier (4 cols on desktop) */}
          <div className='lg:col-span-4 w-full'>
            <label htmlFor='corridor-carrier-select' className='flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1.5'>
              <Building2 className='h-3.5 w-3.5 text-primary' />
              <span>Operating Airline</span>
            </label>
            <Select
              id='corridor-carrier-select'
              value={filters.carrier || ''}
              onChange={(e) => onUpdateFilters({ carrier: e.target.value || undefined })}
              className='h-10 text-xs font-medium'
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

        {/* ── 3. Quick-Jump Live Corridors Bar ── */}
        <div className='p-2.5 rounded-xl bg-muted/20 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2'>
          <div className='flex items-center gap-2 shrink-0'>
            <span className='flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
            <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
              Active Live Corridors:
            </span>
          </div>

          <div className='flex items-center gap-1.5 flex-wrap'>
            {liveCorridors.map((r) => {
              const isSelected = activeRoute === r.route;
              return (
                <button
                  key={r.route}
                  type='button'
                  onClick={() => handleSelectCorridor(r.route, r.origin, r.destination)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : 'bg-card hover:bg-muted/80 text-foreground border-border/80 hover:border-primary/40'
                  }`}
                >
                  <Plane className='h-3 w-3' />
                  <span>{r.route}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
                    }`}
                  >
                    {r.observations}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 4. Parameter Refinement Deck: Search, Horizon, Aggregation ── */}
        <div className='grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-border/40 items-start'>
          {/* Fast Route Search (5 cols) */}
          <div className='md:col-span-5 space-y-1.5'>
            <label htmlFor='route-search-input' className='flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground'>
              <Search className='h-3.5 w-3.5 text-primary' />
              <span>Fast Route Search</span>
            </label>
            <div className='relative'>
              <Search className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                id='route-search-input'
                type='text'
                placeholder='Search corridor (e.g. DEL-BOM, Mumbai, BLR)...'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className='pl-9 pr-8 text-xs h-9 bg-background/80'
              />
              {searchInput && (
                <button
                  type='button'
                  onClick={() => setSearchInput('')}
                  aria-label='Clear search'
                  className='absolute right-2 top-2 h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground cursor-pointer'
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              )}
            </div>

            {/* Quick search match chips */}
            {matchingCorridors.length > 0 && (
              <div className='flex items-center gap-1.5 flex-wrap pt-1'>
                <span className='text-[10px] text-muted-foreground'>Matches:</span>
                {matchingCorridors.map((c) => (
                  <button
                    key={c.route}
                    type='button'
                    onClick={() => handleSelectCorridor(c.route, c.origin, c.destination)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors cursor-pointer ${
                      activeRoute === c.route
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20'
                    }`}
                  >
                    <span className='font-mono font-bold'>{c.route}</span>
                    <span className='text-[10px] opacity-75'>({c.origin_city} ➔ {c.destination_city})</span>
                    {c.hasData && (
                      <span className='ml-0.5 px-1 rounded text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold'>
                        {c.observations}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Booking Horizon Pills (4 cols) */}
          <div className='md:col-span-4 space-y-1.5'>
            <label className='flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground'>
              <Calendar className='h-3.5 w-3.5 text-primary' />
              <span>Booking Horizon</span>
            </label>
            <div className='flex items-center gap-1 flex-wrap'>
              <button
                type='button'
                onClick={() => onUpdateFilters({ horizon: undefined })}
                className={`text-[11px] px-2.5 py-1 rounded-full font-mono font-semibold transition-all cursor-pointer ${
                  !filters.horizon
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/70'
                }`}
              >
                All
              </button>
              {HORIZONS.map((h) => {
                const isSelected = filters.horizon === h.value;
                return (
                  <button
                    key={h.value}
                    type='button'
                    onClick={() => onUpdateFilters({ horizon: h.value })}
                    title={h.description}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-mono font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/70'
                    }`}
                  >
                    {h.value}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aggregation Granularity (3 cols) */}
          <div className='md:col-span-3 space-y-1.5'>
            <label htmlFor='corridor-granularity-select' className='flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground'>
              <Layers className='h-3.5 w-3.5 text-primary' />
              <span>Aggregation</span>
            </label>
            <Select
              id='corridor-granularity-select'
              value={filters.granularity || 'daily'}
              onChange={(e) =>
                onUpdateFilters({
                  granularity: e.target.value as 'daily' | 'weekly' | 'monthly',
                })
              }
              className='h-9 text-xs font-medium'
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
