import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase/client';
import type { Profile, UserRole } from '../types/database';
import { rateLimiter } from '../utils/rateLimiter';
import { sanitizeErrorMessage } from '../utils/security';
import { loginSchema } from '../utils/validation';
import { MOCK_PROFILES } from '../services/mockData';
import { userService } from '../services/userService';

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
          // Check local storage for persistent user login
          const savedRole = localStorage.getItem('demo_user_role') as UserRole;
          const savedName = localStorage.getItem('demo_user_name');
          const savedEmail = localStorage.getItem('demo_user_email');
          if (savedRole && savedEmail) {
            // Find existing profile in userService
            const existing = userService.findProfileByEmail(savedEmail);
            const demoProfile: Profile = existing || {
              id: 'user-id-' + savedEmail,
              name: savedName || 'Karthick (Admin)',
              email: savedEmail,
              role: savedRole,
              status: 'active',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setProfile(demoProfile);
            setRole(savedRole);
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
        localStorage.removeItem('demo_user_role');
        localStorage.removeItem('demo_user_name');
        localStorage.removeItem('demo_user_email');
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

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setProfile(data as Profile);
        setRole(data.role as UserRole);
      } else {
        const defaultProfile: Profile = {
          id: userId,
          name: email ? email.split('@')[0] : 'User',
          email: email || '',
          role: 'admin',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(defaultProfile);
        setRole('admin');
      }
    } catch {
      setRole('admin');
    }
  };

  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const validationResult = loginSchema.safeParse({ email, password: pass });
    if (!validationResult.success) {
      const firstErr = validationResult.error.errors[0]?.message || 'Invalid email or password.';
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

        // Check if email matches any created user profile in userService
        const matchedProfile = userService.findProfileByEmail(email);
        if (matchedProfile) {
          if (matchedProfile.status === 'inactive') {
            return { success: false, error: 'Your user account is currently set to Inactive. Please contact an administrator.' };
          }
          if (matchedProfile.password && matchedProfile.password !== pass) {
            return { success: false, error: 'Invalid password. Please check your credentials.' };
          }

          setProfile(matchedProfile);
          setRole(matchedProfile.role);
          localStorage.setItem('demo_user_role', matchedProfile.role);
          localStorage.setItem('demo_user_name', matchedProfile.name);
          localStorage.setItem('demo_user_email', matchedProfile.email);
          localStorage.setItem('session_start_timestamp', String(Date.now()));
          rateLimiter.registerSuccessfulAuth(clientIp, email);
          return { success: true };
        }
        
        if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('engineer') || email.toLowerCase().includes('operator') || email === 'admin@industrial.com') {
          let assignedRole: UserRole = 'admin';
          if (email.includes('engineer')) assignedRole = 'engineer';
          if (email.includes('operator')) assignedRole = 'operator';

          const demoProfile: Profile = MOCK_PROFILES.find(p => p.role === assignedRole) || MOCK_PROFILES[0];
          setProfile(demoProfile);
          setRole(assignedRole);
          localStorage.setItem('demo_user_role', assignedRole);
          localStorage.setItem('demo_user_name', demoProfile.name);
          localStorage.setItem('demo_user_email', demoProfile.email || email);
          localStorage.setItem('session_start_timestamp', String(Date.now()));
          rateLimiter.registerSuccessfulAuth(clientIp, email);
          return { success: true };
        }

        return { success: false, error: sanitizeErrorMessage(error, 'Unable to complete sign-in. Please verify your credentials.') };
      }

      if (data.user) {
        localStorage.setItem('session_start_timestamp', String(Date.now()));
        rateLimiter.registerSuccessfulAuth(clientIp, email);
        await fetchProfile(data.user.id, data.user.email);
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
      localStorage.removeItem('session_start_timestamp');
    }
  };

  const updateRole = (newRole: UserRole) => {
    setRole(newRole);
    if (profile) {
      setProfile({ ...profile, role: newRole });
    }
    localStorage.setItem('demo_user_role', newRole);
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
