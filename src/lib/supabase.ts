import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Safe browser diagnostic logging (never logs complete key)
console.log('[SUPABASE BROWSER CONFIG]', {
  url: SUPABASE_URL
    ? new URL(SUPABASE_URL).hostname
    : 'MISSING',
  publishableConfigured: Boolean(SUPABASE_PUBLISHABLE_KEY),
  publishableType: SUPABASE_PUBLISHABLE_KEY
    ? SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_')
      ? 'sb_publishable'
      : 'other_or_missing'
    : 'MISSING',
});

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_URL &&
      SUPABASE_PUBLISHABLE_KEY &&
      !SUPABASE_URL.includes('placeholder') &&
      !SUPABASE_URL.includes('YOUR_SUPABASE_URL') &&
      SUPABASE_PUBLISHABLE_KEY !== 'placeholder' &&
      SUPABASE_PUBLISHABLE_KEY !== 'placeholder-key'
  );
};

if (!isSupabaseConfigured()) {
  console.warn(
    'Supabase frontend environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) are missing or using placeholders.'
  );
}

// Clean up any stale or invalid auth session in browser localStorage to prevent HTTP 401 Unauthorized
if (typeof window !== 'undefined' && SUPABASE_URL && !SUPABASE_URL.includes('placeholder')) {
  try {
    const hostname = new URL(SUPABASE_URL).hostname;
    const projectRef = hostname.split('.')[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    const item = localStorage.getItem(storageKey);
    if (item) {
      const parsed = JSON.parse(item);
      if (!parsed?.access_token || (parsed?.access_token && parsed.access_token.split('.').length !== 3) || (parsed?.expires_at && parsed.expires_at * 1000 < Date.now())) {
        console.warn('[SUPABASE CONFIG] Expired or invalid auth token found in localStorage. Clearing storageKey:', storageKey);
        localStorage.removeItem(storageKey);
      }
    }
  } catch (err) {
    console.warn('[SUPABASE CONFIG] Failed to parse auth session in localStorage:', err);
  }
}

const effectiveUrl = SUPABASE_URL || 'https://placeholder.supabase.co';
const effectiveKey = SUPABASE_PUBLISHABLE_KEY || 'placeholder-key';

export const supabase = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      apikey: effectiveKey,
      Authorization: `Bearer ${effectiveKey}`,
    },
  },
});

export default supabase;
