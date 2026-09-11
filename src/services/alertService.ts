import { supabase, isSupabaseConfigured } from './supabase/client';
import type { Alert } from '../types/database';
import { MOCK_ALERTS } from './mockData';
import { sanitizeErrorMessage } from '../utils/security';

export const alertService = {
  async getActiveAlerts(): Promise<Alert[]> {
    if (!isSupabaseConfigured()) {
      return MOCK_ALERTS;
    }
    try {
      const { data, error } = await supabase
        .from('active_alerts')
        .select('*');

      if (error || !data || data.length === 0) {
        return MOCK_ALERTS;
      }

      return data as Alert[];
    } catch {
      return MOCK_ALERTS;
    }
  },

  async acknowledgeAlert(alertId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) {
        return { success: false, error: sanitizeErrorMessage(error, 'Unable to acknowledge alert.') };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeErrorMessage(err, 'Unable to acknowledge alert.') };
    }
  },

  async resolveAlert(alertId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true };
    }
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'resolved' })
        .eq('id', alertId);

      if (error) {
        return { success: false, error: sanitizeErrorMessage(error, 'Unable to resolve alert.') };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeErrorMessage(err, 'Unable to resolve alert.') };
    }
  },
};

