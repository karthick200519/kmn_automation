import { useState, useEffect, useCallback } from 'react';
import type { AiPrediction } from '../types/database';
import { diagnosisService } from '../services/diagnosisService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useDiagnosis(motorId?: string) {
  const [predictions, setPredictions] = useState<AiPrediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnosis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await diagnosisService.getDiagnosisHistory(motorId);
      setPredictions(data);
    } catch (err: any) {
      console.error('Error fetching diagnosis history:', err);
      setError(err?.message || 'Failed to fetch diagnosis history');
    } finally {
      setLoading(false);
    }
  }, [motorId]);

  useEffect(() => {
    fetchDiagnosis();

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`realtime_ai_predictions_${motorId || 'all'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_predictions' },
        (payload) => {
          const newRecord = payload.new as AiPrediction;
          if (!motorId || motorId === 'all' || newRecord.motor_id === motorId) {
            setPredictions((prev) => [newRecord, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [motorId, fetchDiagnosis]);

  return { predictions, loading, error, refresh: fetchDiagnosis };
}
