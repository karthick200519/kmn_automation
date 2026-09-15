import { useState, useEffect, useCallback } from 'react';
import type { MaintenanceDecisionRecord, MaintenanceSchedule } from '../types/database';
import { maintenanceService } from '../services/maintenanceService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useMaintenance(motorId?: string) {
  const [latestDecision, setLatestDecision] = useState<MaintenanceDecisionRecord | null>(null);
  const [decisions, setDecisions] = useState<MaintenanceDecisionRecord[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaintenance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [decList, schedList, singleDecision] = await Promise.all([
        maintenanceService.getAllDecisions(),
        maintenanceService.getSchedules(motorId),
        motorId ? maintenanceService.getLatestDecision(motorId) : Promise.resolve(null),
      ]);
      setDecisions(decList);
      setSchedules(schedList);
      setLatestDecision(singleDecision);
    } catch (err: any) {
      console.error('Error fetching maintenance info:', err);
      setError(err?.message || 'Failed to fetch maintenance data');
    } finally {
      setLoading(false);
    }
  }, [motorId]);

  useEffect(() => {
    fetchMaintenance();

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`realtime_maintenance_${motorId || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_decisions' },
        () => fetchMaintenance()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_schedules' },
        () => fetchMaintenance()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [motorId, fetchMaintenance]);

  return { latestDecision, decisions, schedules, loading, error, refresh: fetchMaintenance };
}
