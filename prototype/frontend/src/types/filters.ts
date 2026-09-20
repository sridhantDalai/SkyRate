export interface DashboardFilters {
  route?: string;
  origin?: string;
  destination?: string;
  carrier?: string;
  horizon?: string;
  dateFrom?: string;
  dateTo?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  search?: string;
  page?: number;
  limit?: number;
}

export type FilterKey = keyof DashboardFilters;

export interface FilterOption<T = string> {
  value: T;
  label: string;
  description?: string;
}
