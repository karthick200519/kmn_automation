import { supabase, isSupabaseConfigured } from './supabase/client';
import type { CurrentMotorStatus } from '../types/database';
import { MOCK_MOTORS } from './mockData';

let localMotors: CurrentMotorStatus[] = [...MOCK_MOTORS];

export const motorService = {
  /**
   * Fetch the latest status for all motors.
   *
   * The dashboard uses current_motor_status for motor metadata/order,
   * then fetches the newest AI, severity, health, degradation, and
   * maintenance records directly from their respective tables.
   */
  async getCurrentMotorStatus(): Promise<CurrentMotorStatus[]> {
    if (!isSupabaseConfigured()) {
      return [...localMotors];
    }

    try {
      const { data: baseMotors, error: baseError } = await supabase
        .from('current_motor_status')
        .select('*')
        .order('motor_number', { ascending: true });

      if (baseError) {
        throw baseError;
      }

      if (!baseMotors || baseMotors.length === 0) {
        throw new Error('No motor status data found');
      }

      const latestMotors = await Promise.all(
        baseMotors.map(async (motor) => {
          const motorId = motor.motor_id;

          const [
            predictionResult,
            severityResult,
            healthResult,
            degradationResult,
            maintenanceResult,
          ] = await Promise.all([
            supabase
              .from('ai_predictions')
              .select('*')
              .eq('motor_id', motorId)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle(),

            supabase
              .from('motor_severity')
              .select('*')
              .eq('motor_id', motorId)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle(),

            supabase
              .from('machine_health')
              .select('*')
              .eq('motor_id', motorId)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle(),

            supabase
              .from('motor_degradation')
              .select('*')
              .eq('motor_id', motorId)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle(),

            supabase
              .from('maintenance_decisions')
              .select('*')
              .eq('motor_id', motorId)
              .order('timestamp', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          if (predictionResult.error) {
            console.warn(
              `AI prediction fetch failed for motor ${motorId}:`,
              predictionResult.error
            );
          }

          if (severityResult.error) {
            console.warn(
              `Severity fetch failed for motor ${motorId}:`,
              severityResult.error
            );
          }

          if (healthResult.error) {
            console.warn(
              `Health fetch failed for motor ${motorId}:`,
              healthResult.error
            );
          }

          if (degradationResult.error) {
            console.warn(
              `Degradation fetch failed for motor ${motorId}:`,
              degradationResult.error
            );
          }

          if (maintenanceResult.error) {
            console.warn(
              `Maintenance fetch failed for motor ${motorId}:`,
              maintenanceResult.error
            );
          }

          const prediction = predictionResult.data;
          const severity = severityResult.data;
          const health = healthResult.data;
          const degradation = degradationResult.data;
          const maintenance = maintenanceResult.data;

          return {
            ...motor,

            // AI prediction
            class_name:
              prediction?.class_name ??
              motor.class_name ??
              'Healthy',

            confidence:
              prediction?.confidence ??
              motor.confidence ??
              0,

            // Severity
            severity:
              severity?.severity ??
              motor.severity ??
              'low',

            severity_description:
              severity?.description ??
              motor.severity_description ??
              'Normal baseline operation',

            // Machine health
            health_index:
              health?.health_index ??
              motor.health_index ??
              0,

            health_status:
              health?.health_status ??
              motor.health_status ??
              'unknown',

            // Degradation
            degradation_status:
              degradation?.degradation_status ??
              motor.degradation_status ??
              'stable',

            degradation_rate:
              degradation?.degradation_rate ??
              motor.degradation_rate ??
              0,

            // Maintenance
            maintenance_decision:
              maintenance?.decision ??
              motor.maintenance_decision ??
              'Normal operation',

            maintenance_recommendation:
              maintenance?.recommendation ??
              motor.maintenance_recommendation ??
              'Continuous routine telemetry monitoring.',

            // Overall motor status
            motor_status:
              health?.health_status ??
              motor.motor_status ??
              'healthy',

            // Most recent evaluation timestamp
            sensor_timestamp:
              prediction?.timestamp ??
              health?.timestamp ??
              degradation?.timestamp ??
              maintenance?.timestamp ??
              motor.sensor_timestamp,
          } as CurrentMotorStatus;
        })
      );

      return latestMotors;
    } catch (error) {
      console.error(
        'Failed to fetch current motor status from Supabase:',
        error
      );

      // Do NOT silently return mock data when Supabase is configured.
      throw error;
    }
  },

  /**
   * Fetch a single motor by motor number or UUID.
   */
  async getMotorById(
    motorIdOrNumber: string | number
  ): Promise<CurrentMotorStatus | null> {
    const all = await this.getCurrentMotorStatus();

    if (typeof motorIdOrNumber === 'number') {
      return (
        all.find((m) => m.motor_number === motorIdOrNumber) ||
        null
      );
    }

    return (
      all.find((m) => m.motor_id === motorIdOrNumber) ||
      null
    );
  },

  /**
   * Admin function to update motor metadata and rated parameters.
   */
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
    localMotors = localMotors.map((motor) =>
      motor.motor_id === motorId
        ? {
            ...motor,
            motor_name: updates.motor_name,
            rated_voltage: updates.rated_voltage,
            rated_current: updates.rated_current,
            rated_power:
              updates.rated_power ?? motor.rated_power,
            rated_speed:
              updates.rated_speed ?? motor.rated_speed,
            rated_frequency:
              updates.rated_frequency ??
              motor.rated_frequency,
          }
        : motor
    );

    if (!isSupabaseConfigured()) {
      return true;
    }

    try {
      const { error } = await supabase
        .from('motors')
        .update({
          motor_name: updates.motor_name,
          rated_voltage: updates.rated_voltage,
          rated_current: updates.rated_current,
          rated_power: updates.rated_power,
          rated_frequency: updates.rated_frequency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', motorId);

      if (error) {
        console.error(
          'Failed to update motor metadata:',
          error
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        'Motor metadata update failed:',
        error
      );
      return false;
    }
  },
};