export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export const HORIZONS = [
  { value: 'T', label: 'T (Same Day)', description: '0 days prior' },
  { value: 'T+1', label: 'T+1', description: '1 day prior' },
  { value: 'T+7', label: 'T+7', description: '7 days prior' },
  { value: 'T+15', label: 'T+15', description: '15 days prior' },
  { value: 'T+30', label: 'T+30', description: '30 days prior' },
  { value: 'T+45', label: 'T+45', description: '45 days prior' },
] as const;

export const VALID_HORIZONS_LIST = ['T', 'T+1', 'T+7', 'T+15', 'T+30', 'T+45', 'T+60', 'T+90'] as const;

export const MONITORED_ROUTES = [
  { route: 'DEL-BOM', origin: 'DEL', destination: 'BOM', origin_city: 'Delhi', destination_city: 'Mumbai', density: 'High' },
  { route: 'BOM-DEL', origin: 'BOM', destination: 'DEL', origin_city: 'Mumbai', destination_city: 'Delhi', density: 'High' },
  { route: 'DEL-BLR', origin: 'DEL', destination: 'BLR', origin_city: 'Delhi', destination_city: 'Bengaluru', density: 'High' },
  { route: 'BLR-DEL', origin: 'BLR', destination: 'DEL', origin_city: 'Bengaluru', destination_city: 'Delhi', density: 'High' },
  { route: 'BOM-BLR', origin: 'BOM', destination: 'BLR', origin_city: 'Mumbai', destination_city: 'Bengaluru', density: 'Medium' },
  { route: 'DEL-HYD', origin: 'DEL', destination: 'HYD', origin_city: 'Delhi', destination_city: 'Hyderabad', density: 'Medium' },
  { route: 'DEL-CCU', origin: 'DEL', destination: 'CCU', origin_city: 'Delhi', destination_city: 'Kolkata', density: 'Medium' },
  { route: 'DEL-MAA', origin: 'DEL', destination: 'MAA', origin_city: 'Delhi', destination_city: 'Chennai', density: 'Standard' },
] as const;

export const AIRLINE_CARRIERS = [
  'IndiGo',
  'Air India',
  'SpiceJet',
  'Akasa Air',
  'Vistara',
  'AIX Connect'
] as const;

export const AIRPORT_METADATA: Record<string, { city: string; name: string; state: string }> = {
  DEL: { city: 'Delhi', name: 'Indira Gandhi International Airport', state: 'Delhi' },
  BOM: { city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International', state: 'Maharashtra' },
  BLR: { city: 'Bengaluru', name: 'Kempegowda International Airport', state: 'Karnataka' },
  HYD: { city: 'Hyderabad', name: 'Rajiv Gandhi International Airport', state: 'Telangana' },
  CCU: { city: 'Kolkata', name: 'Netaji Subhash Chandra Bose Airport', state: 'West Bengal' },
  MAA: { city: 'Chennai', name: 'Chennai International Airport', state: 'Tamil Nadu' },
};

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', description: 'Macro-economic overview and live KPIs' },
  { name: 'Flight Fares', href: '/fares', icon: 'Plane', description: 'Live scraped flight fare explorer & distributions' },
  { name: 'APIx Index', href: '/index', icon: 'TrendingUp', description: 'Real-Time Airfare Price Index & State Divergence' },
  { name: 'Analytics', href: '/analytics', icon: 'BarChart3', description: 'Advance-purchase elasticity & carrier pricing' },
  { name: 'Routes', href: '/routes', icon: 'Compass', description: 'DGCA monitored aviation corridors & traffic density' },
  { name: 'Methodology', href: '/methodology', icon: 'BookOpen', description: 'Fisher Ideal calculation & SIH26056 specifications' },
] as const;
