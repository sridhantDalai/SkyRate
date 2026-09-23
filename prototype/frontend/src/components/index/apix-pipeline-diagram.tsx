'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Scale,
  Plane,
  Filter,
  Layers,
  Calculator,
  Activity,
  ArrowDown,
  ShieldCheck,
} from 'lucide-react';

const PIPELINE_STEPS = [
  {
    step: 1,
    title: 'Base Price Reference',
    icon: <Scale className='h-5 w-5 text-blue-500' />,
    badge: 'Base 100.00',
    description: 'We use the standard Consumer Price Index (CPI) as our starting point of 100.',
    details: 'Establishes a normal, baseline price for every monitored flight route.',
  },
  {
    step: 2,
    title: 'Collecting Flight Prices',
    icon: <Plane className='h-5 w-5 text-indigo-500' />,
    badge: 'Live Data',
    description: 'We gather real-time flight prices across all airlines from 1 to 45 days before departure.',
    details: 'Includes base fare, taxes, airport fees, and current seat availability.',
  },
  {
    step: 3,
    title: 'Data Cleaning',
    icon: <Filter className='h-5 w-5 text-amber-500' />,
    badge: 'Quality Check',
    description: 'We filter out data errors, glitched prices, and extreme outliers.',
    details: 'Ensures only realistic, bookable prices are used in our calculations.',
  },
  {
    step: 4,
    title: 'Grouping Data',
    icon: <Layers className='h-5 w-5 text-purple-500' />,
    badge: 'By State & Route',
    description: 'We organize the cleaned prices by the flight origin state and destination.',
    details: 'Accounts for how busy a route is based on actual flight frequency.',
  },
  {
    step: 5,
    title: 'Calculating the Index',
    icon: <Calculator className='h-5 w-5 text-emerald-500' />,
    badge: 'Price Formula',
    description: 'We apply a balanced mathematical formula to compare current prices against our baseline.',
    details: 'Provides a fair, unbiased view of how much prices have actually changed.',
  },
  {
    step: 6,
    title: 'Live Price Index',
    icon: <Activity className='h-5 w-5 text-rose-500' />,
    badge: 'Published Index',
    description: 'The final, easy-to-read number showing real airfare inflation.',
    details: 'Available as a national average or broken down state-by-state.',
  },
];

export function ApixPipelineDiagram() {
  return (
    <Card className='border-border/70 overflow-hidden'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <ShieldCheck className='h-5 w-5 text-primary' />
            <CardTitle className='text-base font-semibold'>
              How We Calculate APIx
            </CardTitle>
          </div>
          <Badge variant='outline' className='text-[10px]'>
            Methodology
          </Badge>
        </div>
        <CardDescription className='text-xs'>
          The step-by-step process of turning raw flight data into a reliable price index
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Pipeline Container */}
        <div className='relative space-y-3'>
          {PIPELINE_STEPS.map((step, idx) => (
            <React.Fragment key={step.step}>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-colors'>
                {/* Step Icon & Title */}
                <div className='flex items-start sm:items-center gap-3'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 border border-border/60'>
                    {step.icon}
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs font-mono font-bold text-muted-foreground'>
                        0{step.step}
                      </span>
                      <h4 className='text-sm font-bold text-foreground'>
                        {step.title}
                      </h4>
                      <Badge variant='secondary' className='text-[10px]'>
                        {step.badge}
                      </Badge>
                    </div>
                    <p className='text-xs text-muted-foreground mt-0.5 leading-relaxed'>
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Mathematical or Technical Specification */}
                <div className='sm:text-right shrink-0 bg-muted/30 px-3 py-1.5 rounded-md border border-border/50 font-mono text-[11px] text-foreground'>
                  {step.details}
                </div>
              </div>

              {/* Connecting Downward Arrow */}
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className='flex justify-center py-0.5 text-muted-foreground/60'>
                  <ArrowDown className='h-4 w-4 animate-bounce' />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
