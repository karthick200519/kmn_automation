import { supabase, isSupabaseConfigured } from './supabase/client';
import type { MotorSensorData } from '../types/database';

export type TimeRange = '1m' | '5m' | '15m' | '1h' | '24h' | 'custom';

export const monitoringService = {
  async getTimeSeriesData(
    motorId: string,
    range: TimeRange = '15m',
    customFrom?: string,
    customTo?: string
  ): Promise<MotorSensorData[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    let fromDate = new Date();

    if (range === '1m') {
      fromDate.setMinutes(fromDate.getMinutes() - 1);
    } else if (range === '5m') {
      fromDate.setMinutes(fromDate.getMinutes() - 5);
    } else if (range === '15m') {
      fromDate.setMinutes(fromDate.getMinutes() - 15);
    } else if (range === '1h') {
      fromDate.setHours(fromDate.getHours() - 1);
    } else if (range === '24h') {
      fromDate.setHours(fromDate.getHours() - 24);
    } else if (range === 'custom' && customFrom) {
      fromDate = new Date(customFrom);
    }

    let query = supabase
      .from('motor_sensor_data')
      .select('*')
      .eq('motor_id', motorId)
      .gte('timestamp', fromDate.toISOString())
      .order('timestamp', { ascending: true })
      .limit(300);

    if (range === 'custom' && customTo) {
      query = query.lte(
        'timestamp',
        new Date(customTo).toISOString()
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as MotorSensorData[];
  },
};