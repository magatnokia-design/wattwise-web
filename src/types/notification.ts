export type NotificationType = 
  | 'budget_alert'
  | 'power_safety'
  | 'schedule_complete'
  | 'device_offline'
  | 'appliance_detected'
  | 'system';

export type NotificationSeverity = 'info' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  severity: NotificationSeverity;
  metadata?: Record<string, unknown>;
}