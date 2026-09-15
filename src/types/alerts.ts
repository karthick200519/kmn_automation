import type { SeverityLevel } from './health';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  motor_id: string;
  prediction_id: string | null;
  timestamp: string;
  title: string;
  message: string;
  severity: SeverityLevel;
  status: AlertStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  motor_name?: string;
  motor_number?: number;
  acknowledged_by_name?: string;
}
