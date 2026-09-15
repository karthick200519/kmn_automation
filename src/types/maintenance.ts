export type MaintenanceDecision =
  | 'Normal operation'
  | 'Monitoring required'
  | 'Inspection recommended'
  | 'Maintenance required'
  | 'Immediate attention'
  | 'normal_operation'
  | 'inspection_recommended'
  | 'maintenance_required'
  | 'immediate_attention';

export type ScheduleType =
  | 'inspection'
  | 'preventive_maintenance'
  | 'bearing_inspection'
  | 'lubrication'
  | 'electrical_inspection'
  | 'vibration_inspection'
  | 'general_maintenance';

export type SchedulePriority = 'low' | 'medium' | 'high' | 'critical';
export type ScheduleStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

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
  motor_name?: string;
  motor_number?: number;
  assigned_to_name?: string;
  created_by_name?: string;
}
