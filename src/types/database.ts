export type UserRole = 'admin' | 'engineer' | 'operator';
export type UserStatus = 'active' | 'inactive';
export type MotorStatus = 'healthy' | 'warning' | 'fault' | 'offline';
export type DataQuality = 'valid' | 'invalid' | 'missing' | 'communication_error';
export type DataSource = 'sample' | 'modbus' | 'manual';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type HealthStatus = 'Optimal' | 'Good' | 'Degraded' | 'Critical';
export type DegradationStatus = 'Stable' | 'Slowly Degrading' | 'Rapidly Degrading' | 'Critical Degradation';
export type MaintenanceDecision = 'Normal operation' | 'Monitoring required' | 'Inspection recommended' | 'Maintenance required' | 'Immediate attention';
export type ScheduleType = 'inspection' | 'preventive_maintenance' | 'bearing_inspection' | 'lubrication' | 'electrical_inspection' | 'vibration_inspection' | 'general_maintenance';
export type SchedulePriority = 'low' | 'medium' | 'high' | 'critical';
export type ScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
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

export interface MotorSensorData {
  id: string;
  motor_id: string;
  timestamp: string;
  voltage: number | null;
  current: number | null;
  temperature: number | null;
  vibration_rms: number | null;
  power: number | null;
  energy: number | null;
  frequency: number | null;
  power_factor: number | null;
  data_quality: DataQuality;
  source: DataSource;
  created_at: string;
}

export interface AiPrediction {
  id: string;
  motor_id: string;
  timestamp: string;
  class_id: number;
  class_name: string;
  confidence: number;
  model_version: string;
  created_at: string;
}

export interface MotorSeverity {
  id: string;
  motor_id: string;
  prediction_id: string | null;
  timestamp: string;
  severity: SeverityLevel;
  created_at: string;
}

export interface MachineHealth {
  id: string;
  motor_id: string;
  timestamp: string;
  health_index: number;
  health_status: HealthStatus;
  created_at: string;
}

export interface MotorDegradation {
  id: string;
  motor_id: string;
  timestamp: string;
  degradation_rate: number | null;
  degradation_status: DegradationStatus;
  created_at: string;
}

export interface MaintenanceDecisionRecord {
  id: string;
  motor_id: string;
  prediction_id: string | null;
  timestamp: string;
  decision: MaintenanceDecision;
  recommendation: string;
  created_at: string;
}

export interface MaintenanceSchedule {
  id: string;
  motor_id: string;
  title: string;
  schedule_type: ScheduleType;
  description: string | null;
  assigned_to: string | null;
  priority: SchedulePriority;
  start_time: string;
  scheduled_start?: string;
  end_time: string | null;
  status: ScheduleStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields from views
  motor_name?: string;
  motor_number?: number;
  assigned_to_name?: string;
  created_by_name?: string;
}

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
  // Joined fields from view
  motor_name?: string;
  motor_number?: number;
  acknowledged_by_name?: string;
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
  severity: SeverityLevel;
  message: string;
  created_at: string;
  // Joined / computed metadata
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
  motor_status: MotorStatus;
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
  sensor_source: DataSource | null;
  class_id: number | null;
  class_name: string | null;
  confidence: number | null;
  model_version: string | null;
  severity: SeverityLevel | null;
  health_index: number | null;
  health_status: HealthStatus | null;
  degradation_status: DegradationStatus | null;
  degradation_rate?: number | null;
  maintenance_decision: MaintenanceDecision | null;
  maintenance_recommendation: string | null;
}

