import { supabase, isSupabaseConfigured } from './supabase/client';
import type { MaintenanceDecisionRecord, MaintenanceSchedule } from '../types/database';

export const maintenanceService = {
  async getLatestDecision(motorId: string): Promise<MaintenanceDecisionRecord | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('maintenance_decisions')
      .select('*')
      .eq('motor_id', motorId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`Failed to fetch maintenance decision for motor ${motorId}:`, error);
      return null;
    }
    return data as MaintenanceDecisionRecord | null;
  },

  async getAllDecisions(): Promise<MaintenanceDecisionRecord[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('maintenance_decisions')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to fetch maintenance decisions:', error);
      return [];
    }
    return (data ?? []) as MaintenanceDecisionRecord[];
  },

  async getSchedules(motorId?: string): Promise<MaintenanceSchedule[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase
      .from('maintenance_schedules')
      .select('*')
      .order('start_time', { ascending: true });

    if (motorId && motorId !== 'all') {
      query = query.eq('motor_id', motorId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to fetch maintenance schedules:', error);
      return [];
    }
    return (data ?? []) as MaintenanceSchedule[];
  },
};
