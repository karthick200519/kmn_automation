import { supabase, isSupabaseConfigured } from './supabase/client';
import type { MachineHealth, MotorSeverity, MotorDegradation } from '../types/database';

export const healthService = {
  async getLatestHealth(motorId: string): Promise<MachineHealth | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('machine_health')
      .select('*')
      .eq('motor_id', motorId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`Failed to fetch health for motor ${motorId}:`, error);
      return null;
    }
    return data as MachineHealth | null;
  },

  async getLatestSeverity(motorId: string): Promise<MotorSeverity | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('motor_severity')
      .select('*')
      .eq('motor_id', motorId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`Failed to fetch severity for motor ${motorId}:`, error);
      return null;
    }
    return data as MotorSeverity | null;
  },

  async getLatestDegradation(motorId: string): Promise<MotorDegradation | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('motor_degradation')
      .select('*')
      .eq('motor_id', motorId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`Failed to fetch degradation for motor ${motorId}:`, error);
      return null;
    }
    return data as MotorDegradation | null;
  },

  async getHealthHistory(motorId: string, limit = 50): Promise<MachineHealth[]> {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('machine_health')
      .select('*')
      .eq('motor_id', motorId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`Failed to fetch health history for motor ${motorId}:`, error);
      return [];
    }
    return (data ?? []).reverse() as MachineHealth[];
  },
};
