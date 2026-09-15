import { useState, useEffect, useCallback } from 'react';
import type { MotorSensorData, AIPrediction, MachineHealth } from '../types/database';
import { monitoringService, type TimeRange } from '../services/monitoringService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useTelemetry(motorId?: string, range: TimeRange = '15m') {
  const [telemetry, setTelemetry] = useState<MotorSensorData[]>([]);
  const [latestData, setLatestData] = useState<MotorSensorData | null>(null);
  const [latestPrediction, setLatestPrediction] = useState<AIPrediction | null>(null);
  const [latestHealth, setLatestHealth] = useState<MachineHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTelemetry = useCallback(async () => {
    if (!motorId) return;
    try {
      setLoading(true);
      setError(null);
      const [series, latestSens, latestPred, latestH] = await Promise.all([
        monitoringService.getTimeSeriesData(motorId, range),
        monitoringService.getLatestTelemetry(motorId),
        monitoringService.getLatestPrediction(motorId),
        monitoringService.getLatestHealth(motorId),
      ]);
      setTelemetry(series);
      if (latestSens) setLatestData(latestSens);
      if (latestPred) setLatestPrediction(latestPred);
      if (latestH) setLatestHealth(latestH);
    } catch (err: any) {
      console.error('[LiveMonitoring] fetchTelemetry exception:', err);
      setError(err?.message || 'Failed to fetch telemetry');
    } finally {
      setLoading(false);
    }
  }, [motorId, range]);

  useEffect(() => {
    fetchTelemetry();

    if (!isSupabaseConfigured() || !motorId) return;

    const channel = supabase
      .channel(`realtime_live_monitoring_${motorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'motor_sensor_data',
          filter: `motor_id=eq.${motorId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRecord = payload.new as MotorSensorData;
            setLatestData(newRecord);
            setTelemetry((prev) => [...prev, newRecord].slice(-300));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_predictions',
          filter: `motor_id=eq.${motorId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setLatestPrediction(payload.new as AIPrediction);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'machine_health',
          filter: `motor_id=eq.${motorId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setLatestHealth(payload.new as MachineHealth);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [motorId, range, fetchTelemetry]);

  return {
    telemetry,
    latestData,
    latestPrediction,
    latestHealth,
    loading,
    error,
    refresh: fetchTelemetry,
  };
}

