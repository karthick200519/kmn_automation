import { useState, useEffect, useCallback } from 'react';
import type { MachineHealth, MotorSeverity, MotorDegradation } from '../types/database';
import { healthService } from '../services/healthService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useHealth(motorId?: string) {
  const [health, setHealth] = useState<MachineHealth | null>(null);
  const [severity, setSeverity] = useState<MotorSeverity | null>(null);
  const [degradation, setDegradation] = useState<MotorDegradation | null>(null);
  const [history, setHistory] = useState<MachineHealth[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    if (!motorId) return;
    try {
      setLoading(true);
      setError(null);
      const [h, s, d, hist] = await Promise.all([
        healthService.getLatestHealth(motorId),
        healthService.getLatestSeverity(motorId),
        healthService.getLatestDegradation(motorId),
        healthService.getHealthHistory(motorId),
      ]);
      setHealth(h);
      setSeverity(s);
      setDegradation(d);
      setHistory(hist);
    } catch (err: any) {
      console.error('Error fetching health details:', err);
      setError(err?.message || 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  }, [motorId]);

  useEffect(() => {
    fetchHealth();

    if (!isSupabaseConfigured() || !motorId) return;

    const channel = supabase
      .channel(`realtime_health_${motorId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'machine_health', filter: `motor_id=eq.${motorId}` },
        () => fetchHealth()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motor_severity', filter: `motor_id=eq.${motorId}` },
        () => fetchHealth()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motor_degradation', filter: `motor_id=eq.${motorId}` },
        () => fetchHealth()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [motorId, fetchHealth]);

  return { health, severity, degradation, history, loading, error, refresh: fetchHealth };
}
