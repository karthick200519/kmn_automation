import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimiter } from '../src/utils/rateLimiter';

describe('Exponential Backoff Rate Limiter', () => {
  const ip = '192.168.1.100';
  const email = 'test@industrial.com';

  it('allows initial authentication attempt', () => {
    const check = rateLimiter.checkAuthRateLimit(ip, email);
    expect(check.allowed).toBe(true);
    expect(check.backoffRemainingSeconds).toBe(0);
  });

  it('triggers backoff after repeated failed attempts', () => {
    // Register 5 failed attempts
    for (let i = 0; i < 5; i++) {
      rateLimiter.registerFailedAuth(ip, email);
    }

    const check = rateLimiter.checkAuthRateLimit(ip, email);
    expect(check.allowed).toBe(false);
    expect(check.backoffRemainingSeconds).toBeGreaterThan(0);
  });

  it('resets attempts after successful authentication', () => {
    rateLimiter.registerSuccessfulAuth(ip, email);
    const check = rateLimiter.checkAuthRateLimit(ip, email);
    expect(check.allowed).toBe(true);
  });
});
