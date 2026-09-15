export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type HealthStatus = 'Optimal' | 'Good' | 'Degraded' | 'Critical';
export type DegradationStatus = 'Stable' | 'Slowly Degrading' | 'Rapidly Degrading' | 'Critical Degradation';

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
