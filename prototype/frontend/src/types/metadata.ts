export interface AirportMetadata {
  code: string;
  city: string;
  name: string;
  udf: number;
}

export interface HorizonMetadata {
  code: string;
  days: number;
  label: string;
}

export interface CarrierMetadata {
  code: string;
  name: string;
  type: string;
}

export interface SystemMetadata {
  airports: AirportMetadata[];
  horizons: HorizonMetadata[];
  carriers: CarrierMetadata[];
  routes: string[];
  version: string;
}
