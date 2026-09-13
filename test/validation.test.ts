import { describe, it, expect } from 'vitest';
import { loginSchema, controlCommandSchema, emergencyCommandSchema, scheduleSchema } from '../src/utils/validation';

describe('Zod Schema Security Input Validation', () => {
  it('validates correct login credentials', () => {
    const res = loginSchema.safeParse({ email: 'admin@industrial.com', password: 'ValidPassword123!' });
    expect(res.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const res = loginSchema.safeParse({ email: 'invalid-email', password: 'ValidPassword123!' });
    expect(res.success).toBe(false);
  });

  it('rejects short passwords', () => {
    const res = loginSchema.safeParse({ email: 'admin@industrial.com', password: '123' });
    expect(res.success).toBe(false);
  });

  it('rejects extra unexpected fields in control schema', () => {
    const res = controlCommandSchema.safeParse({
      relay_1: true,
      emergency: false,
      extra_malicious_field: 'drop table motors',
    });
    expect(res.success).toBe(false);
  });

  it('requires explicit confirmation for emergency command', () => {
    const unconfirmed = emergencyCommandSchema.safeParse({
      emergency: true,
      confirmation: false,
    });
    expect(unconfirmed.success).toBe(false);

    const confirmed = emergencyCommandSchema.safeParse({
      emergency: true,
      confirmation: true,
    });
    expect(confirmed.success).toBe(true);
  });

  it('validates schedule schema', () => {
    const validSchedule = scheduleSchema.safeParse({
      motor_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Bearing Greasing',
      schedule_type: 'lubrication',
      priority: 'medium',
      status: 'scheduled',
      start_time: '2026-09-13T12:00:00Z',
    });
    expect(validSchedule.success).toBe(true);
  });
});
