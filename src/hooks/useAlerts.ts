import { useState, useEffect, useCallback } from 'react';
import type { Alert } from '../types/database';
import { alertService } from '../services/alertService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useAlerts(motorId?: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await alertService.getAlerts(motorId);
      setAlerts(data);
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
      setError(err?.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [motorId]);

  useEffect(() => {
    fetchAlerts();

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`realtime_alerts_${motorId || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => fetchAlerts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [motorId, fetchAlerts]);

  const acknowledgeAlert = async (alertId: string, userId?: string) => {
    const success = await alertService.acknowledgeAlert(alertId, userId);
    if (success) {
      fetchAlerts();
    }
    return success;
  };

  return { alerts, loading, error, refresh: fetchAlerts, acknowledgeAlert };
}
