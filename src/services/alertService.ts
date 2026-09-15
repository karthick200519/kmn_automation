import { supabase } from './supabase/client';
import type { Alert } from '../types/database';
import { sanitizeErrorMessage } from '../utils/security';

export const alertService = {
  async getAlerts(motorId?: string): Promise<Alert[]> {
    try {
      let query = supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false });

      if (motorId) {
        query = query.eq('motor_id', motorId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Dashboard] alerts query failed:', error.message || error);
        throw error;
      }

      return (data || []) as Alert[];
    } catch (err: any) {
      console.error('[Dashboard] alerts query exception:', err?.message || err);
      return [];
    }
  },

  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const { data, error } = await supabase
        .from('active_alerts')
        .select('*');

      if (error) {
        console.error('[Dashboard] active_alerts query failed:', error.message || error);
        throw error;
      }

      return (data || []) as Alert[];
    } catch (err: any) {
      console.error('[Dashboard] active_alerts query exception:', err?.message || err);
      return [];
    }
  },

  async acknowledgeAlert(alertId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
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
        console.error('[Dashboard] alerts acknowledge failed:', error.message || error);
        return { success: false, error: sanitizeErrorMessage(error, 'Unable to acknowledge alert.') };
      }

      return { success: true };
    } catch (err) {
      console.error('[Dashboard] alerts acknowledge exception:', err);
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
        console.error('[Dashboard] alerts resolve failed:', error.message || error);
        return { success: false, error: sanitizeErrorMessage(error, 'Unable to resolve alert.') };
      }

      return { success: true };
    } catch (err) {
      console.error('[Dashboard] alerts resolve exception:', err);
      return { success: false, error: sanitizeErrorMessage(err, 'Unable to resolve alert.') };
    }
  },
};

