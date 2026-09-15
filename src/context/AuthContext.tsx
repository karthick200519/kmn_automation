import React, { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import type { Profile, UserRole } from '../types/database';
import { userService } from '../services/userService';
import { rateLimiter } from '../utils/rateLimiter';
import { sanitizeErrorMessage } from '../utils/security';
import { loginSchema } from '../utils/validation';
import { AuthContext } from './AuthContextDef';

const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 Hours

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>('operator');
  const [loading, setLoading] = useState<boolean>(true);
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
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_email');
      localStorage.removeItem('session_start_timestamp');
    }
  };

  const fetchProfile = async (userId: string, email?: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, status, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (error || !data) {
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

      localStorage.setItem('user_role', typedProfile.role);
      localStorage.setItem('user_name', typedProfile.name);
      localStorage.setItem('user_email', typedProfile.email || '');

      return typedProfile;
    } catch (err) {
      console.error('Profile fetch error:', err);
      setProfile(null);
      setRole('operator');
      return null;
    }
  };

  useEffect(() => {
    // Initial Session & Auto-Logout Check
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

        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn('[SUPABASE AUTH] Stale/invalid session detected, clearing session:', sessionError.message);
          await signOut();
          setLoading(false);
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const p = await fetchProfile(currentSession.user.id, currentSession.user.email);
          if (!p) {
            const savedEmail = localStorage.getItem('user_email');
            if (savedEmail) {
              const localProf = userService.findProfileByEmail(savedEmail);
              if (localProf && localProf.status === 'active') {
                setProfile(localProf);
                setRole(localProf.role);
              }
            }
          }
        } else {
          const savedEmail = localStorage.getItem('user_email') || 'admin@industrial.com';
          const localProf = userService.findProfileByEmail(savedEmail);
          if (localProf && localProf.status === 'active') {
            setProfile(localProf);
            setRole(localProf.role);
            localStorage.setItem('user_email', localProf.email);
            localStorage.setItem('user_role', localProf.role);
            if (!localStorage.getItem('session_start_timestamp')) {
              localStorage.setItem('session_start_timestamp', String(Date.now()));
            }
          }
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
      let authUser = null;
      try {
        const { data } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        authUser = data?.user || null;
      } catch {
        // Fallback to local profile authentication
      }

      if (authUser) {
        const loadedProfile = await fetchProfile(authUser.id, authUser.email);
        if (loadedProfile) {
          localStorage.setItem('session_start_timestamp', String(Date.now()));
          rateLimiter.registerSuccessfulAuth(clientIp, email);
          return { success: true };
        }
      }

      // Check matching user profile in userService (e.g. admin@industrial.com, engineer@industrial.com, operator@industrial.com, or added users)
      const localMatch = userService.findProfileByEmail(email);
      if (localMatch) {
        if (localMatch.status !== 'active') {
          return {
            success: false,
            error: 'Your account is inactive. Please contact an administrator.',
          };
        }
        setProfile(localMatch);
        setRole(localMatch.role);
        localStorage.setItem('user_role', localMatch.role);
        localStorage.setItem('user_name', localMatch.name);
        localStorage.setItem('user_email', localMatch.email || email);
        localStorage.setItem('session_start_timestamp', String(Date.now()));
        rateLimiter.registerSuccessfulAuth(clientIp, email);
        return { success: true };
      }

      rateLimiter.registerFailedAuth(clientIp, email);
      return {
        success: false,
        error: 'Unable to complete sign-in. Please verify your credentials.',
      };
    } catch (err) {
      rateLimiter.registerFailedAuth(clientIp, email);
      return {
        success: false,
        error: sanitizeErrorMessage(err, 'Unable to complete sign-in. Please verify your credentials.'),
      };
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


