import { supabase, isSupabaseConfigured } from './supabase/client';
import type { DataSourceMode, SystemSetting } from '../types/database';
import { sanitizeErrorMessage } from '../utils/security';

export const settingsService = {
  async getDataSourceMode(): Promise<DataSourceMode> {
    if (!isSupabaseConfigured()) {
      const localMode = localStorage.getItem('data_source_mode') as DataSourceMode;
      return localMode || 'demo';
    }
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'data_source_mode')
        .single();

      if (error || !data) {
        const localMode = localStorage.getItem('data_source_mode') as DataSourceMode;
        return localMode || 'demo';
      }

      return (data.setting_value?.mode as DataSourceMode) || 'demo';
    } catch {
      const localMode = localStorage.getItem('data_source_mode') as DataSourceMode;
      return localMode || 'demo';
    }
  },

  async setDataSourceMode(mode: DataSourceMode, userId?: string): Promise<{ success: boolean; error?: string }> {
    localStorage.setItem('data_source_mode', mode);
    if (!isSupabaseConfigured()) {
      return { success: true };
    }
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'data_source_mode',
          setting_value: { mode },
          description: 'Operational data source mode: demo (synthetic data) or live (Raspberry Pi RS-485 Modbus)',
          updated_by: userId || null,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return { success: false, error: sanitizeErrorMessage(error, 'Unable to update data source mode.') };
      }

      return { success: true };
    } catch {
      return { success: true };
    }
  },
};

