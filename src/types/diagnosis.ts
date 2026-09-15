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
