import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import type { Profile, UserRole } from '../types/database';
import { rateLimiter } from '../utils/rateLimiter';
import { sanitizeErrorMessage } from '../utils/security';
import { loginSchema } from '../utils/validation';

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 Hours

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>('operator');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Initial Session & 2-Hour Auto-Logout Check
    const initAuth = async () => {
      try {
        const storedLoginTime = localStorage.getItem('session_start_timestamp');
        if (storedLoginTime) {
          const elapsed = Date.now() - Number(storedLoginTime);
          if (elapsed >= SESSION_TIMEOUT_MS) {
            await signOut();
            setLoading(false);
            return;
          }
        }

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id, currentSession.user.email);
        } else {
          // No authenticated Supabase session: do not restore demo/local users.
          setProfile(null);
          setRole('operator');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === 'SIGNED_IN' && currentSession?.user) {
        localStorage.setItem('session_start_timestamp', String(Date.now()));
        await fetchProfile(currentSession.user.id, currentSession.user.email);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setRole('operator');
        localStorage.removeItem('demo_user_role');
        localStorage.removeItem('demo_user_name');
        localStorage.removeItem('demo_user_email');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_email');
        localStorage.removeItem('session_start_timestamp');
      }
    });

    // Interval to check 2-hour inactivity/expiry every 30 seconds
    const interval = setInterval(() => {
      const storedLoginTime = localStorage.getItem('session_start_timestamp');
      if (storedLoginTime) {
        const elapsed = Date.now() - Number(storedLoginTime);
        if (elapsed >= SESSION_TIMEOUT_MS) {
          signOut();
        }
      }
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const fetchProfile = async (userId: string, email?: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, status, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Profile lookup failed:', error);
        setProfile(null);
        setRole('operator');
        return null;
      }

      if (data.status !== 'active') {
        console.warn('Authenticated user profile is inactive:', email || data.email);
        await supabase.auth.signOut();
        setProfile(null);
        setRole('operator');
        return null;
      }

      const typedProfile = data as Profile;

      setProfile(typedProfile);
      setRole(typedProfile.role as UserRole);

      // Store only non-sensitive display state. Supabase remains the source of authentication truth.
      localStorage.setItem('user_role', typedProfile.role);
      localStorage.setItem('user_name', typedProfile.name);
      localStorage.setItem('user_email', typedProfile.email);

      return typedProfile;
    } catch (err) {
      console.error('Profile fetch error:', err);
      setProfile(null);
      setRole('operator');
      return null;
    }
  };

  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const validationResult = loginSchema.safeParse({ email, password: pass });
    if (!validationResult.success) {
      const firstErr = validationResult.error.issues[0]?.message || 'Invalid email or password.';
      return { success: false, error: firstErr };
    }

    const clientIp = '127.0.0.1';

    const rateCheck = rateLimiter.checkAuthRateLimit(clientIp, email);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Please wait ${rateCheck.backoffRemainingSeconds} seconds before trying again.`,
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        rateLimiter.registerFailedAuth(clientIp, email);

        return {
          success: false,
          error: sanitizeErrorMessage(
            error,
            'Unable to complete sign-in. Please verify your credentials.'
          ),
        };
      }
      if (data.user) {
        const loadedProfile = await fetchProfile(data.user.id, data.user.email);

        if (!loadedProfile) {
          await supabase.auth.signOut();

          return {
            success: false,
            error: 'Unable to load your user profile. Please contact an administrator.',
          };
        }

        localStorage.setItem('session_start_timestamp', String(Date.now()));
        rateLimiter.registerSuccessfulAuth(clientIp, email);

        return { success: true };
      }

      return { success: false, error: 'Unable to complete sign-in. Please try again.' };
    } catch (err) {
      rateLimiter.registerFailedAuth(clientIp, email);
      return { success: false, error: sanitizeErrorMessage(err, 'Unable to complete sign-in. Please verify your credentials.') };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole('operator');
      localStorage.removeItem('demo_user_role');
      localStorage.removeItem('demo_user_name');
      localStorage.removeItem('demo_user_email');
      localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_email');
        localStorage.removeItem('session_start_timestamp');
    }
  };

  const updateRole = (newRole: UserRole) => {
    setRole(newRole);
    if (profile) {
      setProfile({ ...profile, role: newRole });
    }
    localStorage.setItem('user_role', newRole);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, session, loading, signIn, signOut, updateRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
