export * from './motor';
export * from './telemetry';
export * from './diagnosis';
export * from './health';
export * from './maintenance';
export * from './alerts';

export type UserRole = 'admin' | 'engineer' | 'operator';
export type UserStatus = 'active' | 'inactive';
export type CommandStatus = 'pending' | 'sent' | 'executed' | 'failed';
export type DataSourceMode = 'demo' | 'live';

export interface Profile {
  id: string;
  name: string;
  email: string | null;
  phone_number?: string | null;
  password?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface ControlCommand {
  id: string;
  motor_id: string | null;
  requested_by: string | null;
  timestamp: string;
  relay_1: boolean | null;
  relay_2: boolean | null;
  relay_3: boolean | null;
  buzzer: boolean | null;
  emergency: boolean;
  command_status: CommandStatus;
  failure_reason: string | null;
  executed_at: string | null;
  created_at: string;
}

export interface GpioStatus {
  id: string;
  timestamp: string;
  relay_1: boolean;
  relay_2: boolean;
  relay_3: boolean;
  buzzer: boolean;
  emergency: boolean;
  updated_by: string | null;
  created_at: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  user_id: string | null;
  motor_id: string | null;
  event_type: string;
  severity: import('./health').SeverityLevel;
  message: string;
  created_at: string;
  user_name?: string;
  motor_number?: number;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: { mode?: DataSourceMode; [key: string]: any };
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface CurrentMotorStatus {
  motor_id: string;
  motor_number: 1 | 2 | 3;
  motor_name: string;
  motor_status: import('./motor').MotorStatus;
  sensor_timestamp: string | null;
  voltage: number | null;
  current: number | null;
  temperature: number | null;
  vibration_rms: number | null;
  power: number | null;
  energy: number | null;
  frequency: number | null;
  power_factor: number | null;
  rated_voltage?: number | null;
  rated_current?: number | null;
  rated_power?: number | null;
  rated_speed?: number | null;
  rated_frequency?: number | null;
  sensor_source: import('./telemetry').DataSource | null;
  class_id: number | null;
  class_name: string | null;
  confidence: number | null;
  model_version: string | null;
  severity: import('./health').SeverityLevel | null;
  severity_description?: string | null;
  health_index: number | null;
  health_status: import('./health').HealthStatus | null;
  degradation_status: import('./health').DegradationStatus | null;
  degradation_rate?: number | null;
  maintenance_decision: import('./maintenance').MaintenanceDecision | null;
  maintenance_recommendation: string | null;
}
