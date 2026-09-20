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
    title: 'MoSPI Baseline',
    icon: <Scale className='h-5 w-5 text-blue-500' />,
    badge: 'Base 100.00',
    description: 'Reference Consumer Price Index base year 2024 published by the Ministry of Statistics & Programme Implementation (MoSPI).',
    details: 'P_0 base period prices established across monitored DGCA city-pair corridors.',
  },
  {
    step: 2,
    title: 'Observed Airfare',
    icon: <Plane className='h-5 w-5 text-indigo-500' />,
    badge: 'Raw Scrapes',
    description: 'Empirical gross airfare collection across commercial carriers and booking horizons (T through T+45).',
    details: 'Collects base fare, passenger service fees, UDF airport tariffs, and seat inventory status.',
  },
  {
    step: 3,
    title: 'Anomaly Filtering',
    icon: <Filter className='h-5 w-5 text-amber-500' />,
    badge: 'Outlier Rejection',
    description: 'Statistical sanitization eliminating scrap errors, fare glitches, and extreme non-representative outliers.',
    details: 'Interquartile range (IQR) boundaries and cancellation status segregation.',
  },
  {
    step: 4,
    title: 'Route / State Aggregation',
    icon: <Layers className='h-5 w-5 text-purple-500' />,
    badge: 'State & Corridors',
    description: 'Grouping cleaned flight fare observations by origin state, destination, and advance-purchase booking window.',
    details: 'Weights mapped to historical DGCA seat capacity (Q_0) and active flight frequency (Q_t).',
  },
  {
    step: 5,
    title: 'Fisher Ideal Index',
    icon: <Calculator className='h-5 w-5 text-emerald-500' />,
    badge: 'Geometric Mean',
    description: 'Calculates the geometric mean of Laspeyres base-weighted and Paasche current-weighted price indices.',
    details: 'APIx_t = 100 × √ [ ( ∑ P_t Q_0 / ∑ P_0 Q_0 ) × ( ∑ P_t Q_t / ∑ P_0 Q_t ) ]',
  },
  {
    step: 6,
    title: 'Real-Time APIx',
    icon: <Activity className='h-5 w-5 text-rose-500' />,
    badge: 'Published Index',
    description: 'Final published Real-Time Airfare Price Index tracking empirical price inflation and corridor divergence.',
    details: 'Segmented by national All-India benchmarks and individual state yield indicators.',
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
              APIx Computation Pipeline & Data Provenance
            </CardTitle>
          </div>
          <Badge variant='outline' className='text-[10px]'>
            SIH26056 Methodology
          </Badge>
        </div>
        <CardDescription className='text-xs'>
          End-to-end mathematical data lineage from government MoSPI baseline to published Fisher Ideal APIx
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
