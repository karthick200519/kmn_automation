import { useState, useEffect, useCallback } from 'react';
import type { CurrentMotorStatus } from '../types/database';
import { motorService } from '../services/motorService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useMotors() {
  const [motors, setMotors] = useState<CurrentMotorStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMotors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await motorService.getCurrentMotorStatus();
      if (data && data.length > 0) {
        setMotors(data);
      } else {
        setMotors((prev) => {
          if (prev.length > 0) {
            console.warn('[Dashboard] Retaining existing motor list as fresh query returned 0 rows');
            return prev;
          }
          return [];
        });
      }
    } catch (err: any) {
      console.error('[Dashboard] motors query failed:', err?.message || err);
      setError(err?.message || 'Failed to load motors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMotors();

    if (!isSupabaseConfigured()) return;

    // Subscribe to realtime updates across relevant tables
    const channel = supabase
      .channel('realtime_motors_dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motor_sensor_data' },
        () => fetchMotors()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_predictions' },
        () => fetchMotors()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'machine_health' },
        () => fetchMotors()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motor_severity' },
        () => fetchMotors()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'motor_degradation' },
        () => fetchMotors()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_decisions' },
        () => fetchMotors()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMotors]);

  return { motors, loading, error, refresh: fetchMotors };
}
