export type MotorStatus = 'healthy' | 'warning' | 'fault' | 'offline';

export interface Motor {
  id: string;
  motor_number: 1 | 2 | 3;
  motor_name: string;
  rated_voltage: number;
  rated_current: number | null;
  phase_count: number;
  status: MotorStatus;
  created_at: string;
  updated_at: string;
}
