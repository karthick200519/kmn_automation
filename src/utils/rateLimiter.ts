import { SECURITY_CONFIG } from '../config/security.config';

interface AttemptRecord {
  count: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
  blockedUntil: number;
  consecutiveFailures: number;
}

class RateLimiterService {
  private ipAttempts: Map<string, AttemptRecord> = new Map();
  private accountAttempts: Map<string, AttemptRecord> = new Map();
  private actionAttempts: Map<string, AttemptRecord> = new Map();

  /**
   * Evaluates authentication attempt for both IP and Account identifier
   * Returns { allowed: boolean, backoffRemainingSeconds: number, message?: string }
   */
  public checkAuthRateLimit(ip: string, email: string): { allowed: boolean; backoffRemainingSeconds: number; message?: string } {
    const now = Date.now();
    const cleanEmail = email.toLowerCase().trim();

    const ipRecord = this.getOrCreateRecord(this.ipAttempts, ip, now);
    const accountRecord = this.getOrCreateRecord(this.accountAttempts, cleanEmail, now);

    // Check IP block
    if (ipRecord.blockedUntil > now) {
      const remainingSeconds = Math.ceil((ipRecord.blockedUntil - now) / 1000);
      return {
        allowed: false,
        backoffRemainingSeconds: remainingSeconds,
        message: 'Unable to complete sign-in. Please try again later.',
      };
    }

    // Check Account block
    if (accountRecord.blockedUntil > now) {
      const remainingSeconds = Math.ceil((accountRecord.blockedUntil - now) / 1000);
      return {
        allowed: false,
        backoffRemainingSeconds: remainingSeconds,
        message: 'Unable to complete sign-in. Please try again later.',
      };
    }

    return { allowed: true, backoffRemainingSeconds: 0 };
  }

  /**
   * Registers a failed authentication attempt and calculates exponential backoff
   */
  public registerFailedAuth(ip: string, email: string): number {
    const now = Date.now();
    const cleanEmail = email.toLowerCase().trim();

    const ipRecord = this.getOrCreateRecord(this.ipAttempts, ip, now);
    const accountRecord = this.getOrCreateRecord(this.accountAttempts, cleanEmail, now);

    ipRecord.count += 1;
    ipRecord.consecutiveFailures += 1;
    ipRecord.lastAttemptTime = now;

    accountRecord.count += 1;
    accountRecord.consecutiveFailures += 1;
    accountRecord.lastAttemptTime = now;

    let backoffSeconds = 0;

    // Apply backoff if thresholds exceeded
    if (
      ipRecord.count >= SECURITY_CONFIG.AUTH_LOGIN_IP_LIMIT ||
      accountRecord.count >= SECURITY_CONFIG.AUTH_LOGIN_ACCOUNT_LIMIT
    ) {
      const failures = Math.max(ipRecord.consecutiveFailures, accountRecord.consecutiveFailures);
      // Exponential backoff: base * 2^(failures - threshold)
      const multiplier = Math.pow(2, Math.max(0, failures - 3));
      backoffSeconds = Math.min(
        SECURITY_CONFIG.BACKOFF_BASE_SECONDS * multiplier,
        SECURITY_CONFIG.BACKOFF_MAX_SECONDS
      );

      const blockTime = now + backoffSeconds * 1000;
      ipRecord.blockedUntil = blockTime;
      accountRecord.blockedUntil = blockTime;
    }

    return backoffSeconds;
  }

  /**
   * Clears attempts upon successful authentication
   */
  public registerSuccessfulAuth(ip: string, email: string): void {
    const cleanEmail = email.toLowerCase().trim();
    this.ipAttempts.delete(ip);
    this.accountAttempts.delete(cleanEmail);
  }

  /**
   * Generic rate limit check for actions (Control Commands, Schedule updates, etc.)
   */
  public checkActionRateLimit(actionKey: string, limit: number, windowSeconds: number = 60): boolean {
    const now = Date.now();
    const record = this.getOrCreateRecord(this.actionAttempts, actionKey, now);

    if (now - record.firstAttemptTime > windowSeconds * 1000) {
      record.count = 1;
      record.firstAttemptTime = now;
      return true;
    }

    if (record.count >= limit) {
      return false;
    }

    record.count += 1;
    return true;
  }

  private getOrCreateRecord(map: Map<string, AttemptRecord>, key: string, now: number): AttemptRecord {
    let record = map.get(key);
    const windowMs = SECURITY_CONFIG.AUTH_WINDOW_MINUTES * 60 * 1000;

    if (!record || now - record.firstAttemptTime > windowMs) {
      record = {
        count: 0,
        firstAttemptTime: now,
        lastAttemptTime: now,
        blockedUntil: 0,
        consecutiveFailures: 0,
      };
      map.set(key, record);
    }
    return record;
  }
}

export const rateLimiter = new RateLimiterService();
