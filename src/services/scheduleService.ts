import { supabase, isSupabaseConfigured } from './supabase/client';
import type { MaintenanceSchedule } from '../types/database';
import { MOCK_SCHEDULES } from './mockData';
import { scheduleSchema } from '../utils/validation';
import { sanitizeErrorMessage } from '../utils/security';

export const scheduleService = {
  async getSchedules(): Promise<MaintenanceSchedule[]> {
    if (!isSupabaseConfigured()) {
      return MOCK_SCHEDULES;
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

        if (rawError || !rawData || rawData.length === 0) {
          return MOCK_SCHEDULES;
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
      return MOCK_SCHEDULES;
    }
  },

  async createSchedule(schedule: Omit<MaintenanceSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> {
    // 1. Zod Schema Validation
    const validation = scheduleSchema.safeParse(schedule);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || 'Invalid schedule data.' };
    }

    if (!isSupabaseConfigured()) {
      const motorNumberMap: Record<string, number> = {
        'a1111111-1111-1111-1111-111111111111': 1,
        'b2222222-2222-2222-2222-222222222222': 2,
        'c3333333-3333-3333-3333-333333333333': 3,
      };
      const motorNum = motorNumberMap[schedule.motor_id] || 1;
      const newSchedule: MaintenanceSchedule = {
        ...schedule,
        id: `s-${Date.now()}`,
        motor_number: motorNum,
        motor_name: `Motor ${motorNum}`,
        assigned_to_name: schedule.assigned_to_name || 'Sarah Chen (Engineer)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_SCHEDULES.unshift(newSchedule);
      return { success: true };
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
      const item = MOCK_SCHEDULES.find((s) => s.id === scheduleId);
      if (item) {
        item.status = status as any;
        item.updated_at = new Date().toISOString();
      }
      return { success: true };
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
      const index = MOCK_SCHEDULES.findIndex((s) => s.id === scheduleId);
      if (index !== -1) {
        MOCK_SCHEDULES.splice(index, 1);
      }
      return { success: true };
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

