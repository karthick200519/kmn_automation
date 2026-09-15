import { supabase, isSupabaseConfigured } from './supabase/client';
import type { CurrentMotorStatus, Motor } from '../types/database';
import { FAULT_CLASSES } from '../config/faultClasses';

export const motorService = {
  /**
   * Fetch the latest status for all motors dynamically from Supabase.
   */
  async getCurrentMotorStatus(): Promise<CurrentMotorStatus[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      // Primary asset source: motors table
      const { data: baseMotors, error: baseError } = await supabase
        .from('motors')
        .select('*')
        .order('motor_number', { ascending: true });

      if (baseError) {
        console.error('[Dashboard] motors query failed:', baseError.message || baseError);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Motors from Supabase', baseMotors);
      }

      let activeMotors: Motor[] = (baseMotors as Motor[]) || [];

      if (baseError || activeMotors.length === 0) {
        // Fallback: try querying current_motor_status view if available
        const { data: viewMotors, error: viewError } = await supabase
          .from('current_motor_status')
          .select('*')
          .order('motor_number', { ascending: true });

        if (viewError) {
          console.error('[Dashboard] current_motor_status view query failed:', viewError.message || viewError);
        }

        if (!viewError && viewMotors && viewMotors.length > 0) {
          return viewMotors as CurrentMotorStatus[];
        }

        if (activeMotors.length === 0) {
          console.warn('[Dashboard] Could not query motors table or current_motor_status view from Supabase.');
          return [];
        }
      }

      // For each motor from motors table, independently retrieve newest telemetry, prediction, health, severity, degradation, maintenance decision
      const latestMotors = await Promise.all(
        activeMotors.map(async (m) => {
          const motorId = m.id;

          const fetchSubTable = async (tableName: string) => {
            try {
              const res = await supabase
                .from(tableName)
                .select('*')
                .eq('motor_id', motorId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (res.error) {
                console.error(`[Dashboard] ${tableName} query failed for motor ${m.motor_number}:`, res.error.message || res.error);
              }
              return res.data || null;
            } catch (err: any) {
              console.error(`[Dashboard] ${tableName} query exception for motor ${m.motor_number}:`, err?.message || err);
              return null;
            }
          };

          const [sensor, prediction, severity, health, degradation, maintenance] = await Promise.all([
            fetchSubTable('motor_sensor_data'),
            fetchSubTable('ai_predictions'),
            fetchSubTable('motor_severity'),
            fetchSubTable('machine_health'),
            fetchSubTable('motor_degradation'),
            fetchSubTable('maintenance_decisions'),
          ]);

          if (process.env.NODE_ENV === 'development') {
            console.log(`Motor ${m.motor_number} latest telemetry:`, sensor);
            console.log(`Motor ${m.motor_number} latest predictions:`, prediction);
            console.log(`Motor ${m.motor_number} latest health:`, health);
          }

          // Lookup class name from central faultClasses if class_id is present
          let className = prediction?.class_name;
          if (prediction?.class_id !== undefined && FAULT_CLASSES[prediction.class_id]) {
            className = FAULT_CLASSES[prediction.class_id].class_name;
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
            class_name: className ?? null,
            confidence: prediction?.confidence ?? null,
            model_version: prediction?.model_version ?? null,

            // Severity & Health
            severity: severity?.severity ?? null,
            health_index: health?.health_index ?? null,
            health_status: health?.health_status ?? null,

            // Degradation
            degradation_status: degradation?.degradation_status ?? null,
            degradation_rate: degradation?.degradation_rate ?? null,

            // Maintenance
            maintenance_decision: maintenance?.decision ?? null,
            maintenance_recommendation: maintenance?.recommendation ?? null,
          } as CurrentMotorStatus;
        })
      );

      return latestMotors;
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