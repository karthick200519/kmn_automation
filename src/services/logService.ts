import { supabase, isSupabaseConfigured } from './supabase/client';
import type { SystemLog } from '../types/database';
import { MOCK_LOGS } from './mockData';

export const logService = {
  async getSystemLogs(limit: number = 50, filterType?: string): Promise<SystemLog[]> {
    if (!isSupabaseConfigured()) {
      return MOCK_LOGS;
    }
    try {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (filterType && filterType !== 'all') {
        query = query.eq('event_type', filterType);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return MOCK_LOGS;
      }

      return data as SystemLog[];
    } catch {
      return MOCK_LOGS;
    }
  },
};

