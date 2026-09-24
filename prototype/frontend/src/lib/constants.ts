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
  { route: 'DEL-BOM', origin: 'DEL', destination: 'BOM', origin_city: 'Delhi', destination_city: 'Mumbai', density: 'High', hasData: true, observations: 13 },
  { route: 'BLR-DEL', origin: 'BLR', destination: 'DEL', origin_city: 'Bengaluru', destination_city: 'Delhi', density: 'High', hasData: true, observations: 4 },
  { route: 'BOM-GOI', origin: 'BOM', destination: 'GOI', origin_city: 'Mumbai', destination_city: 'Goa', density: 'Medium', hasData: true, observations: 3 },
  { route: 'DEL-CCU', origin: 'DEL', destination: 'CCU', origin_city: 'Delhi', destination_city: 'Kolkata', density: 'High', hasData: true, observations: 3 },
  { route: 'BOM-BLR', origin: 'BOM', destination: 'BLR', origin_city: 'Mumbai', destination_city: 'Bengaluru', density: 'High', hasData: true, observations: 2 },
  { route: 'BOM-DEL', origin: 'BOM', destination: 'DEL', origin_city: 'Mumbai', destination_city: 'Delhi', density: 'High', hasData: false, observations: 0 },
  { route: 'DEL-BLR', origin: 'DEL', destination: 'BLR', origin_city: 'Delhi', destination_city: 'Bengaluru', density: 'High', hasData: false, observations: 0 },
  { route: 'BLR-BOM', origin: 'BLR', destination: 'BOM', origin_city: 'Bengaluru', destination_city: 'Mumbai', density: 'High', hasData: false, observations: 0 },
  { route: 'CCU-DEL', origin: 'CCU', destination: 'DEL', origin_city: 'Kolkata', destination_city: 'Delhi', density: 'High', hasData: false, observations: 0 },
  { route: 'GOI-BOM', origin: 'GOI', destination: 'BOM', origin_city: 'Goa', destination_city: 'Mumbai', density: 'Medium', hasData: false, observations: 0 },
  { route: 'DEL-HYD', origin: 'DEL', destination: 'HYD', origin_city: 'Delhi', destination_city: 'Hyderabad', density: 'Medium', hasData: false, observations: 0 },
  { route: 'HYD-DEL', origin: 'HYD', destination: 'DEL', origin_city: 'Hyderabad', destination_city: 'Delhi', density: 'Medium', hasData: false, observations: 0 },
  { route: 'DEL-MAA', origin: 'DEL', destination: 'MAA', origin_city: 'Delhi', destination_city: 'Chennai', density: 'Standard', hasData: false, observations: 0 },
  { route: 'MAA-DEL', origin: 'MAA', destination: 'DEL', origin_city: 'Chennai', destination_city: 'Delhi', density: 'Standard', hasData: false, observations: 0 },
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
  GOI: { city: 'Goa', name: 'Dabolim Airport', state: 'Goa' },
  HYD: { city: 'Hyderabad', name: 'Rajiv Gandhi International Airport', state: 'Telangana' },
  CCU: { city: 'Kolkata', name: 'Netaji Subhash Chandra Bose Airport', state: 'West Bengal' },
  MAA: { city: 'Chennai', name: 'Chennai International Airport', state: 'Tamil Nadu' },
};

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', description: 'Macro-economic overview and live APIs' },
  { name: 'APIx Index', href: '/apix', icon: 'TrendingUp', description: 'Real-Time Airfare Price Index & State Divergence' },
  { name: 'Analytics', href: '/analytics', icon: 'BarChart3', description: 'Advance-purchase elasticity & carrier pricing' },
  { name: 'Routes', href: '/routes', icon: 'Compass', description: 'DGCA monitored aviation corridors & traffic density' },
  { name: 'Methodology', href: '/methodology', icon: 'BookOpen', description: 'Fisher Ideal calculation & SIH26056 specifications' },
] as const;
