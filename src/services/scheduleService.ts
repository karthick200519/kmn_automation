import { supabase, isSupabaseConfigured } from './supabase/client';
import type { MaintenanceSchedule } from '../types/database';
import { scheduleSchema } from '../utils/validation';
import { sanitizeErrorMessage } from '../utils/security';

export const scheduleService = {
  async getSchedules(): Promise<MaintenanceSchedule[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }
    try {
      const { data, error } = await supabase
        .from('upcoming_maintenance')
        .select('*')
        .order('start_time', { ascending: true });

      if (error || !data || data.length === 0) {
        // Fallback to table query
        const { data: rawData, error: rawError } = await supabase
          .from('maintenance_schedules')
          .select('*, motors(motor_name, motor_number), profiles!maintenance_schedules_assigned_to_fkey(name)')
          .order('start_time', { ascending: true });

        if (rawError || !rawData) {
          return [];
        }

        return rawData.map((s: any) => ({
          ...s,
          motor_name: s.motors?.motor_name,
          motor_number: s.motors?.motor_number,
          assigned_to_name: s.profiles?.name,
        }));
      }

      return data as MaintenanceSchedule[];
    } catch {
      return [];
    }
  },

  async createSchedule(schedule: Omit<MaintenanceSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> {
    const validation = scheduleSchema.safeParse(schedule);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid schedule data.' };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      const { error } = await supabase.from('maintenance_schedules').insert({
        motor_id: schedule.motor_id,
        title: schedule.title,
        schedule_type: schedule.schedule_type,
        description: schedule.description,
        assigned_to: schedule.assigned_to,
        priority: schedule.priority,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        status: schedule.status || 'scheduled',
        notes: schedule.notes,
        created_by: schedule.created_by,
      });

      if (error) {
        return { success: false, error: sanitizeErrorMessage(error, 'Unable to save the maintenance schedule.') };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeErrorMessage(err, 'Unable to save the maintenance schedule.') };
    }
  },

  async updateScheduleStatus(scheduleId: string, status: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    try {
      const { error } = await supabase
        .from('maintenance_schedules')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', scheduleId);

      if (error) {
        return { success: false, error: sanitizeErrorMessage(error, 'Unable to update schedule status.') };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeErrorMessage(err, 'Unable to update schedule status.') };
    }
  },

  async deleteSchedule(scheduleId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured.' };
    }
    try {
      const { error } = await supabase.from('maintenance_schedules').delete().eq('id', scheduleId);
      if (error) {
        return { success: false, error: sanitizeErrorMessage(error, 'Unable to delete maintenance schedule.') };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeErrorMessage(err, 'Unable to delete maintenance schedule.') };
    }
  },
};
