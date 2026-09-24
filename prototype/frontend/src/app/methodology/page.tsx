import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Database,
  Server,
  Scale,
  Clock,
  AlertTriangle,
  Filter,
  ArrowRight,
  Workflow,
  Sparkles,
  Plane,
  FileSpreadsheet,
  Cpu,
  Lock,
  BookOpen,
  Calendar,
  Activity,
  Compass,
} from 'lucide-react';

export const metadata = {
  title: 'Technical Methodology & Architecture | SkyRate (SIH26056)',
  description:
    'Comprehensive technical methodology, mathematical Fisher-Ideal formulation, data pipeline architecture, and implementation status for SkyRate SIH26056.',
};

const TOC_ITEMS = [
  { id: 'problem', number: '1', title: 'The Problem' },
  { id: 'collection', number: '2', title: 'Data Collection' },
  { id: 'sources', number: '3', title: 'Airline/OTA Sources' },
  { id: 'horizons', number: '4', title: 'Booking Horizons' },
  { id: 'normalization', number: '5', title: 'Data Normalization' },
  { id: 'fare-components', number: '6', title: 'Fare Components' },
  { id: 'outliers', number: '7', title: 'Outlier Handling' },
  { id: 'weighting', number: '8', title: 'DGCA Traffic Weighting' },
  { id: 'fisher-ideal', number: '9', title: 'Fisher Ideal Index' },
  { id: 'state-index', number: '10', title: 'State-wise Index' },
  { id: 'all-india', number: '11', title: 'All-India Index' },
  { id: 'freshness', number: '12', title: 'Data Freshness' },
  { id: 'ethical-scraping', number: '13', title: 'Ethical Scraping' },
  { id: 'api-architecture', number: '14', title: 'API Architecture' },
  { id: 'limitations', number: '15', title: 'System Limitations' },
  { id: 'future', number: '16', title: 'Future Roadmap' },
];

