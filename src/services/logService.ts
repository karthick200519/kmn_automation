import { supabase } from './supabase/client';
import type { SystemLog } from '../types/database';

export const logService = {
  async getSystemLogs(
    limit: number = 50,
    filterType?: string
  ): Promise<SystemLog[]> {
    let query = supabase
      .from('system_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (filterType && filterType !== 'all') {
      query = query.eq('event_type', filterType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('System logs query error:', error);
      throw new Error(error.message);
    }

    return (data ?? []) as SystemLog[];
  },
};