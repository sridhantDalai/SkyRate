'use client';

import { KpiCard } from './kpi-card';
import { formatCurrency, formatNumber, formatDate } from '@/lib/formatters';
import type { AnalyticsOverview } from '@/types/analytics';
import { Plane, IndianRupee, Activity, Calendar } from 'lucide-react';

interface QuickMetricsProps {
  data: AnalyticsOverview;
  isLoading?: boolean;
}

export function QuickMetrics({ data }: QuickMetricsProps) {
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <KpiCard
        title='Real-Time APIx Index'
        value={data.latest_apix ? data.latest_apix.toFixed(2) : '100.00'}
        change={data.percentage_change}
        changeLabel='vs prior partition'
        subtitle='Benchmark: 100 (MoSPI CPI Base)'
        badgeText='National'
        badgeVariant='info'
        icon={<Activity className='h-5 w-5' />}
      />

      <KpiCard
        title='Observed Median Fare'
        value={formatCurrency(data.median_fare)}
        subtitle={`Range: ${formatCurrency(data.lowest_observed_fare)} – ${formatCurrency(data.highest_observed_fare)}`}
        icon={<IndianRupee className='h-5 w-5' />}
      />

      <KpiCard
        title='Monitored Inventory'
        value={formatNumber(data.number_of_observed_fares)}
        subtitle={`${data.number_of_routes} Corridors · ${data.number_of_carriers} Airlines`}
        icon={<Plane className='h-5 w-5' />}
      />

      <KpiCard
        title='Partition Date'
        value={formatDate(data.latest_observation_date || '2026-09-19')}
        subtitle='Live automated scraper partition'
        badgeText='DGCA Scope'
        badgeVariant='success'
        icon={<Calendar className='h-5 w-5' />}
      />
    </div>
  );
}
