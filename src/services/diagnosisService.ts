import { supabase, isSupabaseConfigured } from './supabase/client';
import type { AiPrediction } from '../types/database';
import { FAULT_CLASSES } from '../config/faultClasses';

export const diagnosisService = {
  async getDiagnosisHistory(motorId?: string): Promise<AiPrediction[]> {
    if (!isSupabaseConfigured()) {
      return this.getMockPredictions();
    }
    try {
      let query = supabase
        .from('ai_predictions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (motorId && motorId !== 'all') {
        query = query.eq('motor_id', motorId);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return this.getMockPredictions();
      }

      return data as AiPrediction[];
    } catch {
      return this.getMockPredictions();
    }
  },

  getMockPredictions(): AiPrediction[] {
    const now = Date.now();
    return [
      {
        id: 'pred-1',
        motor_id: 'c3333333-3333-3333-3333-333333333333',
        timestamp: new Date(now - 300000).toISOString(),
        class_id: 1,
        class_name: FAULT_CLASSES[1].class_name,
        confidence: 0.94,
        model_version: 'v1.2.0',
        created_at: new Date(now - 300000).toISOString(),
      },
      {
        id: 'pred-2',
        motor_id: 'b2222222-2222-2222-2222-222222222222',
        timestamp: new Date(now - 1800000).toISOString(),
        class_id: 17,
        class_name: FAULT_CLASSES[17].class_name,
        confidence: 0.91,
        model_version: 'v1.2.0',
        created_at: new Date(now - 1800000).toISOString(),
      },
      {
        id: 'pred-3',
        motor_id: 'a1111111-1111-1111-1111-111111111111',
        timestamp: new Date(now - 3600000).toISOString(),
        class_id: 0,
        class_name: FAULT_CLASSES[0].class_name,
        confidence: 0.99,
        model_version: 'v1.2.0',
        created_at: new Date(now - 3600000).toISOString(),
      },
    ];
  },
};

