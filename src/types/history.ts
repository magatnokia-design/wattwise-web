export interface HistoryLog {
  id: string;
  timestamp: Date;
  outletId: string;
  outletNumber: 1 | 2;
  applianceName: string;
  power: number;
  voltage: number;
  current: number;
  energy: number;
  cost: number;
}

export interface DailyHistory {
  id: string;
  date: string; // YYYY-MM-DD
  totalEnergy: number;
  totalCost: number;
  outletBreakdown: Record<string, OutletDailyData>;
  applianceBreakdown: Record<string, ApplianceDailyData>;
}

export interface OutletDailyData {
  energy: number;
  cost: number;
  hours: number;
}

export interface ApplianceDailyData {
  energy: number;
  cost: number;
  hours: number;
  outletId: string;
}