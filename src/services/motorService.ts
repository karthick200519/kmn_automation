import { supabase, isSupabaseConfigured } from './supabase/client';
import type { CurrentMotorStatus, Motor } from '../types/database';
import { FAULT_CLASSES } from '../config/faultClasses';

let motorStatusCache: { data: CurrentMotorStatus[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 1000;

export const motorService = {
  /**
   * Fetch the latest status for all motors dynamically from Supabase with high performance caching.
   */
  async getCurrentMotorStatus(forceRefresh = false): Promise<CurrentMotorStatus[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const now = Date.now();
    if (!forceRefresh && motorStatusCache && now - motorStatusCache.timestamp < CACHE_TTL_MS) {
      return motorStatusCache.data;
    }

    try {
      // 1. Primary fast path: Single query on current_motor_status database view
      const { data: viewMotors, error: viewError } = await supabase
        .from('current_motor_status')
        .select('*')
        .order('motor_number', { ascending: true });

      if (!viewError && viewMotors && viewMotors.length > 0) {
        const processed = (viewMotors as any[]).map((m) => {
          let className = m.class_name;
          if (m.class_id !== undefined && m.class_id !== null && FAULT_CLASSES[m.class_id]) {
            className = FAULT_CLASSES[m.class_id].class_name;
          }

          let decision = m.maintenance_decision;
          let recommendation = m.maintenance_recommendation;

          const isCriticalOrFault =
            m.severity === 'critical' ||
            m.severity === 'high' ||
            m.motor_status === 'fault' ||
            m.health_status === 'degraded' ||
            (m.health_index !== null && m.health_index !== undefined && m.health_index < 50);

          const isWarningOrMedium =
            m.severity === 'medium' ||
            m.severity === 'warning' ||
            m.motor_status === 'warning' ||
            m.health_status === 'warning' ||
            (m.health_index !== null && m.health_index !== undefined && m.health_index < 75);

          if (!decision) {
            if (isCriticalOrFault) decision = 'maintenance_required';
            else if (isWarningOrMedium) decision = 'inspection_recommended';
            else decision = 'normal_operation';
          }

          if (!recommendation) {
            const decLower = String(decision).toLowerCase();
            if (decLower.includes('required') || isCriticalOrFault) {
              recommendation = 'Maintenance required: Schedule inspection and service immediately.';
            } else if (decLower.includes('inspection') || isWarningOrMedium) {
              recommendation = 'Inspection recommended: Check lubrication and component wear.';
            } else {
              recommendation = 'No maintenance required.';
            }
          }

          return {
            ...m,
            class_name: className || 'Healthy',
            confidence: m.confidence ?? 0.99,
            maintenance_decision: decision,
            maintenance_recommendation: recommendation,
          } as CurrentMotorStatus;
        });

        motorStatusCache = { data: processed, timestamp: now };
        return processed;
      }

      // 2. High-performance fallback: Parallel batch fetch across all 7 relevant tables
      const [motorsRes, sensorRes, predRes, sevRes, healthRes, degRes, maintRes] = await Promise.all([
        supabase.from('motors').select('*').order('motor_number', { ascending: true }),
        supabase.from('motor_sensor_data').select('*').order('timestamp', { ascending: false }).limit(30),
        supabase.from('ai_predictions').select('*').order('timestamp', { ascending: false }).limit(30),
        supabase.from('motor_severity').select('*').order('timestamp', { ascending: false }).limit(30),
        supabase.from('machine_health').select('*').order('timestamp', { ascending: false }).limit(30),
        supabase.from('motor_degradation').select('*').order('timestamp', { ascending: false }).limit(30),
        supabase.from('maintenance_decisions').select('*').order('timestamp', { ascending: false }).limit(30),
      ]);

      const baseMotors = (motorsRes.data as Motor[]) || [];
      if (baseMotors.length === 0) return [];

      const sensors = (sensorRes.data as any[]) || [];
      const predictions = (predRes.data as any[]) || [];
      const severities = (sevRes.data as any[]) || [];
      const healths = (healthRes.data as any[]) || [];
      const degradations = (degRes.data as any[]) || [];
      const maints = (maintRes.data as any[]) || [];

      const processed = baseMotors.map((m) => {
        const motorId = m.id;
        const sensor = sensors.find((s) => s.motor_id === motorId) || null;
        const prediction = predictions.find((p) => p.motor_id === motorId) || null;
        const severity = severities.find((s) => s.motor_id === motorId) || null;
        const health = healths.find((h) => h.motor_id === motorId) || null;
        const degradation = degradations.find((d) => d.motor_id === motorId) || null;
        const maintenance = maints.find((mn) => mn.motor_id === motorId) || null;

        let className = prediction?.class_name;
        if (prediction?.class_id !== undefined && prediction?.class_id !== null && FAULT_CLASSES[prediction.class_id]) {
          className = FAULT_CLASSES[prediction.class_id].class_name;
        }

        let decision = maintenance?.decision || null;
        let recommendation = maintenance?.recommendation || null;

        const isCriticalOrFault =
          severity?.severity === 'critical' ||
          severity?.severity === 'high' ||
          m.status === 'fault' ||
          health?.health_status === 'degraded' ||
          (health?.health_index !== null && health?.health_index !== undefined && health.health_index < 50);

        const isWarningOrMedium =
          severity?.severity === 'medium' ||
          severity?.severity === 'warning' ||
          m.status === 'warning' ||
          health?.health_status === 'warning' ||
          (health?.health_index !== null && health?.health_index !== undefined && health.health_index < 75);

        if (!decision) {
          if (isCriticalOrFault) decision = 'maintenance_required';
          else if (isWarningOrMedium) decision = 'inspection_recommended';
          else decision = 'normal_operation';
        }

        if (!recommendation) {
          const decLower = String(decision).toLowerCase();
          if (decLower.includes('required') || isCriticalOrFault) {
            recommendation = 'Maintenance required: Schedule inspection and service immediately.';
          } else if (decLower.includes('inspection') || isWarningOrMedium) {
            recommendation = 'Inspection recommended: Check lubrication and component wear.';
          } else {
            recommendation = 'No maintenance required.';
          }
        }

        const newestTime =
          sensor?.timestamp ||
          prediction?.timestamp ||
          health?.timestamp ||
          degradation?.timestamp ||
          maintenance?.timestamp ||
          m.updated_at ||
          null;

        return {
          motor_id: m.id,
          motor_number: m.motor_number,
          motor_name: m.motor_name || `Motor ${m.motor_number}`,
          motor_status: m.status || (health?.health_status ? String(health.health_status).toLowerCase() : 'healthy'),
          rated_voltage: m.rated_voltage || 415,
          rated_current: m.rated_current || null,

          // Sensor Telemetry
          sensor_timestamp: newestTime,
          voltage: sensor?.voltage ?? null,
          current: sensor?.current ?? null,
          temperature: sensor?.temperature ?? null,
          vibration_rms: sensor?.vibration_rms ?? null,
          power: sensor?.power ?? null,
          energy: sensor?.energy ?? null,
          frequency: sensor?.frequency ?? null,
          power_factor: sensor?.power_factor ?? null,
          sensor_source: sensor?.source ?? null,

          // AI Prediction
          class_id: prediction?.class_id ?? null,
          class_name: className || 'Healthy',
          confidence: prediction?.confidence ?? 0.99,
          model_version: prediction?.model_version ?? null,

          // Severity & Health
          severity: severity?.severity ?? null,
          health_index: health?.health_index ?? null,
          health_status: health?.health_status ?? null,

          // Degradation
          degradation_status: degradation?.degradation_status ?? null,
          degradation_rate: degradation?.degradation_rate ?? null,

          // Maintenance
          maintenance_decision: decision,
          maintenance_recommendation: recommendation,
        } as CurrentMotorStatus;
      });

      motorStatusCache = { data: processed, timestamp: now };
      return processed;
    } catch (error) {
      console.error('Failed to fetch current motor status from Supabase:', error);
      return [];
    }
  },

  async getMotorById(motorIdOrNumber: string | number): Promise<CurrentMotorStatus | null> {
    const all = await this.getCurrentMotorStatus();
    if (typeof motorIdOrNumber === 'number') {
      return all.find((m) => m.motor_number === motorIdOrNumber) || null;
    }
    return all.find((m) => m.motor_id === motorIdOrNumber) || null;
  },

  async updateMotorMetadata(
    motorId: string,
    updates: {
      motor_name: string;
      rated_voltage: number;
      rated_current: number;
      rated_power?: number;
      rated_speed?: number;
      rated_frequency?: number;
    }
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }

    try {
      const { error } = await supabase
        .from('motors')
        .update({
          motor_name: updates.motor_name,
          rated_voltage: updates.rated_voltage,
          rated_current: updates.rated_current,
          updated_at: new Date().toISOString(),
        })
        .eq('id', motorId);

      if (error) {
        console.error('Failed to update motor metadata:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Motor metadata update failed:', error);
      return false;
    }
  },
};