'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Scale,
  Database,
  ShieldCheck,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export function MethodologySummaryCard() {
  return (
    <Card className='border-border/70 overflow-hidden shadow-sm'>
      <CardHeader className='pb-4 border-b border-border/60 bg-muted/20'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <BookOpen className='h-4 w-4' />
              </div>
              <CardTitle className='text-lg font-bold text-foreground'>
                Methodology & Data Governance Architecture
              </CardTitle>
              <Badge variant='outline' className='text-[10px]'>
                SIH26056 Specification
              </Badge>
            </div>
            <CardDescription className='text-xs text-muted-foreground'>
              Mathematical formulation, partition data pipeline, and regulatory compliance standards
            </CardDescription>
          </div>

          <div className='flex items-center gap-2'>
            <Badge variant='success' className='text-[10px] gap-1'>
              <CheckCircle2 className='h-3 w-3' />
              MoSPI & DGCA Aligned
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className='pt-5 space-y-6'>
        {/* 4 Pillars Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          {/* Pillar 1: Fisher Ideal Formulation */}
          <div className='p-4 rounded-xl border border-border/70 bg-card/60 space-y-2.5 hover:border-primary/40 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                1. Index Formulation
              </span>
              <div className='flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary'>
                <Scale className='h-3.5 w-3.5' />
              </div>
            </div>
            <div className='p-2 rounded-lg bg-muted/40 font-mono text-xs font-bold text-primary border border-border/50 text-center'>
              APIx = 100 × √ [ L_t × P_t ]
            </div>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              Fisher Ideal geometric mean reconciles Laspeyres (base-weighted) and Paasche (current-weighted) indices, eliminating consumer substitution bias across carrier alternatives.
            </p>
          </div>

          {/* Pillar 2: Dynamic Data Partitioning */}
          <div className='p-4 rounded-xl border border-border/70 bg-card/60 space-y-2.5 hover:border-primary/40 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                2. Partition Architecture
              </span>
              <div className='flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary'>
                <Database className='h-3.5 w-3.5' />
              </div>
            </div>
            <div className='p-2 rounded-lg bg-muted/40 font-mono text-xs text-foreground border border-border/50 text-center'>
              scraped_on / index_for
            </div>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              Automated high-frequency scraping pipelines ingest live airfare quotes into date-partitioned PostgreSQL tables, ensuring full auditability and zero cross-partition leakage.
            </p>
          </div>

          {/* Pillar 3: ML Outlier & Statistical Integrity */}
          <div className='p-4 rounded-xl border border-border/70 bg-card/60 space-y-2.5 hover:border-primary/40 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                3. Statistical Integrity
              </span>
              <div className='flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-500'>
                <ShieldCheck className='h-3.5 w-3.5' />
              </div>
            </div>
            <div className='p-2 rounded-lg bg-muted/40 font-mono text-xs text-emerald-500 border border-border/50 text-center'>
              Isolation Forest ML
            </div>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              Unsupervised anomaly detection removes bot artifacts and erroneous scrapings. Fares are median-aggregated across T+1 to T+45 lead time horizons without synthetic interpolation.
            </p>
          </div>

          {/* Pillar 4: Statutory Fare Decomposition */}
          <div className='p-4 rounded-xl border border-border/70 bg-card/60 space-y-2.5 hover:border-primary/40 transition-colors'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                4. Statutory Compliance
              </span>
              <div className='flex h-6 w-6 items-center justify-center rounded bg-amber-500/10 text-amber-500'>
                <FileSpreadsheet className='h-3.5 w-3.5' />
              </div>
            </div>
            <div className='p-2 rounded-lg bg-muted/40 font-mono text-xs text-amber-500 border border-border/50 text-center'>
              DGCA AIC 06/2010
            </div>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              Full fee decomposition into Base Fare, Fuel Surcharge (YQ), User Development Fee (UDF), Passenger Service Fee (PSF), and statutory GST (5% Economy / 12% Business).
            </p>
          </div>
        </div>

        {/* Regulatory & Econometric Notice Banner */}
        <div className='flex items-start gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs'>
          <AlertTriangle className='h-4 w-4 text-amber-500 shrink-0 mt-0.5' />
          <div className='space-y-0.5 text-muted-foreground'>
            <span className='font-semibold text-foreground text-xs'>
              Econometric Notice & Baseline Standards:
            </span>
            <p className='leading-relaxed'>
              The Airfare Price Index (APIx) represents empirical market fare expenditures referenced against the national MoSPI Consumer Price Index (CPI Base = 100.00). All index observations reflect real-time captured data through authenticated FastAPI endpoints with zero direct database exposure.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
