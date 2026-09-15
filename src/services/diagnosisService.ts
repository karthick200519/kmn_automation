import { supabase, isSupabaseConfigured } from './supabase/client';
import type { AiPrediction } from '../types/database';

export const diagnosisService = {
  async getDiagnosisHistory(motorId?: string): Promise<AiPrediction[]> {
    if (!isSupabaseConfigured()) {
      return [];
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
      if (error) {
        console.error('Failed to fetch AI predictions:', error);
        return [];
      }

      return (data ?? []) as AiPrediction[];
    } catch (err) {
      console.error('AI predictions query exception:', err);
      return [];
    }
  },
};
