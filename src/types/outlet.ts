export interface Outlet {
  id: string;
  outletNumber: 1 | 2;
  applianceName: string;
  isOn: boolean;
  power: number;
  voltage: number;
  current: number;
  lastUpdated: Date;
  detectedAppliance?: string;
  applianceConfidence?: number;
}

export interface OutletMetrics {
  power: number;
  voltage: number;
  current: number;
  energy: number;
  cost: number;
}

export interface OutletTogglePayload {
  outletId: string;
  action: 'on' | 'off';
}