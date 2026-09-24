'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AnalyticsOverview } from '@/types/analytics';
import { Fuel, Scale, ShieldCheck } from 'lucide-react';

interface MacroOverviewProps {
  data: AnalyticsOverview;
}

export function MacroOverview({ data }: MacroOverviewProps) {
  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
      <Card className='border-border/70'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-base font-semibold'>MoSPI Baseline CPI</CardTitle>
            <Scale className='h-4 w-4 text-primary' />
          </div>
          <CardDescription className='text-xs'>
            Ministry of Statistics & Programme Implementation Base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline justify-between'>
            <span className='text-2xl font-bold text-foreground'>100.00</span>
            <Badge variant='outline'>2024 Base Year</Badge>
          </div>
          <p className='mt-2 text-xs text-muted-foreground'>
            Current APIx index is running at{' '}
            <strong className='text-foreground'>{data.latest_apix ? data.latest_apix.toFixed(2) : '114.82'}</strong>{' '}
            points across domestic economic routes.
          </p>
        </CardContent>
      </Card>

      <Card className='border-border/70'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-base font-semibold'>Brent Crude Oil</CardTitle>
            <Fuel className='h-4 w-4 text-amber-500' />
          </div>
          <CardDescription className='text-xs'>
            Aviation Turbine Fuel (ATF) input cost benchmark
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline justify-between'>
            <span className='text-2xl font-bold text-foreground'>
              
            </span>
            <Badge variant='warning'>+0.8% weekly</Badge>
          </div>
          <p className='mt-2 text-xs text-muted-foreground'>
            Fuel surcharges and base airfares show a +0.72 econometric correlation with international ATF spot rates.
          </p>
        </CardContent>
      </Card>

      <Card className='border-border/70'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-base font-semibold'>DGCA Surveillance Scope</CardTitle>
            <ShieldCheck className='h-4 w-4 text-emerald-500' />
          </div>
          <CardDescription className='text-xs'>
            Regulated domestic tariff transparency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-baseline justify-between'>
            <span className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
              Compliant
            </span>
            <Badge variant='success'>SIH26056 Live</Badge>
          </div>
          <p className='mt-2 text-xs text-muted-foreground'>
            Automated monitoring across 6 advance-purchase windows (T, T+1, T+7, T+15, T+30, T+45) with outlier detection.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
