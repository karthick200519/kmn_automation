/**
 * Centralized Rate Limiting & Security Configuration
 * Strictly enforced client-side and server-side across authentication and sensitive control actions.
 */

export const SECURITY_CONFIG = {
  // Authentication limits (strict protection against brute-force / enumeration)
  AUTH_LOGIN_IP_LIMIT: 5,            // Max attempts per IP per window
  AUTH_LOGIN_ACCOUNT_LIMIT: 3,       // Max attempts per email per window
  AUTH_SIGNUP_LIMIT: 3,              // Max signups per IP per window
  AUTH_PASSWORD_RESET_LIMIT: 3,      // Max password reset attempts
  AUTH_WINDOW_MINUTES: 15,           // Window duration in minutes

  // Backoff parameters
  BACKOFF_BASE_SECONDS: 5,           // Initial backoff duration
  BACKOFF_MAX_SECONDS: 300,          // Maximum cap for backoff (5 min)

  // Public vs Authenticated endpoints limits
  PUBLIC_ENDPOINT_LIMIT: 60,        // Requests per minute
  AUTHENTICATED_ACTION_LIMIT: 120,   // Requests per minute

  // Sensitive operation rate limits (per minute)
  CONTROL_COMMAND_LIMIT: 10,         // Max relay/buzzer/emergency commands per minute
  SCHEDULE_ACTION_LIMIT: 20,         // Max schedule creations/edits per minute
  ALERT_ACTION_LIMIT: 30,            // Max alert acknowledgements per minute
  REPORT_GENERATION_LIMIT: 5,        // Max report exports per minute
  USER_MGMT_LIMIT: 10,               // Max user management changes per minute

  // Input validation limits
  MAX_STRING_LENGTH: 500,
  MAX_TEXT_AREA_LENGTH: 2000,
  MAX_EMAIL_LENGTH: 254,
  MIN_PASSWORD_LENGTH: 8,
};
