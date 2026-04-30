export interface PowerSafetySettings {
  enabled: boolean;
  limits: SafetyLimits;
  autoShutdown: boolean;
  notifications: boolean;
}

export interface SafetyLimits {
  voltage: {
    min: number;
    max: number;
  };
  current: {
    max: number;
  };
  power: {
    max: number;
  };
}

export interface PowerSafetyAlert {
  id: string;
  timestamp: Date;
  outletId: string;
  type: 'voltage' | 'current' | 'power';
  value: number;
  threshold: number;
  action: 'warning' | 'shutdown';
  resolved: boolean;
}