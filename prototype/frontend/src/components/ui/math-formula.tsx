'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, Sigma } from 'lucide-react';

interface MathFormulaProps {
  id?: string;
  equationNumber?: string;
  title: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success';
  latex?: string;
  children: React.ReactNode;
  description?: React.ReactNode;
  variables?: Array<{
    symbol: string;
    name: string;
    unit?: string;
    description: string;
  }>;
  properties?: Array<{
    name: string;
    status: string;
    detail: string;
  }>;
}

export function MathFormulaCard({
  id,
  equationNumber,
  title,
  badge = 'Econometric Formulation',
  badgeVariant = 'secondary',
  latex,
  children,
  description,
  variables,
  properties,
}: MathFormulaProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!latex) return;
    navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card
      id={id}
      className='border-border/80 bg-gradient-to-b from-card via-card/95 to-muted/20 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden'
    >
      <CardHeader className='pb-3 border-b border-border/50 bg-muted/10'>
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <div className='flex items-center gap-2'>
            <div className='flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Sigma className='h-4 w-4' />
            </div>
            <CardTitle className='text-sm sm:text-base font-bold text-foreground tracking-tight'>
              {title}
            </CardTitle>
          </div>
          <div className='flex items-center gap-2'>
            {equationNumber && (
              <span className='font-mono text-xs font-bold px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary'>
                {equationNumber}
              </span>
            )}
            {badge && (
              <Badge variant={badgeVariant} className='text-[10px]'>
                {badge}
              </Badge>
            )}
            {latex && (
              <button
                type='button'
                onClick={handleCopy}
                className='flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border border-border/80 bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                title='Copy LaTeX formula'
              >
                {copied ? (
                  <>
                    <Check className='h-3 w-3 text-emerald-500' />
                    <span className='text-emerald-500 font-semibold'>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className='h-3 w-3' />
                    <span>LaTeX</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className='p-5 space-y-4'>
        {/* Math Display Viewport */}
        <div className='p-5 sm:p-8 rounded-xl bg-background/80 dark:bg-black/50 border border-primary/10 shadow-inner flex flex-col items-center justify-center overflow-x-auto'>
          <div className='py-2 text-foreground font-math text-lg sm:text-xl tracking-wide text-center leading-loose select-all'>
            {children}
          </div>
        </div>

        {/* Narrative Description */}
        {description && (
          <div className='text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1'>
            {description}
          </div>
        )}

        {/* Axiomatic Properties */}
        {properties && properties.length > 0 && (
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1'>
            {properties.map((prop, idx) => (
              <div
                key={idx}
                className='p-2.5 rounded-lg border border-border/60 bg-muted/15 flex items-start justify-between gap-2'
              >
                <div>
                  <span className='text-[11px] font-semibold text-foreground block'>
                    {prop.name}
                  </span>
                  <span className='text-[10px] text-muted-foreground leading-tight'>
                    {prop.detail}
                  </span>
                </div>
                <Badge variant='success' className='text-[9px] shrink-0 font-mono'>
                  {prop.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Mathematical Variables Glossary */}
        {variables && variables.length > 0 && (
          <div className='pt-2 border-t border-border/50'>
            <span className='text-[11px] font-bold text-foreground uppercase tracking-wider block mb-2 font-mono'>
              Mathematical Definitions & Notation:
            </span>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
              {variables.map((v, idx) => (
                <div
                  key={idx}
                  className='p-2 rounded-lg border border-border/50 bg-card/60 text-xs space-y-0.5'
                >
                  <div className='flex items-center justify-between'>
                    <span className='font-math italic font-semibold text-primary text-sm'>
                      {v.symbol}
                    </span>
                    {v.unit && (
                      <span className='font-mono text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded'>
                        {v.unit}
                      </span>
                    )}
                  </div>
                  <div className='font-semibold text-foreground text-[11px]'>{v.name}</div>
                  <div className='text-muted-foreground text-[10px] leading-tight'>
                    {v.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Math UI Building Blocks
export function MathVar({
  children,
  sub,
  sup,
  className = '',
}: {
  children: React.ReactNode;
  sub?: React.ReactNode;
  sup?: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-baseline font-math italic font-normal ${className}`}>
      <span>{children}</span>
      {sub && <sub className='text-[0.65em] font-sans not-italic ml-0.5'>{sub}</sub>}
      {sup && <sup className='text-[0.65em] font-sans not-italic ml-0.5'>{sup}</sup>}
    </span>
  );
}

export function MathFraction({
  num,
  den,
}: {
  num: React.ReactNode;
  den: React.ReactNode;
}) {
  return (
    <span className='inline-flex flex-col items-center justify-center align-middle mx-1.5'>
      <span className='px-1.5 pb-0.5 text-center w-full border-b border-foreground/60 text-[0.92em]'>
        {num}
      </span>
      <span className='px-1.5 pt-0.5 text-center w-full text-[0.92em] text-muted-foreground'>
        {den}
      </span>
    </span>
  );
}

export function MathSqrt({ children }: { children: React.ReactNode }) {
  return (
    <span className='inline-flex items-center align-middle mx-1'>
      <span className='text-xl sm:text-2xl font-serif mr-0.5'>√</span>
      <span className='border-t border-foreground/80 pt-0.5 px-1 inline-block'>
        {children}
      </span>
    </span>
  );
}

export function MathSum({
  sub,
  sup,
  children,
}: {
  sub?: React.ReactNode;
  sup?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <span className='inline-flex items-center align-middle mx-1'>
      <span className='inline-flex flex-col items-center justify-center text-xs'>
        {sup && <span className='text-[0.65em] font-sans not-italic leading-none'>{sup}</span>}
        <span className='text-xl sm:text-2xl leading-none font-serif not-italic my-0.5'>∑</span>
        {sub && <span className='text-[0.65em] font-sans not-italic leading-none'>{sub}</span>}
      </span>
      {children && <span className='ml-1'>{children}</span>}
    </span>
  );
}
