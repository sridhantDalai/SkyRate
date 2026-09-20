'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BookOpen, AlertTriangle } from 'lucide-react';

export function MethodologyBreakdown() {
  return (
    <div className='space-y-4'>
      <Card className='border-border/70'>
        <CardHeader className='pb-3'>
          <div className='flex items-center gap-2'>
            <BookOpen className='h-5 w-5 text-primary' />
            <CardTitle className='text-base font-semibold'>
              Fisher Ideal Mathematical Formulation
            </CardTitle>
          </div>
          <CardDescription className='text-xs'>
            Why SkyRate uses the Fisher Ideal geometric mean index over pure Laspeyres or Paasche
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4 text-xs leading-relaxed text-muted-foreground'>
          <div className='p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2'>
            <p className='font-mono text-sm font-bold text-foreground'>
              APIx_t = 100 × √ [ L_t × P_t ]
            </p>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-[11px]'>
              <div className='p-2 rounded bg-background border border-border/50'>
                <span className='font-bold text-primary'>Laspeyres (Base Weighted):</span>
                <p className='mt-0.5 text-foreground'>L_t = ( ∑ P_t × Q_0 ) / ( ∑ P_0 × Q_0 )</p>
                <span className='text-[10px] text-muted-foreground'>Upper bound (tends to overstate inflation)</span>
              </div>
              <div className='p-2 rounded bg-background border border-border/50'>
                <span className='font-bold text-primary'>Paasche (Current Weighted):</span>
                <p className='mt-0.5 text-foreground'>P_t = ( ∑ P_t × Q_t ) / ( ∑ P_0 × Q_t )</p>
                <span className='text-[10px] text-muted-foreground'>Lower bound (tends to understate inflation)</span>
              </div>
            </div>
          </div>

          <p>
            In passenger air travel, consumers adjust purchase behavior when airlines raise fares on specific corridors, shifting to alternative flight times or direct carriers. A pure Laspeyres index ignores consumer substitution bias, whereas a Paasche index understates base welfare cost.
          </p>
          <p>
            The <strong>Fisher Ideal Index</strong> solves this by taking the geometric mean, satisfying the <em>time-reversal</em> and <em>factor-reversal</em> tests per government price index standards.
          </p>
        </CardContent>
      </Card>

      {/* Non-Causal Econometric Notice */}
      <Card className='border-amber-500/30 bg-amber-500/5'>
        <CardContent className='p-4'>
          <div className='flex items-start gap-3'>
            <AlertTriangle className='h-5 w-5 text-amber-500 shrink-0 mt-0.5' />
            <div className='space-y-1 text-xs'>
              <span className='font-bold text-foreground'>
                Econometric Notice: Observed Pricing vs. Causal Elasticity
              </span>
              <p className='text-muted-foreground leading-relaxed'>
                APIx records empirical fare expenditures and yield divergence across advance-purchase windows. In strict accordance with regulatory standards, these indices represent <strong>observed market price behavior</strong> and must not be interpreted as causal elasticity models (e.g., attributing price shifts solely to carrier market power, fuel surcharges, or seasonal demand without external structural controls).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
