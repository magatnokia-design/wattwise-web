export type ScheduleType = 'countdown' | 'scheduled';
export type ScheduleAction = 'on' | 'off';

export interface Schedule {
  id: string;
  type: ScheduleType;
  outletId: string;
  action: ScheduleAction;
  timeValue: number; // minutes for countdown, timestamp for scheduled
  days?: number[]; // 0-6 for Sunday-Saturday (scheduled only)
  enabled: boolean;
  createdAt: Date;
}

export interface CountdownSchedule extends Schedule {
  type: 'countdown';
  timeValue: number; // minutes
}

export interface ScheduledTimer extends Schedule {
  type: 'scheduled';
  timeValue: number; // timestamp
  days: number[];
}