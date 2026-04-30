export interface User {
  id: string;
  email: string;
  name: string;
  electricityRate: number;
  monthlyBudget: number;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  notifications: boolean;
  autoShutdown: boolean;
  theme: 'light' | 'dark';
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}