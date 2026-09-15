import { supabase, isSupabaseConfigured } from './supabase/client';
import type { MotorSensorData, AIPrediction, MachineHealth } from '../types/database';

export type TimeRange = '1m' | '5m' | '15m' | '1h' | '24h' | 'custom';

export type HealthHistoryPoint = {
  timestamp: string;
  health_index: number;
};

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
      console.error('[LiveMonitoring] motor_sensor_data query failed:', error.message || error);
      throw new Error(error.message);
    }

    if ((!data || data.length === 0) && range !== 'custom') {
      // Fallback: If no records exist in timeframe because backend is offline, fetch latest stored telemetry records
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('motor_sensor_data')
        .select('*')
        .eq('motor_id', motorId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (fallbackError) {
        console.error('[LiveMonitoring] motor_sensor_data fallback query failed:', fallbackError.message || fallbackError);
      }

      if (fallbackData && fallbackData.length > 0) {
        return (fallbackData.reverse()) as MotorSensorData[];
      }
    }

    return (data ?? []) as MotorSensorData[];
  },

  /**
   * Get the newest telemetry record for the selected motor.
   */
  async getLatestTelemetry(
    motorId: string
  ): Promise<MotorSensorData | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('motor_sensor_data')
      .select('*')
      .eq('motor_id', motorId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[LiveMonitoring] motor_sensor_data latest query failed:', error.message || error);
      return null;
    }

    return data as MotorSensorData | null;
  },

  /**
   * Get the newest AI prediction for the selected motor.
   */
  async getLatestPrediction(
    motorId: string
  ): Promise<AIPrediction | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('ai_predictions')
      .select('*')
      .eq('motor_id', motorId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[LiveMonitoring] ai_predictions query failed:', error.message || error);
      return null;
    }

    return data as AIPrediction | null;
  },

  /**
   * Get the newest machine health record for the selected motor.
   */
  async getLatestHealth(
    motorId: string
  ): Promise<MachineHealth | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('machine_health')
      .select('*')
      .eq('motor_id', motorId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[LiveMonitoring] machine_health query failed:', error.message || error);
      return null;
    }

    return data as MachineHealth | null;
  },

  /**
   * Get historical machine-health values for a motor.
   * Used by the Overview health-trend chart.
   */
  async getHealthHistory(
    motorId: string,
    limit = 50
  ): Promise<HealthHistoryPoint[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('machine_health')
      .select('timestamp, health_index')
      .eq('motor_id', motorId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[LiveMonitoring] machine_health history query failed:', error.message || error);
      return [];
    }

    return (data ?? [])
      .slice()
      .reverse()
      .map((row) => ({
        timestamp: row.timestamp,
        health_index: Number(row.health_index ?? 0),
      }));
  },
};