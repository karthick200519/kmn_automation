import { supabase } from './supabase/client';
import type { Alert } from '../types/database';
import { sanitizeErrorMessage } from '../utils/security';

export const alertService = {
  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const { data, error } = await supabase
        .from('active_alerts')
        .select('*');

      if (error) {
        throw error;
      }

      return (data || []) as Alert[];
    } catch (err) {
      console.error('Failed to load active alerts:', err);
      throw new Error(sanitizeErrorMessage(err, 'Unable to load active alerts.'));
    }
  },

  async acknowledgeAlert(alertId: string, userId: string): Promise<{ success: boolean; error?: string }> {
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
