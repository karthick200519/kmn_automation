import { createClient } from '@supabase/supabase-js';

// SAFE diagnostic logging only (never prints actual key or secret)
console.log('[SUPABASE BROWSER CONFIG]', {
  project:
    import.meta.env.VITE_SUPABASE_URL
      ? new URL(import.meta.env.VITE_SUPABASE_URL).hostname
      : 'MISSING',
  keyConfigured:
    Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  keyType:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')
      ? 'publishable'
      : 'invalid-or-missing'
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL');
}

if (!supabasePublishableKey) {
  throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY');
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
      supabasePublishableKey &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseUrl.includes('YOUR_SUPABASE_URL') &&
      supabasePublishableKey !== 'placeholder' &&
      supabasePublishableKey !== 'placeholder-key'
  );
};

// Clear any expired or invalid auth token in browser localStorage to prevent HTTP 401 Unauthorized
if (typeof window !== 'undefined' && supabaseUrl && !supabaseUrl.includes('placeholder')) {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    const projectRef = hostname.split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    const item = localStorage.getItem(storageKey);
    if (item) {
      const parsed = JSON.parse(item);
      if (
        !parsed?.access_token ||
        (parsed?.access_token && parsed.access_token.split('.').length !== 3) ||
        (parsed?.expires_at && parsed.expires_at * 1000 < Date.now())
      ) {
        console.warn('[SUPABASE CONFIG] Clearing stale/invalid auth token in localStorage');
        localStorage.removeItem(storageKey);
      }
    }
  } catch (err) {
    console.warn('[SUPABASE CONFIG] Error checking localStorage:', err);
  }
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);

export default supabase;




