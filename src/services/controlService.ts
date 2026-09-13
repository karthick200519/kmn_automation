import { supabase, isSupabaseConfigured } from './supabase/client';
import type { ControlCommand, GpioStatus } from '../types/database';
import { MOCK_GPIO } from './mockData';
import { controlCommandSchema, emergencyCommandSchema } from '../utils/validation';
import { sanitizeErrorMessage } from '../utils/security';
import { rateLimiter } from '../utils/rateLimiter';
import { SECURITY_CONFIG } from '../config/security.config';

export const controlService = {
  /**
   * Fetches physical GPIO status reported by Raspberry Pi
   */
  async getGpioStatus(): Promise<GpioStatus> {
    if (!isSupabaseConfigured()) {
      return MOCK_GPIO;
    }
    try {
      const { data, error } = await supabase
        .from('gpio_status')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return MOCK_GPIO;
      }

      return data as GpioStatus;
    } catch {
      return MOCK_GPIO;
    }
  },

  /**
   * Submits a relay or buzzer command to `control_commands` table
   */
  async sendControlCommand(command: Partial<ControlCommand>, userId?: string): Promise<{ success: boolean; error?: string }> {
    // 1. Rate Limit Enforcement
    const actionKey = `control_${userId || 'anon'}`;
    if (!rateLimiter.checkActionRateLimit(actionKey, SECURITY_CONFIG.CONTROL_COMMAND_LIMIT, 60)) {
      return { success: false, error: 'Control command rate limit exceeded. Please wait a moment.' };
    }

    // 2. Strict Input Validation
    const validation = controlCommandSchema.safeParse({
      motor_id: command.motor_id,
      relay_1: command.relay_1,
      relay_2: command.relay_2,
      relay_3: command.relay_3,
      buzzer: command.buzzer,
      emergency: false,
    });

    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || 'Invalid control command parameters.' };
    }

    if (!isSupabaseConfigured()) {
      if (command.relay_1 !== undefined) MOCK_GPIO.relay_1 = command.relay_1;
      if (command.relay_2 !== undefined) MOCK_GPIO.relay_2 = command.relay_2;
      if (command.relay_3 !== undefined) MOCK_GPIO.relay_3 = command.relay_3;
      if (command.buzzer !== undefined) MOCK_GPIO.buzzer = command.buzzer;
      MOCK_GPIO.timestamp = new Date().toISOString();
      return { success: true };
    }

    try {
      const { error } = await supabase.from('control_commands').insert({
        motor_id: command.motor_id || null,
        requested_by: userId || null,
        relay_1: command.relay_1,
        relay_2: command.relay_2,
        relay_3: command.relay_3,
        buzzer: command.buzzer,
        emergency: false,
        command_status: 'pending',
      });

      if (error) {
        return { success: false, error: sanitizeErrorMessage(error, 'Control command could not be submitted.') };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeErrorMessage(err, 'Control command could not be submitted.') };
    }
  },

  /**
   * Submits an Emergency Command with explicit safety validation
   */
  async issueEmergencyCommand(userId?: string, confirmationConfirmed: boolean = true): Promise<{ success: boolean; error?: string }> {
    // 1. Strict Emergency Validation
    const validation = emergencyCommandSchema.safeParse({
      emergency: true,
      confirmation: confirmationConfirmed,
    });

    if (!validation.success) {
      return { success: false, error: 'Explicit safety confirmation is required to issue emergency stop.' };
    }

    if (!isSupabaseConfigured()) {
      MOCK_GPIO.relay_1 = false;
      MOCK_GPIO.relay_2 = false;
      MOCK_GPIO.relay_3 = false;
      MOCK_GPIO.buzzer = true;
      MOCK_GPIO.emergency = true;
      MOCK_GPIO.timestamp = new Date().toISOString();
      return { success: true };
    }

    try {
      const { error } = await supabase.from('control_commands').insert({
        requested_by: userId || null,
        relay_1: false,
        relay_2: false,
        relay_3: false,
        buzzer: true,
        emergency: true,
        command_status: 'pending',
      });

      if (error) {
        return { success: false, error: sanitizeErrorMessage(error, 'Emergency command could not be issued.') };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeErrorMessage(err, 'Emergency command could not be issued.') };
    }
  },

  /**
   * Resets Emergency Trip state back to normal safe operation
   */
  async resetEmergencyCommand(userId?: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      MOCK_GPIO.emergency = false;
      MOCK_GPIO.buzzer = false;
      MOCK_GPIO.timestamp = new Date().toISOString();
      return { success: true };
    }

    try {
      const { error } = await supabase.from('control_commands').insert({
        requested_by: userId || null,
        relay_1: false,
        relay_2: false,
        relay_3: false,
        buzzer: false,
        emergency: false,
        command_status: 'pending',
      });

      if (error) {
        return { success: false, error: sanitizeErrorMessage(error, 'Emergency reset command could not be issued.') };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: sanitizeErrorMessage(err, 'Emergency reset command could not be issued.') };
    }
  },
};

