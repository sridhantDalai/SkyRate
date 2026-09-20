export interface APIxIndexRecord {
  State: string;
  Time_Horizon: string;
  MoSPI_Base: number;
  Basket_Inflation: string;
  RealTime_APIx: number;
}

export interface IndexItem {
  state: string;
  time_horizon: string;
  mospi_base: number;
  basket_inflation: string;
  real_time_apix: number;
}

export interface IndexFilterParams {
  state?: string;
  route?: string;
  carrier?: string;
  horizon?: string;
  limit?: number;
  offset?: number;
}

export interface LatestIndexResponse {
  partition_date?: string;
  partition_table?: string;
  total: number;
  limit: number;
  offset: number;
  filters_applied: Record<string, unknown>;
  items: IndexItem[];
}

export interface IndexOverview {
  partition_table: string;
  all_india: APIxIndexRecord[];
  states: APIxIndexRecord[];
  updated_at: string;
}

export interface StateIndexComparison {
  state: string;
  latest_apix: number;
  mospi_base: number;
  basket_inflation: string;
  horizons: APIxIndexRecord[];
}

export interface IndexHistoryItem {
  date: string;
  state: string;
  time_horizon: string;
  apix: number;
  mospi_base: number;
  basket_inflation: string;
}

export interface IndexComparisonItem {
  entity: string;
  current_apix: number;
  mospi_base: number;
  inflation_rate: string;
  divergence_pct: number;
}

export interface IndexCompareResponse {
  benchmark: string;
  comparisons: IndexComparisonItem[];
}
