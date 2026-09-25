'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MathFormulaCard,
  MathFraction,
  MathSqrt,
  MathSum,
  MathVar,
} from '@/components/ui/math-formula';
import {
  ShieldCheck, Database, Server, Scale, Clock,
  AlertTriangle, Filter, Workflow, Sparkles, Plane,
  FileSpreadsheet, Cpu, BookOpen, Calendar, Activity,
  Compass, TrendingUp,
} from 'lucide-react';

/* ── Table of Contents ──────────────────────────────────────────────────── */
const TOC: { id: string; n: string; title: string }[] = [
  { id: 'problem',        n: '1',  title: 'The Problem'             },
  { id: 'collection',     n: '2',  title: 'Data Collection'         },
  { id: 'sources',        n: '3',  title: 'Airline Sources'         },
  { id: 'horizons',       n: '4',  title: 'Booking Horizons'        },
  { id: 'normalization',  n: '5',  title: 'Normalization'           },
  { id: 'fare-components',n: '6',  title: 'Statutory Decomposition' },
  { id: 'outliers',       n: '7',  title: 'Outlier ML'              },
  { id: 'weighting',      n: '8',  title: 'DGCA Weighting'          },
  { id: 'fisher-ideal',   n: '9',  title: 'Fisher Ideal (APIx)'     },
  { id: 'state-index',    n: '10', title: 'State-Wise Index'        },
  { id: 'all-india',      n: '11', title: 'All-India Benchmark'     },
  { id: 'freshness',      n: '12', title: 'Data Freshness'          },
  { id: 'ethical-scraping',n:'13', title: 'Ethical Scraping'        },
  { id: 'api-architecture',n:'14', title: 'API & Security'          },
  { id: 'limitations',   n: '15', title: 'Limitations'             },
  { id: 'future',        n: '16', title: 'Roadmap'                 },
];

/* ── Reusable Section Heading ─────────────────────────────────────────── */
function SectionHeading({
  id, n, icon, title, sub,
}: { id: string; n: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div id={id} className='flex items-start gap-3 scroll-mt-24'>
      <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary mt-0.5'>
        {icon}
      </div>
      <div>
        <div className='flex items-center gap-2'>
          <span className='font-mono text-[11px] font-bold text-primary/70'>{n}.</span>
          <h2 className='text-lg sm:text-xl font-bold text-foreground tracking-tight leading-snug'>
            {title}
          </h2>
        </div>
        <p className='text-[11px] text-muted-foreground mt-0.5 leading-relaxed'>{sub}</p>
      </div>
    </div>
  );
}

/* ── Prose card wrapper ─────────────────────────────────────────────── */
function Prose({ children }: { children: React.ReactNode }) {
  return (
    <Card className='border-border/60 bg-card/80 shadow-sm'>
      <CardContent className='p-5 sm:p-6 text-[13px] leading-relaxed text-muted-foreground space-y-3'>
        {children}
      </CardContent>
    </Card>
  );
}

