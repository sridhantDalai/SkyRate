export interface HealthStatus {
  status: string;
  environment: string;
  supabase_connected: boolean;
  active_scraped_table: string;
  active_index_table: string;
  timestamp: string;
}

export interface AnalyticsOverview {
  latest_apix?: number | null;
  previous_apix?: number | null;
  percentage_change?: number | null;
  number_of_observed_fares: number;
  number_of_routes: number;
  number_of_carriers: number;
  lowest_observed_fare?: number | null;
  median_fare?: number | null;
  highest_observed_fare?: number | null;
  latest_observation_date: string;
  calculation_date?: string | null;
  omitted_metrics_notes?: Record<string, string>;

  all_india_apix?: number | null;
  total_routes_monitored?: number | null;
  total_flights_analyzed?: number | null;
  average_gross_fare_inr?: number | null;
  lowest_fare_inr?: number | null;
  highest_fare_inr?: number | null;
  brent_crude_usd?: number | null;
  national_inflation_pct?: string | null;
  active_partition_date?: string | null;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  sample_count?: number;
  min_value?: number;
  max_value?: number;
}

export interface AnalyticsTrendsResponse {
  route?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  horizon?: string;
  date_from: string;
  date_to: string;
  granularity: 'daily' | 'weekly' | 'monthly' | string;
  metric: string;
  currency: string;
  series: TimeSeriesPoint[];
}

export interface AnalyticsTrendsParams {
  route?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  horizon?: string;
  date_from?: string;
  date_to?: string;
  days?: number;
  granularity?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
  offset?: number;
}

export interface LeadTimePoint {
  horizon: string;
  days_before_departure: number;
  median_fare: number;
  min_fare: number;
  max_fare: number;
  sample_size?: number;
  t_window?: string;
  avg_gross_fare?: number;
  min_gross_fare?: number;
  max_gross_fare?: number;
}

export interface LeadTimeAnalysisResponse {
  route: string;
  carrier?: string | null;
  partition_date?: string | null;
  analysis_type: string;
  currency: string;
  points: LeadTimePoint[];
}

export interface LeadTimeAnalysisParams {
  route?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  date?: string;
}

export interface CarrierFareStats {
  carrier: string;
  observations: number;
  available_count: number;
  sold_out_count: number;
  minimum?: number | null;
  median?: number | null;
  average?: number | null;
  maximum?: number | null;
  flight_count?: number;
  min_fare?: number | null;
  avg_gross_fare?: number | null;
  max_fare?: number | null;
  market_share_pct?: number | null;
  on_time_performance_est?: string | null;
}

export interface CarrierAnalyticsResponse {
  route?: string | null;
  partition_date?: string | null;
  horizon?: string | null;
  currency: string;
  total_carriers: number;
  total_observations: number;
  carriers: CarrierFareStats[];
}

export interface CarrierAnalyticsParams {
  route?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  date?: string;
  horizon?: string;
}

export interface FeeBreakdownItem {
  component: string;
  amount: number;
  percentage: number;
}

export interface RouteFeeBreakdown {
  route: string;
  avg_gross_fare: number;
  breakdown: FeeBreakdownItem[];
}

export interface OilIndicatorRecord {
  date: string;
  brent_crude_usd: number;
}

export interface MacroAnalyticsResponse {
  oil_records: OilIndicatorRecord[];
  latest_oil_usd: number;
  correlation_insight: string;
}
