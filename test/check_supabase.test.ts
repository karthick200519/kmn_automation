import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

let testUrl = process.env.SUPABASE_URL || 'https://pdlxrykekhyqesdsmkvs.supabase.co';
let testKey = process.env.SUPABASE_SECRET_KEY || '';

try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      const parts = line.split('=');
      if (parts.length >= 2) {
        const k = parts[0].trim();
        const v = parts.slice(1).join('=').trim();
        if (k === 'SUPABASE_SECRET_KEY' && v) testKey = v;
        if (k === 'SUPABASE_URL' && v) testUrl = v;
      }
    }
  }
} catch {
  // ignore
}

const testClient = createClient(testUrl, testKey);



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
      const { data, error } = await testClient.from(t).select('*').limit(5);
      console.log(`[SUPABASE CHECK] Table '${t}': data length = ${data?.length ?? 0}, error = ${error?.message || 'NONE'}`);
      expect(error).toBeNull();
    });
  }
});
