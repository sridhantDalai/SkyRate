export interface ResponseEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export interface ErrorEnvelope {
  success: false;
  error: ErrorDetail;
}

export interface FareItem {
  ID: string;
  route: string;
  carrier: string;
  flight_number: string;
  is_non_stop: boolean;
  t_window: string;
  base_fare?: number | null;
  taxes?: number | null;
  udf_fee?: number | null;
  gross_fare?: number | null;
  status: 'Available' | 'Sold Out' | 'Sold Out / Cancelled' | string;
  source: string;
}

export interface LatestFaresParams {
  origin?: string;
  destination?: string;
  route?: string;
  carrier?: string;
  horizon?: string;
  date?: string;
  status?: string;
  nonstop?: boolean;
  is_non_stop?: boolean;
  min_price?: number;
  max_price?: number;
  limit?: number;
  offset?: number;
}

export interface LatestFaresResponse {
  partition_date: string;
  partition_table: string;
  total: number;
  total_count: number;
  limit: number;
  offset: number;
  filters_applied: Record<string, unknown>;
  items: FareItem[];
}

export interface FareHistoryPoint {
  date: string;
  route: string;
  carrier: string;
  horizon: string;
  avg_gross_fare: number;
  min_gross_fare: number;
  max_gross_fare: number;
  sample_count: number;
}

export interface FareHistoryResponse {
  route?: string;
  carrier?: string;
  horizon?: string;
  date_from: string;
  date_to: string;
  total_points: number;
  items: FareHistoryPoint[];
}

export interface FareHistoryParams {
  route?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  horizon?: string;
  date_from?: string;
  date_to?: string;
  days?: number;
  limit?: number;
  offset?: number;
}

export interface FareDistributionBucket {
  price_range: string;
  min_price: number;
  max_price: number;
  count: number;
  percentage: number;
}

export interface FareDistributionResponse {
  partition_date: string;
  partition_table: string;
  route?: string;
  carrier?: string;
  horizon?: string;
  currency: string;
  sample_size: number;
  min_fare: number;
  max_fare: number;
  median_fare: number;
  p25_fare: number;
  p75_fare: number;
  std_dev: number;
  buckets: FareDistributionBucket[];
}

export interface FareDistributionParams {
  origin?: string;
  destination?: string;
  route?: string;
  carrier?: string;
  horizon?: string;
  date?: string;
  status?: string;
  nonstop?: boolean;
  is_non_stop?: boolean;
}

export interface RouteItem {
  route: string;
  origin: string;
  destination: string;
  origin_city: string;
  destination_city: string;
  density: 'High' | 'Medium' | 'Standard' | string;
}

export interface RouteDetails extends RouteItem {
  distance_km: number;
  avg_flight_duration: string;
  monitored_carriers: string[];
  peak_surge_window: string;
}
