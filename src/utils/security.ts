/**
 * Security & Sanitization Utility
 * Ensures generic user-facing errors while preserving structured internal diagnostic logs.
 */

export const sanitizeErrorMessage = (error: any, defaultContextMsg: string = 'Unable to complete the requested operation.'): string => {
  if (!error) return defaultContextMsg;

  // Log raw detailed diagnostic internally in browser devtools / console (structured)
  console.error('[Internal Security Audit Log]', {
    timestamp: new Date().toISOString(),
    error,
  });

  const rawMessage = typeof error === 'string' ? error : error.message || '';

  // Specific generic fallbacks
  if (rawMessage.toLowerCase().includes('invalid login credentials') || rawMessage.toLowerCase().includes('invalid email or password')) {
    return 'Unable to complete sign-in. Please verify your credentials.';
  }

  if (rawMessage.toLowerCase().includes('rate limit') || rawMessage.toLowerCase().includes('too many requests')) {
    return 'Unable to complete request. Rate limit exceeded. Please wait and try again.';
  }

  if (rawMessage.toLowerCase().includes('permission') || rawMessage.toLowerCase().includes('unauthorized') || rawMessage.toLowerCase().includes('forbidden')) {
    return 'Your account does not have permission to perform this action.';
  }

  // Catch-all generic error message to prevent accidental stack trace or DB schema leakage
  return defaultContextMsg;
};

/**
 * Escapes HTML characters for high-risk text fields
 */
export const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
