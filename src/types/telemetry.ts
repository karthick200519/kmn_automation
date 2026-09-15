export type DataQuality = 'valid' | 'invalid' | 'missing' | 'communication_error';
export type DataSource = 'sample' | 'modbus' | 'manual';

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
