export interface Budget {
  id: string;
  month: string; // YYYY-MM
  budget: number;
  totalCost: number;
  totalEnergy: number;
  threshold50: boolean;
  threshold75: boolean;
  threshold90: boolean;
  threshold100: boolean;
}

export interface BudgetThreshold {
  percentage: 50 | 75 | 90 | 100;
  reached: boolean;
  amount: number;
}