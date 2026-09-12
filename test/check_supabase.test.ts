import { describe, it, expect } from 'vitest';
import { supabase } from '../src/services/supabase/client';

describe('Supabase Database & Views Connectivity Test', () => {
  const tables = [
    'motors',
    'motor_sensor_data',
    'ai_predictions',
    'motor_severity',
    'machine_health',
    'motor_degradation',
    'maintenance_decisions',
    'maintenance_schedules',
    'alerts',
    'control_commands',
    'gpio_status',
    'system_logs',
    'system_settings',
    'profiles',
    'current_motor_status',
    'upcoming_maintenance',
    'active_alerts',
  ];

  for (const t of tables) {
    it(`should query ${t} without database errors`, async () => {
      const { data, error } = await supabase.from(t).select('*').limit(5);
      console.log(`[SUPABASE CHECK] Table '${t}': data length = ${data?.length ?? 0}, error = ${error?.message || 'NONE'}`);
      expect(error).toBeNull();
    });
  }
});