export default function MethodologyPage() {
  return (
    <div className='max-w-5xl mx-auto space-y-12 animate-in fade-in-50 duration-300 pb-16'>
      {/* Header & Badges */}
      <div className='space-y-4 border-b border-border/80 pb-8'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='success' className='gap-1 text-xs'>
            <Sparkles className='h-3 w-3' /> SIH26056 Technical Specification
          </Badge>
          <Badge variant='outline' className='text-xs'>
            Ministry of Civil Aviation / DGCA Scope
          </Badge>
          <Badge variant='secondary' className='text-xs font-mono'>
            v1.0.0 Production Architecture
          </Badge>
          <Badge variant='outline' className='text-xs text-muted-foreground'>
            Empirical Price Surveillance
          </Badge>
        </div>
        <h1 className='text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground'>
          SkyRate Technical Methodology & Architecture
        </h1>
        <p className='text-sm sm:text-base text-muted-foreground leading-relaxed max-w-4xl'>
          Comprehensive documentation of the empirical airfare observation pipeline, lead-time horizon indexing, User Development Fee (UDF) disaggregation, Fisher-Ideal APIx indexation, multi-tier security boundaries, and regulatory compliance standards for Indian domestic commercial aviation.
        </p>
      </div>

      {/* QUICK JUMP TABLE OF CONTENTS */}
      <Card className='border-border/70 bg-card/60 shadow-sm'>
        <CardHeader className='pb-3'>
          <div className='flex items-center gap-2'>
            <BookOpen className='h-4 w-4 text-primary' />
            <CardTitle className='text-sm font-semibold text-foreground uppercase tracking-wider'>
              Methodology Navigation (16 Core Dimensions)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
            {TOC_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className='flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 text-xs transition-colors'
              >
                <span className='font-mono font-bold text-primary text-[11px]'>{item.number}.</span>
                <span className='text-muted-foreground hover:text-foreground truncate font-medium'>{item.title}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 1. THE PROBLEM */}
      <section id='problem' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <AlertTriangle className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              1. The Problem: Dynamic Pricing Opacity & Surveillance Latency
            </h2>
            <p className='text-xs text-muted-foreground'>Aviation dynamic pricing volatility versus government CPI reporting delays</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              In Indian commercial aviation, airlines employ automated revenue management systems (RMS) that adjust ticket prices multiple times daily based on remaining seat inventory, competitor pricing, booking velocity, and advance purchase horizons. During peak festive seasons, regional disruptions, or sudden demand spikes, fares on trunk corridors (e.g., Delhi–Mumbai, Mumbai–Bengaluru) frequently escalate by <strong className='text-foreground'>200% to 400%</strong> within hours.
            </p>
            <p>
              Conventional government statistical metrics, such as the <strong className='text-foreground'>Ministry of Statistics and Programme Implementation (MoSPI) Consumer Price Index (CPI)</strong>, collect transport tariff samples through manual retrospective surveys and publish them with a <strong className='text-foreground'>45-day reporting lag</strong>. Consequently, regulators (DGCA, MoCA) lack real-time visibility into empirical fare surges, while consumers suffer severe welfare loss from information asymmetry.
            </p>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs'>
              <div className='p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-1'>
                <span className='font-bold text-rose-500 text-[11px] block uppercase'>MoSPI CPI Lag</span>
                <p className='text-foreground font-semibold'>45-Day Survey Delay</p>
                <p className='text-[11px] text-muted-foreground'>Retrospective monthly publication misses intra-month volatility.</p>
              </div>
              <div className='p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-1'>
                <span className='font-bold text-amber-500 text-[11px] block uppercase'>Intraday Surge</span>
                <p className='text-foreground font-semibold'>200% – 400% Price Spikes</p>
                <p className='text-[11px] text-muted-foreground'>Yield algorithms exploit urgency in 0–72h departure windows.</p>
              </div>
              <div className='p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1'>
                <span className='font-bold text-primary text-[11px] block uppercase'>SkyRate Solution</span>
                <p className='text-foreground font-semibold'>Real-Time APIx Index</p>
                <p className='text-[11px] text-muted-foreground'>Automated empirical surveillance updated with daily partition snapshots.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. DATA COLLECTION */}
      <section id='collection' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Database className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              2. Data Collection Architecture
            </h2>
            <p className='text-xs text-muted-foreground'>Automated headless harvesting across scheduled observation runs</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              SkyRate operates an automated scraping subsystem that executes recurring headless ingestion cycles across all monitored Indian aviation corridors. The collection pipeline is structured to capture empirical spot price quotations without modifying carrier session state or reserving physical seat inventory.
            </p>
            <p>
              Scraped raw fare records are batched and inserted into immutable, date-partitioned PostgreSQL tables adhering to the naming convention <code className='font-mono text-primary'>scraped_on_DD_MM_YYYY</code>. Partitioning guarantees absolute data isolation, prevents cross-day leakage, and enables rapid historical point-in-time replays for regulatory audits.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 3. AIRLINE/OTA SOURCES */}
      <section id='sources' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Plane className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              3. Airline & OTA Sources
            </h2>
            <p className='text-xs text-muted-foreground'>Comprehensive coverage across scheduled Indian carriers and aggregator channels</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              To maintain representative market coverage of Indian domestic airspace, SkyRate monitors all primary scheduled commercial airlines alongside major Online Travel Agency (OTA) aggregator feeds:
            </p>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 font-mono text-xs'>
              <div className='p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between'>
                <span className='font-bold text-foreground'>IndiGo</span>
                <Badge variant='outline' className='text-[10px] font-sans'>60%+ Market Share</Badge>
              </div>
              <div className='p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between'>
                <span className='font-bold text-foreground'>Air India</span>
                <Badge variant='outline' className='text-[10px] font-sans'>Full Service</Badge>
              </div>
              <div className='p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between'>
                <span className='font-bold text-foreground'>Vistara</span>
                <Badge variant='outline' className='text-[10px] font-sans'>Full Service</Badge>
              </div>
              <div className='p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between'>
                <span className='font-bold text-foreground'>SpiceJet</span>
                <Badge variant='outline' className='text-[10px] font-sans'>Low Cost Carrier</Badge>
              </div>
              <div className='p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between'>
                <span className='font-bold text-foreground'>Akasa Air</span>
                <Badge variant='outline' className='text-[10px] font-sans'>Low Cost Carrier</Badge>
              </div>
              <div className='p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between'>
                <span className='font-bold text-foreground'>AIX Connect</span>
                <Badge variant='outline' className='text-[10px] font-sans'>Regional Trunk</Badge>
              </div>
            </div>
            <p>
              By capturing direct airline quotations alongside OTA aggregations, SkyRate cross-validates prices to eliminate intermediary convenience markups and verify genuine consumer-facing gross fare quotes.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 4. BOOKING HORIZONS */}
      <section id='horizons' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Clock className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              4. Standardized Advance-Purchase Booking Horizons
            </h2>
            <p className='text-xs text-muted-foreground'>Measuring price escalation along the revenue management yield curve</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              A single spot price is statistically meaningless without its temporal advance-purchase lead-time ($T$). An identical seat on DEL-BOM priced at ₹4,200 at 30 days prior can rise to ₹14,500 at 24 hours prior. SkyRate stratifies all empirical observations into 6 standard discrete lead-time horizons:
            </p>
            <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-[11px]'>
              <div className='p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-center space-y-1'>
                <span className='font-bold text-rose-500 text-xs'>T (Same Day)</span>
                <p className='text-muted-foreground text-[10px]'>0 days prior</p>
                <p className='text-[10px] text-foreground font-semibold'>Last-minute distress</p>
              </div>
              <div className='p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-center space-y-1'>
                <span className='font-bold text-amber-500 text-xs'>T+1</span>
                <p className='text-muted-foreground text-[10px]'>1 day prior</p>
                <p className='text-[10px] text-foreground font-semibold'>Urgent / Corporate</p>
              </div>
              <div className='p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-center space-y-1'>
                <span className='font-bold text-amber-500 text-xs'>T+7</span>
                <p className='text-muted-foreground text-[10px]'>7 days prior</p>
                <p className='text-[10px] text-foreground font-semibold'>Weekly window</p>
              </div>
              <div className='p-3 rounded-lg border border-primary/20 bg-primary/5 text-center space-y-1'>
                <span className='font-bold text-primary text-xs'>T+15</span>
                <p className='text-muted-foreground text-[10px]'>15 days prior</p>
                <p className='text-[10px] text-foreground font-semibold'>Standard advance</p>
              </div>
              <div className='p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-center space-y-1'>
                <span className='font-bold text-emerald-500 text-xs'>T+30</span>
                <p className='text-muted-foreground text-[10px]'>30 days prior</p>
                <p className='text-[10px] text-foreground font-semibold'>Early leisure</p>
              </div>
              <div className='p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-center space-y-1'>
                <span className='font-bold text-emerald-500 text-xs'>T+45</span>
                <p className='text-muted-foreground text-[10px]'>45 days prior</p>
                <p className='text-[10px] text-foreground font-semibold'>Base benchmark</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 5. DATA NORMALIZATION */}
      <section id='normalization' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Filter className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              5. Data Normalization & Hygiene
            </h2>
            <p className='text-xs text-muted-foreground'>Harmonizing airline identifiers, currency, and flight parameters</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              Raw quotes from different sources exhibit significant structural heterogeneity. SkyRate executes deterministic normalization pipelines before analytical aggregation:
            </p>
            <ul className='space-y-2 text-xs list-disc pl-5'>
              <li>
                <strong className='text-foreground'>Carrier Name Standardization</strong>: Unified canonical mapping resolving variants (e.g. <code className='font-mono text-primary'>AkasaAir</code>, <code className='font-mono text-primary'>QP</code>, and <code className='font-mono text-primary'>Akasa Air</code> are mapped to the canonical <code className='font-mono text-primary'>Akasa Air</code>).
              </li>
              <li>
                <strong className='text-foreground'>Currency Harmonization</strong>: All fares are strictly processed and validated in Indian National Rupees (INR).
              </li>
              <li>
                <strong className='text-foreground'>Cabin Class & Non-Stop Filtering</strong>: Observations are strictly filtered to non-stop economy class itineraries, eliminating multi-leg layovers that distort corridor yield metrics.
              </li>
              <li>
                <strong className='text-foreground'>Route Corridor Normalization</strong>: Origin and destination airport IATA codes (e.g., DEL, BOM, BLR) are sorted and indexed symmetrically to preserve sector integrity.
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* 6. FARE COMPONENTS */}
      <section id='fare-components' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <FileSpreadsheet className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              6. Fare Components & Statutory Regulatory Decomposition
            </h2>
            <p className='text-xs text-muted-foreground'>Compliance with DGCA Aeronautical Information Circular (AIC) 06/2010</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              In India, gross airfares comprise multiple statutory and commercial elements governed by DGCA AIC 06/2010. Treating gross fare as a uniform monolith conceals whether price changes stem from airline yield extraction or airport regulatory tariffs:
            </p>
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 font-mono text-xs'>
              <div className='p-3 rounded-lg border border-primary/20 bg-card space-y-1'>
                <span className='font-bold text-primary text-[11px] block uppercase'>Base Fare</span>
                <p className='text-foreground font-semibold'>Carrier Controlled</p>
                <p className='text-[10px] text-muted-foreground font-sans'>Core airline dynamic yield revenue.</p>
              </div>
              <div className='p-3 rounded-lg border border-amber-500/20 bg-card space-y-1'>
                <span className='font-bold text-amber-500 text-[11px] block uppercase'>Fuel (YQ/YR)</span>
                <p className='text-foreground font-semibold'>Fuel Surcharge</p>
                <p className='text-[10px] text-muted-foreground font-sans'>Aviation turbine fuel hedge fee.</p>
              </div>
              <div className='p-3 rounded-lg border border-border/70 bg-card space-y-1'>
                <span className='font-bold text-foreground text-[11px] block uppercase'>UDF</span>
                <p className='text-foreground font-semibold'>User Dev Fee</p>
                <p className='text-[10px] text-muted-foreground font-sans'>AERA approved airport tariff.</p>
              </div>
              <div className='p-3 rounded-lg border border-border/70 bg-card space-y-1'>
                <span className='font-bold text-foreground text-[11px] block uppercase'>PSF</span>
                <p className='text-foreground font-semibold'>Passenger Service</p>
                <p className='text-[10px] text-muted-foreground font-sans'>Airport facilitation & CISF security.</p>
              </div>
              <div className='p-3 rounded-lg border border-emerald-500/20 bg-card space-y-1'>
                <span className='font-bold text-emerald-500 text-[11px] block uppercase'>GST</span>
                <p className='text-foreground font-semibold'>Statutory Tax</p>
                <p className='text-[10px] text-muted-foreground font-sans'>5% Economy / 12% Business.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 7. OUTLIER HANDLING */}
      <section id='outliers' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Cpu className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              7. Outlier Handling: Machine Learning Isolation Forest
            </h2>
            <p className='text-xs text-muted-foreground'>Unsupervised anomaly detection without suppressing genuine market surges</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              Scraper outputs occasionally ingest corrupted fare entries (e.g. anti-bot CAPTCHA responses, misparsed currency conversions, or zero-fare test records). Naive threshold cutoffs risk accidentally discarding legitimate high-demand surge pricing.
            </p>
            <p>
              SkyRate utilizes an <strong className='text-foreground'>Unsupervised Isolation Forest</strong> ML algorithm (<code className='font-mono text-primary'>contamination=0.03</code>) in the Python pipeline. The algorithm isolates anomalous points along tree partitions based on price spread, lead time, and corridor averages. Genuine surge fares follow dense clusters along high-demand flight windows, whereas corrupted scrape artifacts isolate rapidly with shallow path lengths and are flagged for exclusion.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 8. DGCA TRAFFIC WEIGHTING */}
      <section id='weighting' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Workflow className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              8. DGCA Passenger Traffic Volume Weighting
            </h2>
            <p className='text-xs text-muted-foreground'>Weight vectors reflecting empirical seat capacity and airline market shares</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              A simple unweighted average across routes biases index metrics toward low-volume regional corridors. SkyRate incorporates official <strong className='text-foreground'>Directorate General of Civil Aviation (DGCA) Monthly Domestic Passenger Traffic</strong> data.
            </p>
            <p>
              Corridors are assigned weights proportional to their monthly passenger seat volume ($W_i$). Heavy trunk routes like DEL-BOM carry substantially higher weight in the national index than secondary sectors, ensuring the composite index faithfully mirrors macro consumer expenditure.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 9. FISHER IDEAL INDEX */}
      <section id='fisher-ideal' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Scale className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              9. Fisher Ideal Mathematical Formulation (APIx)
            </h2>
            <p className='text-xs text-muted-foreground'>The superlative index satisfying time-reversal and eliminating substitution bias</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              Standard price index calculations in economics rely on Laspeyres (base-period weighted) or Paasche (current-period weighted) formulations. In commercial aviation, consumers exhibit strong substitution behavior: if Carrier A raises fares on a sector, travelers substitute toward Carrier B or shift travel dates.
            </p>
            <div className='p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3'>
              <p className='font-mono text-base font-bold text-foreground text-center'>
                APIx_t = 100 × √ [ L_t × P_t ]
              </p>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs'>
                <div className='p-3 rounded-lg bg-card border border-border/60 space-y-1'>
                  <span className='font-bold text-primary block'>Laspeyres (Base Weighted):</span>
                  <p className='text-foreground'>L_t = ( ∑ P_t × Q_0 ) / ( ∑ P_0 × Q_0 )</p>
                  <p className='text-[10px] text-muted-foreground font-sans'>Upper bound (tends to overstate inflation due to substitution neglect).</p>
                </div>
                <div className='p-3 rounded-lg bg-card border border-border/60 space-y-1'>
                  <span className='font-bold text-primary block'>Paasche (Current Weighted):</span>
                  <p className='text-foreground'>P_t = ( ∑ P_t × Q_t ) / ( ∑ P_0 × Q_t )</p>
                  <p className='text-[10px] text-muted-foreground font-sans'>Lower bound (tends to understate base welfare cost).</p>
                </div>
              </div>
            </div>
            <p>
              The <strong className='text-foreground'>Fisher Ideal Index</strong> takes the geometric mean of Laspeyres and Paasche. It is classified in economic index theory as a <em>superlative index</em> that satisfies both the <strong>Time-Reversal Test</strong> and the <strong>Factor-Reversal Test</strong>, completely eliminating consumer substitution bias.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 10. STATE-WISE INDEX */}
      <section id='state-index' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Compass className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              10. State-Wise Airfare Price Index
            </h2>
            <p className='text-xs text-muted-foreground'>Measuring regional airfare divergence from departure origin states</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              Airfare price behavior varies dramatically by regional geography, state taxation on Aviation Turbine Fuel (ATF), and airport infrastructure charges. SkyRate aggregates indices by the origin state of departure (e.g., Maharashtra via BOM, Delhi via DEL, Karnataka via BLR, Telangana via HYD, West Bengal via CCU, Tamil Nadu via MAA).
            </p>
            <p>
              Each state record benchmarks its empirical real-time APIx against the corresponding MoSPI regional CPI baseline, exposing state-level inflation divergence across individual advance purchase horizons.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 11. ALL-INDIA INDEX */}
      <section id='all-india' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Activity className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              11. All-India Macro Composite Index
            </h2>
            <p className='text-xs text-muted-foreground'>National airfare benchmark anchored to MoSPI CPI baseline (100.00)</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              The All-India APIx Index serves as the national composite headline metric. It aggregates all monitored trunk sectors weighted by DGCA traffic shares. Anchored to a base index of <strong className='text-foreground font-mono'>100.00</strong>, it allows civil aviation authorities, economists, and passengers to track overall national air travel inflation trends in real time.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 12. DATA FRESHNESS */}
      <section id='freshness' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Calendar className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              12. Data Freshness & Partition Lifecycle
            </h2>
            <p className='text-xs text-muted-foreground'>Immutable partition routing, calculation timestamps, and in-memory TTL caching</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              Data integrity requires verifiable provenance. SkyRate manages freshness through three coordinated mechanisms:
            </p>
            <ul className='space-y-2 text-xs list-disc pl-5'>
              <li>
                <strong className='text-foreground'>Automated Partition Discovery</strong>: The backend inspects Postgres schemas for the active <code className='font-mono text-primary'>scraped_on_DD_MM_YYYY</code> and <code className='font-mono text-primary'>index_for_DD_MM_YYYY</code> tables, falling back gracefully to the latest verified snapshot if an ingestion run is in-progress.
              </li>
              <li>
                <strong className='text-foreground'>Calculation Date Vintage</strong>: Every analytical response explicitly exposes <code className='font-mono text-primary'>calculation_date</code> alongside <code className='font-mono text-primary'>latest_observation_date</code>, enabling downstream audit trails.
              </li>
              <li>
                <strong className='text-foreground'>In-Memory TTL Caching</strong>: FastAPI maintains in-memory TTL caches (300 seconds for overview metrics, 600 seconds for static route topology) preventing database overload while guaranteeing sub-minute data freshness.
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* 13. ETHICAL SCRAPING */}
      <section id='ethical-scraping' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <ShieldCheck className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              13. Ethical Scraping & Server Responsibility
            </h2>
            <p className='text-xs text-muted-foreground'>Responsible data stewardship respecting airline infrastructure</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              SkyRate adheres strictly to ethical web scraping best practices:
            </p>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs'>
              <div className='p-3 rounded-lg border border-border/70 bg-card space-y-1'>
                <span className='font-bold text-foreground text-xs'>Throttled Ingestion</span>
                <p className='text-muted-foreground text-[11px]'>Randomized backoff intervals preventing concurrency spikes on origin airline servers.</p>
              </div>
              <div className='p-3 rounded-lg border border-border/70 bg-card space-y-1'>
                <span className='font-bold text-foreground text-xs'>Off-Peak Execution</span>
                <p className='text-muted-foreground text-[11px]'>Batch jobs scheduled during low-traffic windows to avoid impacting consumer bookings.</p>
              </div>
              <div className='p-3 rounded-lg border border-border/70 bg-card space-y-1'>
                <span className='font-bold text-foreground text-xs'>Zero Seat Hijacking</span>
                <p className='text-muted-foreground text-[11px]'>Read-only price quotation capture; no reservation sessions created or temporary holds placed.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 14. API ARCHITECTURE */}
      <section id='api-architecture' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Server className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              14. API Architecture & Security Boundary
            </h2>
            <p className='text-xs text-muted-foreground'>Decoupled 3-tier architecture with enterprise security hardening</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              The SkyRate system implements a strict decoupled 3-tier boundary:
            </p>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 font-mono text-xs'>
              <div className='p-3 rounded-lg border border-border/70 bg-card space-y-1'>
                <span className='font-bold text-primary block'>Tier 1: Frontend</span>
                <p className='text-foreground font-semibold'>Next.js 16 (App Router)</p>
                <p className='text-[10px] text-muted-foreground font-sans'>Tailwind CSS, shadcn/ui, Recharts. CSP protected; zero direct database credentials.</p>
              </div>
              <div className='p-3 rounded-lg border border-border/70 bg-card space-y-1'>
                <span className='font-bold text-primary block'>Tier 2: API Gateway</span>
                <p className='text-foreground font-semibold'>FastAPI (Python 3.13)</p>
                <p className='text-[10px] text-muted-foreground font-sans'>Asynchronous REST gateway, Pydantic schemas, 1MB payload limits, 5000 offset cap, sanitization.</p>
              </div>
              <div className='p-3 rounded-lg border border-border/70 bg-card space-y-1'>
                <span className='font-bold text-primary block'>Tier 3: Storage</span>
                <p className='text-foreground font-semibold'>PostgreSQL (Supabase)</p>
                <p className='text-[10px] text-muted-foreground font-sans'>Date-partitioned relational tables with single-query server-side aggregations.</p>
              </div>
            </div>
            <p>
              Backed by <strong className='text-foreground'>124 automated pytest tests</strong> verifying parameter bounds, error envelopes, CORS origin enforcement, and sanitized partition responses.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 15. LIMITATIONS */}
      <section id='limitations' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Lock className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              15. Honest System Limitations
            </h2>
            <p className='text-xs text-muted-foreground'>Rigorous delineation of empirical constraints and econometric bounds</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <p>
              To maintain absolute statistical credibility, SkyRate explicitly documents its operational boundaries:
            </p>
            <ul className='space-y-2 text-xs list-disc pl-5'>
              <li>
                <strong className='text-foreground'>Scope Boundary</strong>: Current coverage monitors primary Indian trunk corridors in non-stop economy class; multi-stop itineraries and premium cabins are intentionally excluded.
              </li>
              <li>
                <strong className='text-foreground'>Observed Fares vs Booking Curves</strong>: Prices reflect publicly quoted retail airfares at sample time; airlines do not disclose proprietary internal booking curve step functions.
              </li>
              <li>
                <strong className='text-foreground'>Non-Causal Econometric Notice</strong>: Observed price trends measure empirical market expenditure and divergence; they must not be interpreted as causal structural elasticity models without external macroeconomic controls.
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* 16. FUTURE IMPROVEMENTS */}
      <section id='future' className='space-y-4 scroll-mt-20'>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Sparkles className='h-4 w-4' />
          </div>
          <div>
            <h2 className='text-xl sm:text-2xl font-bold text-foreground'>
              16. Engineering Roadmap & Future Extensions
            </h2>
            <p className='text-xs text-muted-foreground'>Planned evolutions for institutional regulatory intelligence</p>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardContent className='p-6 space-y-4 text-xs sm:text-sm leading-relaxed text-muted-foreground'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs'>
              <div className='p-3.5 rounded-lg border border-border/70 bg-card space-y-1.5'>
                <div className='flex items-center gap-1.5 text-foreground font-bold'>
                  <ArrowRight className='h-3.5 w-3.5 text-primary' />
                  Regional UDAN Network Expansion
                </div>
                <p className='text-muted-foreground text-[11px] leading-relaxed'>
                  Expanding monitoring beyond trunk routes to subsidized Tier-2 and Tier-3 RCS-UDAN routes where fare capping compliance is critical.
                </p>
              </div>

              <div className='p-3.5 rounded-lg border border-border/70 bg-card space-y-1.5'>
                <div className='flex items-center gap-1.5 text-foreground font-bold'>
                  <ArrowRight className='h-3.5 w-3.5 text-primary' />
                  Connecting Itinerary Yield Synthesis
                </div>
                <p className='text-muted-foreground text-[11px] leading-relaxed'>
                  Developing multi-hop index decomposition separating hub layover costs from origin-destination consumer travel utility.
                </p>
              </div>

              <div className='p-3.5 rounded-lg border border-border/70 bg-card space-y-1.5'>
                <div className='flex items-center gap-1.5 text-foreground font-bold'>
                  <ArrowRight className='h-3.5 w-3.5 text-primary' />
                  Predictive Fare Forecasting ML
                </div>
                <p className='text-muted-foreground text-[11px] leading-relaxed'>
                  Training sequence-to-sequence neural architectures to provide forward-looking fare forecasts for passenger advance budget optimization.
                </p>
              </div>

              <div className='p-3.5 rounded-lg border border-border/70 bg-card space-y-1.5'>
                <div className='flex items-center gap-1.5 text-foreground font-bold'>
                  <ArrowRight className='h-3.5 w-3.5 text-primary' />
                  Live Passenger Load Factor (PLF) Telemetry
                </div>
                <p className='text-muted-foreground text-[11px] leading-relaxed'>
                  Partnering with civil aviation authorities for live flight occupancy feeds to calibrate elasticity against real-time physical seat inventory.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* REGULATORY COMPLIANCE DISCLAIMER */}
      <section>
        <Card className='border-border/80 bg-muted/20'>
          <CardContent className='p-6 flex items-start gap-4 text-xs sm:text-sm'>
            <AlertTriangle className='h-5 w-5 text-amber-500 shrink-0 mt-0.5' />
            <div className='space-y-1.5 text-muted-foreground leading-relaxed'>
              <span className='font-bold text-foreground block text-sm'>
                Statistically Defensible Price Surveillance Disclaimer
              </span>
              <p>
                SkyRate provides empirical price indexation and advance-purchase yield surveillance for monitored Indian domestic airline corridors. In strict conformance with econometric best practices, displayed metrics represent observed market price movements and do not assert causal economic elasticity. All values are calculated from verified, public airfare quotations. No proprietary or confidential airline booking data is exposed.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
