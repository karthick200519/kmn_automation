import { supabase, isSupabaseConfigured } from './supabase/client';
import type { MotorSensorData } from '../types/database';

export type TimeRange = '1m' | '5m' | '15m' | '1h' | '24h' | 'custom';

export const monitoringService = {
  /**
   * Get historical/time-series telemetry for a motor.
   */
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

    switch (range) {
      case '1m':
        fromDate.setMinutes(fromDate.getMinutes() - 1);
        break;

      case '5m':
        fromDate.setMinutes(fromDate.getMinutes() - 5);
        break;

      case '15m':
        fromDate.setMinutes(fromDate.getMinutes() - 15);
        break;

      case '1h':
        fromDate.setHours(fromDate.getHours() - 1);
        break;

      case '24h':
        fromDate.setHours(fromDate.getHours() - 24);
        break;

      case 'custom':
        if (customFrom) {
          fromDate = new Date(customFrom);
        }
        break;
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
      console.error('Telemetry query error:', error);
      throw new Error(error.message);
    }

    return (data ?? []) as MotorSensorData[];
  },

  /**
   * Get the newest telemetry record for the selected motor.
   * This is used for the live-value cards.
   */
  async getLatestTelemetry(
    motorId: string
  ): Promise<MotorSensorData | null> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase
      .from('motor_sensor_data')
      .select('*')
      .eq('motor_id', motorId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Latest telemetry query error:', error);
      throw new Error(error.message);
    }

    return data as MotorSensorData | null;
  },
};