/* ── Horizon pill ─────────────────────────────────────────────────── */
function HPill({ h, color }: { h: string; color: string }) {
  return (
    <div className={`p-3 rounded-xl border ${color} text-center`}>
      <span className='font-mono font-bold text-sm block'>{h}</span>
      <span className='text-[10px] text-muted-foreground'>
        { h === 'T' ? 'Same Day' : h === 'T+1' ? '24 h' : h === 'T+7' ? '1 week' : h === 'T+15' ? '2 weeks' : h === 'T+30' ? '1 month' : '45 days' }
      </span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
export default function MethodologyPage() {
  return (
    <div className='max-w-4xl mx-auto space-y-14 animate-in fade-in-50 duration-300 pb-20'>

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className='space-y-4 pb-8 border-b border-border/60'>
        <div className='flex flex-wrap gap-2'>
          <Badge variant='success'  className='gap-1 text-xs'><Sparkles className='h-3 w-3'/>SIH26056 Technical Specification</Badge>
          <Badge variant='outline'  className='text-xs'>Ministry of Civil Aviation / DGCA</Badge>
          <Badge variant='secondary' className='text-xs font-mono'>v1.0.0 Production</Badge>
        </div>
        <h1 className='text-4xl sm:text-5xl font-black tracking-tight text-foreground leading-tight'>
          SkyRate<br className='sm:hidden'/>{' '}
          <span className='text-primary'>Technical Methodology</span>
        </h1>
        <p className='text-sm text-muted-foreground leading-relaxed max-w-2xl'>
          Empirical airfare observation pipeline, Fisher-Ideal APIx formulation, statutory UDF disaggregation,
          state-wise MoSPI CPI benchmarking, and production security architecture for Indian domestic aviation.
        </p>
      </div>

      {/* ── TABLE OF CONTENTS ─────────────────────────────────────────── */}
      <Card className='border-border/60 bg-card/60 shadow-sm'>
        <CardHeader className='pb-3'>
          <div className='flex items-center gap-2'>
            <BookOpen className='h-4 w-4 text-primary' />
            <CardTitle className='text-sm font-semibold uppercase tracking-widest text-muted-foreground'>
              Methodology Index — 16 Dimensions
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className='pt-0'>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-1.5'>
            {TOC.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className='flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-muted/20 hover:bg-primary/8 hover:border-primary/30 text-[11px] transition-all duration-150 group'
              >
                <span className='font-mono font-bold text-primary text-[10px] shrink-0 group-hover:text-primary'>
                  {item.n}.
                </span>
                <span className='text-muted-foreground group-hover:text-foreground truncate font-medium'>
                  {item.title}
                </span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 1. THE PROBLEM ─────────────────────────────────────────────── */}
      <section className='space-y-4'>
        <SectionHeading id='problem' n='1' icon={<AlertTriangle className='h-4 w-4'/>}
          title='The Problem: Dynamic Pricing Opacity & Surveillance Latency'
          sub='Aviation dynamic pricing volatility versus government CPI reporting delays' />
        <Prose>
          <p>
            Airlines use automated Revenue Management Systems (RMS) that reprice tickets multiple times daily.
            On trunk corridors fares can spike <strong className='text-foreground'>200 – 400%</strong> within hours
            during peak demand. Meanwhile the <strong className='text-foreground'>MoSPI Consumer Price Index</strong>{' '}
            publishes transport tariff data with a <strong className='text-foreground'>45-day retrospective lag</strong>,
            leaving regulators blind to intraday surges.
          </p>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs'>
            <div className='p-3 rounded-xl border border-rose-500/25 bg-rose-500/5 space-y-1'>
              <span className='font-bold text-rose-400 text-[10px] uppercase tracking-wide block'>MoSPI CPI Lag</span>
              <p className='text-foreground font-semibold'>45-Day Survey Delay</p>
              <p className='text-muted-foreground text-[10px]'>Misses intra-month volatility entirely.</p>
            </div>
            <div className='p-3 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-1'>
              <span className='font-bold text-amber-400 text-[10px] uppercase tracking-wide block'>Intraday Surge</span>
              <p className='text-foreground font-semibold'>200% – 400% Spikes</p>
              <p className='text-muted-foreground text-[10px]'>Yield algorithms exploit urgency in 0–72 h windows.</p>
            </div>
            <div className='p-3 rounded-xl border border-primary/25 bg-primary/5 space-y-1'>
              <span className='font-bold text-primary text-[10px] uppercase tracking-wide block'>SkyRate Solution</span>
              <p className='text-foreground font-semibold'>Real-Time APIx Index</p>
              <p className='text-muted-foreground text-[10px]'>Daily observation snapshots with state-wise econometrics.</p>
            </div>
          </div>
        </Prose>
      </section>

      {/* ── 2. DATA COLLECTION ──────────────────────────────────────────── */}
      <section className='space-y-4'>
        <SectionHeading id='collection' n='2' icon={<Database className='h-4 w-4'/>}
          title='Data Collection Architecture'
          sub='Headless Playwright + stealth HTTP across scheduled observation runs' />
        <Prose>
          <p>
            Each observation job targets high-density domestic corridors across predefined lead-time windows.
            Collected records are stored in structured daily PostgreSQL tables inside Supabase:
          </p>
          <div className='rounded-xl bg-black/40 border border-border/60 p-4 text-xs font-mono space-y-2 overflow-x-auto'>
            <div className='text-muted-foreground'>-- Observed fare records</div>
            <div><span className='text-emerald-400'>flight_fares</span>_DD_MM_YYYY
              <span className='text-muted-foreground ml-2'>(ID, route, carrier, flight_number, is_non_stop,</span></div>
            <div className='ml-24 text-muted-foreground'>t_window, base_fare, taxes, udf_fee, gross_fare, status, source)</div>
            <div className='pt-2 text-muted-foreground'>-- Computed state-wise APIx indices</div>
            <div><span className='text-sky-400'>index_for</span>_DD_MM_YYYY
              <span className='text-muted-foreground ml-2'>(&quot;State&quot;, &quot;Time_Horizon&quot;, &quot;MoSPI_Base&quot;,</span></div>
            <div className='ml-24 text-muted-foreground'>&quot;Basket_Inflation&quot;, &quot;RealTime_APIx&quot;)</div>
          </div>
        </Prose>
      </section>

      {/* ── 3. SOURCES ──────────────────────────────────────────────────── */}
      <section className='space-y-4'>
        <SectionHeading id='sources' n='3' icon={<Plane className='h-4 w-4'/>}
          title='Airline & OTA Data Sources'
          sub='Cross-carrier observation across scheduled Indian domestic operators' />
        <Prose>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs'>
            {[
              { name: 'IndiGo',    sub: 'LCC — ~63% seat share' },
              { name: 'Air India', sub: 'Full-Service Network'  },
              { name: 'SpiceJet',  sub: 'Budget — Tier-1 & 2'  },
              { name: 'Akasa Air', sub: 'ULCC — Metro routes'  },
            ].map(c => (
              <div key={c.name} className='p-3 rounded-xl border border-border/60 bg-card space-y-0.5'>
                <span className='font-bold text-foreground text-sm block'>{c.name}</span>
                <span className='text-muted-foreground text-[10px]'>{c.sub}</span>
              </div>
            ))}
          </div>
        </Prose>
      </section>

      {/* ── 4. BOOKING HORIZONS ─────────────────────────────────────────── */}
      <section className='space-y-4'>
        <SectionHeading id='horizons' n='4' icon={<Clock className='h-4 w-4'/>}
          title='Lead-Time Booking Horizons'
          sub='Six canonical advance-purchase windows across monitored itineraries' />
        <Prose>
          <p>
            Because dynamic pricing escalates as seats thin near departure, SkyRate captures
            fares at six standardised advance windows:
          </p>
          <div className='grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-1'>
            <HPill h='T'    color='border-rose-500/30 bg-rose-500/6 text-rose-400'   />
            <HPill h='T+1'  color='border-amber-500/30 bg-amber-500/6 text-amber-400'/>
            <HPill h='T+7'  color='border-yellow-500/30 bg-yellow-500/6 text-yellow-400'/>
            <HPill h='T+15' color='border-sky-500/30 bg-sky-500/6 text-sky-400'      />
            <HPill h='T+30' color='border-blue-500/30 bg-blue-500/6 text-blue-400'   />
            <HPill h='T+45' color='border-emerald-500/30 bg-emerald-500/6 text-emerald-400'/>
          </div>
        </Prose>
      </section>

      {/* ── 5. NORMALIZATION ────────────────────────────────────────────── */}
      <section className='space-y-4'>
        <SectionHeading id='normalization' n='5' icon={<Filter className='h-4 w-4'/>}
          title='Data Normalization & Cleansing'
          sub='Standardisation protocols applied before indexation' />
        <Prose>
          <ul className='space-y-2 list-disc pl-5 text-xs'>
            {[
              ['Carrier Canonical Mapping', 'AkasaAir, QP, "Akasa Air" all resolve to canonical Akasa Air.'],
              ['Currency Harmonization', 'All fares strictly validated in ₹ INR.'],
              ['Non-Stop Economy Only', 'Multi-leg itineraries excluded; only economy class non-stop seats indexed.'],
              ['Origin-State Mapping', 'DEL → Delhi, BOM → Maharashtra, BLR → Karnataka, CCU → West Bengal, etc.'],
            ].map(([title, body]) => (
              <li key={title as string}>
                <strong className='text-foreground'>{title}</strong>
                {' — '}{body}
              </li>
            ))}
          </ul>
        </Prose>
      </section>

      {/* ── 6. FARE COMPONENTS ──────────────────────────────────────────── */}
      <section className='space-y-4'>
        <SectionHeading id='fare-components' n='6' icon={<FileSpreadsheet className='h-4 w-4'/>}
          title='Statutory Fare Decomposition'
          sub='DGCA AIC 06/2010 — Base Fare, Taxes & User Development Fee (UDF)' />

        <MathFormulaCard
          id='eq-1'
          equationNumber='Eq. 1'
          title='Airfare Statutory Identity'
          badge='DGCA AIC 06/2010'
          latex='Gross\_Fare = Base\_Fare + Taxes + UDF\_Fee'
          variables={[
            { symbol: 'Base Fare',  name: 'Airline Yield Tariff', unit: '₹', description: 'Dynamic revenue pricing controlled by the carrier RMS.' },
            { symbol: 'Taxes',      name: 'Government Levies',    unit: '₹', description: 'PSF + Fuel Surcharge (YQ) + GST (5% economy).' },
            { symbol: 'UDF Fee',    name: 'User Development Fee', unit: '₹', description: 'AERA-approved airport infrastructure levy.' },
            { symbol: 'Gross Fare', name: 'Total Ticket Price',   unit: '₹', description: 'Final fare payable by the passenger.' },
          ]}
          description={
            <span>
              Disaggregating the <strong className='text-foreground'>UDF Fee</strong> from the{' '}
              <strong className='text-foreground'>Base Fare</strong> lets regulators pinpoint whether
              price changes stem from airline yield decisions or regulated airport tariff hikes.
            </span>
          }
        >
          <div className='flex items-center justify-center gap-3 flex-wrap text-xl sm:text-2xl leading-loose'>
            <span className='font-math italic font-semibold text-foreground'>Gross Fare</span>
            <span className='text-muted-foreground font-sans'>=</span>
            <span className='font-math italic text-emerald-400 font-semibold'>Base Fare</span>
            <span className='text-muted-foreground'>+</span>
            <span className='font-math italic text-sky-400 font-semibold'>Taxes</span>
            <span className='text-muted-foreground'>+</span>
            <span className='font-math italic text-primary font-bold'>UDF Fee</span>
          </div>
        </MathFormulaCard>
      </section>

      {/* ── 7. OUTLIER ISOLATION ─────────────────────────────────────────── */}
      <section className='space-y-4'>
        <SectionHeading id='outliers' n='7' icon={<Cpu className='h-4 w-4'/>}
          title='Outlier Isolation: ML Isolation Forest'
          sub='Unsupervised anomaly detection (contamination = 0.03) without suppressing genuine surges' />

        <MathFormulaCard
          id='eq-2'
          equationNumber='Eq. 2'
          title='Isolation Forest Anomaly Score'
          badge='Unsupervised ML'
          latex='s(x,n) = 2^{-E(h(x))/c(n)}'
          variables={[
            { symbol: 's(x, n)', name: 'Anomaly Score', unit: '[0,1]', description: 'Score → 1 flags corrupted records; < 0.5 indicates normal fares.' },
            { symbol: 'h(x)',    name: 'Path Length',   unit: 'int',   description: 'Splits required to isolate point x in the isolation tree.' },
            { symbol: 'E(h(x))', name: 'Expected Path Length', unit: 'float', description: 'Average over n_estimators=100 trees.' },
            { symbol: 'c(n)',    name: 'BST Normaliser', unit: 'float', description: 'Average path length in a binary search tree of n nodes.' },
          ]}
          description='Genuine high-demand surges form dense clusters with long path lengths; CAPTCHA artifacts and zero-fare entries isolate rapidly with shallow paths.'
        >
          <div className='flex items-center justify-center gap-2 text-xl sm:text-2xl leading-loose'>
            <span className='font-math italic text-foreground'>s(x, n)</span>
            <span className='text-muted-foreground'>=</span>
            <span className='font-math text-foreground'>2</span>
            <sup className='font-math text-rose-400 text-sm sm:text-base -mt-3'>
              <span className='inline-flex flex-col items-center'>
                <span className='border-b border-foreground/50 px-1 text-[0.75em]'>−E(h(x))</span>
                <span className='px-1 text-[0.75em] text-muted-foreground'>c(n)</span>
              </span>
            </sup>
          </div>
        </MathFormulaCard>
      </section>

      {/* ── 8. DGCA WEIGHTING ───────────────────────────────────────────── */}
      <section className='space-y-4'>
        <SectionHeading id='weighting' n='8' icon={<Workflow className='h-4 w-4'/>}
          title='DGCA Passenger Traffic Volume Weighting'
          sub='Proportional corridor weights from official DGCA domestic pax statistics' />

        <MathFormulaCard
          id='eq-3'
          equationNumber='Eq. 3'
          title='Sector Passenger Weight Vector'
          badge='DGCA Traffic Calibration'
          latex='W_r = DGCA_Pax_r / sum(DGCA_Pax_k)'
          variables={[
            { symbol: 'W_r',         name: 'Corridor Weight',     unit: '[0,1]', description: 'Proportional traffic share for route r.' },
            { symbol: 'DGCA_Pax_r',  name: 'Monthly Seat Volume', unit: 'pax',   description: 'Official monthly domestic traffic for corridor r.' },
          ]}
          description='Without traffic weighting a simple arithmetic mean biases the index toward low-volume regional routes. Trunk routes (DEL-BOM, BOM-BLR) receive proportional influence.'
        >
          <div className='flex items-center justify-center gap-3 text-xl sm:text-2xl leading-loose'>
            <MathVar sub='r'>W</MathVar>
            <span className='text-muted-foreground'>=</span>
            <MathFraction
              num={<span className='font-math italic text-emerald-400'>DGCA Pax<sub className='text-xs font-sans not-italic'>r</sub></span>}
              den={<span className='font-math'><MathSum sub='k ∈ R'><span className='italic text-muted-foreground'>DGCA Pax<sub className='text-xs font-sans not-italic'>k</sub></span></MathSum></span>}
            />
          </div>
        </MathFormulaCard>
      </section>

      {/* ── 9. FISHER IDEAL INDEX ───────────────────────────────────────── */}
      <section className='space-y-6'>
        <SectionHeading id='fisher-ideal' n='9' icon={<Scale className='h-4 w-4'/>}
          title='Fisher-Ideal Superlative Index (APIx)'
          sub='Geometric mean of Laspeyres and Paasche — eliminates substitution bias' />

        <MathFormulaCard id='eq-4a' equationNumber='Eq. 4a' title='Laspeyres Price Index — Base-Period Weighted'
          badge='Upper Bound' latex='L_t = sum(P_it*Q_i0) / sum(P_i0*Q_i0)'
          variables={[
            { symbol: 'P_it', name: 'Current Fare', unit: '₹', description: 'Observed fare for itinerary i at time t.' },
            { symbol: 'P_i0', name: 'Base Fare',    unit: '₹', description: 'Calibrated MoSPI-benchmarked base fare.'  },
            { symbol: 'Q_i0', name: 'Base Volume',  unit: 'seats', description: 'Fixed base-period seat volume.'       },
          ]}
          description='Overstates inflation — ignores consumer substitution toward cheaper carriers.'
        >
          <div className='flex items-center justify-center gap-3 text-xl sm:text-2xl'>
            <MathVar sub='t'>L</MathVar>
            <span className='text-muted-foreground'>=</span>
            <MathFraction
              num={<span><MathSum sub='i'><MathVar sub='it'>P</MathVar><span className='mx-0.5'>·</span><MathVar sub='i0'>Q</MathVar></MathSum></span>}
              den={<span><MathSum sub='i'><MathVar sub='i0'>P</MathVar><span className='mx-0.5'>·</span><MathVar sub='i0'>Q</MathVar></MathSum></span>}
            />
          </div>
        </MathFormulaCard>

        <MathFormulaCard id='eq-4b' equationNumber='Eq. 4b' title='Paasche Price Index — Current-Period Weighted'
          badge='Lower Bound' latex='P_t = sum(P_it*Q_it) / sum(P_i0*Q_it)'
          variables={[
            { symbol: 'Q_it', name: 'Current Volume', unit: 'seats', description: 'Empirical seat volume at time t.' },
          ]}
          description='Understates inflation — over-weights flights passengers substitute toward during surges.'
        >
          <div className='flex items-center justify-center gap-3 text-xl sm:text-2xl'>
            <MathVar sub='t'>P</MathVar>
            <span className='text-muted-foreground'>=</span>
            <MathFraction
              num={<span><MathSum sub='i'><MathVar sub='it'>P</MathVar><span className='mx-0.5'>·</span><MathVar sub='it'>Q</MathVar></MathSum></span>}
              den={<span><MathSum sub='i'><MathVar sub='i0'>P</MathVar><span className='mx-0.5'>·</span><MathVar sub='it'>Q</MathVar></MathSum></span>}
            />
          </div>
        </MathFormulaCard>

        <MathFormulaCard
          id='eq-4c'
          equationNumber='Eq. 4c'
          title='Fisher-Ideal APIx — Superlative Geometric Mean'
          badge='Core Formula'
          badgeVariant='success'
          latex='APIx_t = 100 * sqrt(L_t * P_t)'
          properties={[
            { name: 'Time-Reversal', status: '✓ PROVEN', detail: 'F₀ₜ × Fₜ₀ = 1.0' },
            { name: 'Factor-Reversal', status: '✓ PROVEN', detail: 'Price × Quantity = Expenditure Ratio' },
          ]}
          description='The Fisher Ideal Index is classified as superlative (Diewert 1976) — it completely eliminates consumer substitution bias by averaging both extremes.'
        >
          <div className='flex items-center justify-center gap-3 flex-wrap text-2xl sm:text-3xl leading-loose'>
            <span className='font-math italic font-bold text-primary'>
              APIx<sub className='text-sm font-sans not-italic'>t</sub>
            </span>
            <span className='text-muted-foreground text-2xl'>=</span>
            <span className='font-math text-foreground font-semibold'>100</span>
            <span className='text-muted-foreground'>×</span>
            <MathSqrt>
              <span className='font-math italic text-emerald-400 font-bold'>L<sub className='text-sm font-sans not-italic'>t</sub></span>
              <span className='mx-1.5 text-muted-foreground'>·</span>
              <span className='font-math italic text-sky-400 font-bold'>P<sub className='text-sm font-sans not-italic'>t</sub></span>
            </MathSqrt>
          </div>
        </MathFormulaCard>
      </section>

      {/* ── 10. STATE-WISE INDEX ─────────────────────────────────────────── */}
      <section className='space-y-4'>
        <SectionHeading id='state-index' n='10' icon={<Compass className='h-4 w-4'/>}
          title='State-Wise Airfare Price Index & Basket Inflation'
          sub='Regional divergence between empirical APIx and state MoSPI CPI baselines' />

        <MathFormulaCard
          id='eq-5'
          equationNumber='Eq. 5'
          title='Basket Inflation Rate — State Level'
          badge='State-Wise Econometrics'
          latex='Basket_Inflation = (RealTime_APIx - MoSPI_Base) / MoSPI_Base * 100%'
          variables={[
            { symbol: 'RealTime_APIx', name: 'Empirical State Index', unit: 'pts', description: 'Fisher-Ideal index computed for state s at horizon h.' },
            { symbol: 'MoSPI_Base',    name: 'State CPI Reference',   unit: 'pts', description: 'Official state-level MoSPI Consumer Price Index baseline.' },
            { symbol: 'Basket_Inflation', name: 'Inflation Divergence', unit: '%', description: 'Net percentage deviation above the official transport baseline.' },
          ]}
          description='Calculated as "Basket_Inflation" in the state index dataset. Positive values indicate airfare inflation above official CPI benchmarks; negative values indicate deflation.'
        >
          <div className='flex items-center justify-center gap-3 flex-wrap text-xl sm:text-2xl leading-loose'>
            <span className='font-math italic text-foreground font-semibold'>Basket Inflation</span>
            <span className='text-muted-foreground'>=</span>
            <MathFraction
              num={<span className='font-math'><span className='italic text-primary'>APIx</span><span className='text-muted-foreground mx-1'>−</span><span className='italic text-muted-foreground'>MoSPI Base</span></span>}
              den={<span className='font-math italic text-muted-foreground'>MoSPI Base</span>}
            />
            <span className='text-muted-foreground'>× 100%</span>
          </div>
        </MathFormulaCard>
      </section>

      {/* ── 11 – 16: Prose sections ──────────────────────────────────────── */}
      {[
        {
          id: 'all-india', n: '11', icon: <Activity className='h-4 w-4'/>,
          title: 'All-India Macro Composite Benchmark',
          sub: 'National airfare index anchored to MoSPI CPI baseline = 100.00',
          body: 'The All-India APIx aggregates all monitored trunk and secondary sectors weighted by DGCA passenger volumes. It provides government ministries, DGCA, and media with a real-time headline metric for domestic air travel inflation.',
        },
        {
          id: 'freshness', n: '12', icon: <Calendar className='h-4 w-4'/>,
          title: 'Data Freshness & Update Lifecycle',
          sub: 'Immutable daily observation snapshots, vintage metadata, and in-memory TTL caching',
          body: (
            <ul className='space-y-1.5 list-disc pl-5 text-xs'>
              <li><strong className='text-foreground'>Automated Date Discovery</strong> — backend probes data store for active observation tables, looking back up to 7 days.</li>
              <li><strong className='text-foreground'>Calculation Vintage</strong> — every API response includes observation date and calculation timestamp for full auditability.</li>
              <li><strong className='text-foreground'>TTL Cache</strong> — FastAPI in-memory caches (300 s overview, 600 s topology) protect Supabase connection limits.</li>
            </ul>
          ),
        },
        {
          id: 'ethical-scraping', n: '13', icon: <ShieldCheck className='h-4 w-4'/>,
          title: 'Ethical Scraping & Server Responsibility',
          sub: 'Responsible data stewardship respecting airline infrastructure',
          body: (
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs'>
              {[
                ['Exponential Backoff', 'Randomised delays preventing load spikes on airline search clusters.'],
                ['Off-Peak Batching',   'Jobs run during low-traffic windows to avoid consumer booking impact.'],
                ['Zero Seat Holds',     'Read-only price quotation; no reservation sessions ever created.'],
              ].map(([t, d]) => (
                <div key={t as string} className='p-3 rounded-xl border border-border/60 bg-card space-y-1'>
                  <span className='font-bold text-foreground text-xs block'>{t}</span>
                  <span className='text-muted-foreground text-[10px]'>{d}</span>
                </div>
              ))}
            </div>
          ),
        },
        {
          id: 'api-architecture', n: '14', icon: <Server className='h-4 w-4'/>,
          title: 'Decoupled 3-Tier Architecture & Security',
          sub: 'Strict boundary separation with Pydantic validation and service-role DB access',
          body: (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono'>
              {[
                ['Tier 1 — Next.js', 'Server-side rendered dashboard. Communicates strictly via FastAPI.'],
                ['Tier 2 — FastAPI', 'Pydantic validation, input sanitisation, rate limiting, TTL caching.'],
                ['Tier 3 — Supabase', 'PostgreSQL database queried via service-role key; RLS enforced.'],
              ].map(([t, d]) => (
                <div key={t as string} className='p-3 rounded-xl border border-primary/20 bg-card space-y-1'>
                  <span className='font-bold text-primary text-xs block'>{t}</span>
                  <span className='text-muted-foreground text-[10px] font-sans'>{d}</span>
                </div>
              ))}
            </div>
          ),
        },
        {
          id: 'limitations', n: '15', icon: <AlertTriangle className='h-4 w-4'/>,
          title: 'System Limitations & Assumptions',
          sub: 'Known methodological constraints',
          body: (
            <ul className='space-y-1.5 list-disc pl-5 text-xs'>
              <li><strong className='text-foreground'>Ancillary Fees Excluded</strong> — seat selection, baggage, meals excluded per DGCA unbundled pricing rules.</li>
              <li><strong className='text-foreground'>Economy Class Only</strong> — business class excluded to prevent luxury premiums from skewing CPI metrics.</li>
              <li><strong className='text-foreground'>Snapshot Ingestion</strong> — flash sales under 30 min between collection windows may lag by one collection cycle.</li>
            </ul>
          ),
        },
        {
          id: 'future', n: '16', icon: <TrendingUp className='h-4 w-4'/>,
          title: 'Future Technical Roadmap',
          sub: 'Planned evolutions for the SkyRate platform',
          body: (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs'>
              {[
                ['DGCA Regulatory Alerts', 'Automated webhook to DGCA when state APIx exceeds +25% above baseline.'],
                ['UDAN Sector Expansion',  'RCS-UDAN subsidised routes with price-cap compliance monitoring.'],
              ].map(([t, d]) => (
                <div key={t as string} className='p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1'>
                  <span className='font-bold text-foreground text-xs block'>{t}</span>
                  <span className='text-muted-foreground text-[10px]'>{d}</span>
                </div>
              ))}
            </div>
          ),
        },
      ].map(s => (
        <section key={s.id} className='space-y-4'>
          <SectionHeading id={s.id} n={s.n} icon={s.icon} title={s.title} sub={s.sub} />
          <Prose>{typeof s.body === 'string' ? <p>{s.body}</p> : s.body}</Prose>
        </section>
      ))}

    </div>
  );
}
