import { supabase, isSupabaseConfigured } from './supabase/client';
import type { MotorSensorData } from '../types/database';

export type TimeRange = '1m' | '5m' | '15m' | '1h' | '24h' | 'custom';

export const monitoringService = {
  /**
   * Fetches time-series telemetry data for a specific motor within a timeframe
   */
  async getTimeSeriesData(
    motorId: string,
    range: TimeRange = '15m',
    customFrom?: string,
    customTo?: string
  ): Promise<MotorSensorData[]> {
    if (!isSupabaseConfigured()) {
      return this.generateMockTimeSeries(range);
    }
    try {
      let fromDate = new Date();
      if (range === '1m') fromDate.setMinutes(fromDate.getMinutes() - 1);
      else if (range === '5m') fromDate.setMinutes(fromDate.getMinutes() - 5);
      else if (range === '15m') fromDate.setMinutes(fromDate.getMinutes() - 15);
      else if (range === '1h') fromDate.setHours(fromDate.getHours() - 1);
      else if (range === '24h') fromDate.setHours(fromDate.getHours() - 24);
      else if (range === 'custom' && customFrom) fromDate = new Date(customFrom);

      let query = supabase
        .from('motor_sensor_data')
        .select('*')
        .eq('motor_id', motorId)
        .gte('timestamp', fromDate.toISOString())
        .order('timestamp', { ascending: true })
        .limit(300);

      if (range === 'custom' && customTo) {
        query = query.lte('timestamp', new Date(customTo).toISOString());
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return this.generateMockTimeSeries(range);
      }

      return data as MotorSensorData[];
    } catch {
      return this.generateMockTimeSeries(range);
    }
  },


  /**
   * Generates realistic synthetic telemetry points if DB returns empty
   */
  generateMockTimeSeries(range: TimeRange): MotorSensorData[] {
    const points: MotorSensorData[] = [];
    const count = 30;
    const now = Date.now();
    const intervalMs = range === '1m' ? 2000 : range === '5m' ? 10000 : range === '15m' ? 30000 : 120000;

    for (let i = count; i >= 0; i--) {
      const ts = new Date(now - i * intervalMs).toISOString();
      const randV = 414 + Math.sin(i / 2) * 2 + (Math.random() - 0.5);
      const randI = 14.8 + Math.cos(i / 3) * 1.5 + (Math.random() - 0.5);
      const randT = 42 + (count - i) * 0.2 + (Math.random() - 0.5);
      const randVib = 1.2 + (count - i) * 0.05 + (Math.random() - 0.5) * 0.2;

      points.push({
        id: `pts-${i}`,
        motor_id: 'mock-motor-1',
        timestamp: ts,
        voltage: Number(randV.toFixed(1)),
        current: Number(randI.toFixed(2)),
        temperature: Number(randT.toFixed(1)),
        vibration_rms: Number(Math.max(0.1, randVib).toFixed(3)),
        power: Number((randV * randI * 1.732 * 0.9 / 1000).toFixed(2)),
        energy: Number((1450 + (count - i) * 0.1).toFixed(1)),
        frequency: 50.0,
        power_factor: 0.91,
        data_quality: 'valid',
        source: 'sample',
        created_at: ts,
      });
    }

    return points;
  },
};
