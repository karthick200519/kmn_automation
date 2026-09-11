import { supabase, isSupabaseConfigured } from './supabase/client';
import type { CurrentMotorStatus } from '../types/database';
import { MOCK_MOTORS } from './mockData';

let localMotors: CurrentMotorStatus[] = [...MOCK_MOTORS];

export const motorService = {
  /**
   * Fetches latest aggregated status for all 3 motors
   */
  async getCurrentMotorStatus(): Promise<CurrentMotorStatus[]> {
    if (!isSupabaseConfigured()) {
      return [...localMotors];
    }
    try {
      const { data, error } = await supabase
        .from('current_motor_status')
        .select('*')
        .order('motor_number', { ascending: true });

      if (error || !data || data.length === 0) {
        return [...localMotors];
      }

      return data as CurrentMotorStatus[];
    } catch {
      return [...localMotors];
    }
  },

  /**
   * Fetches single motor status by motor number or UUID
   */
  async getMotorById(motorIdOrNumber: string | number): Promise<CurrentMotorStatus | null> {
    const all = await this.getCurrentMotorStatus();
    if (typeof motorIdOrNumber === 'number') {
      return all.find((m) => m.motor_number === motorIdOrNumber) || all[0];
    }
    return all.find((m) => m.motor_id === motorIdOrNumber) || all[0];
  },

  /**
   * Admin function to update motor metadata & rated parameters
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
    localMotors = localMotors.map((m) =>
      m.motor_id === motorId
        ? {
            ...m,
            motor_name: updates.motor_name,
            rated_voltage: updates.rated_voltage,
            rated_current: updates.rated_current,
            rated_power: updates.rated_power ?? m.rated_power,
            rated_speed: updates.rated_speed ?? m.rated_speed,
            rated_frequency: updates.rated_frequency ?? m.rated_frequency,
          }
        : m
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', motorId);

      return !error;
    } catch {
      return true;
    }
  },
};


