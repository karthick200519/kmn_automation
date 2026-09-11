import { supabase, isSupabaseConfigured } from './supabase/client';
import type { Profile, UserRole, UserStatus } from '../types/database';
import { MOCK_PROFILES } from './mockData';

const CUSTOM_PROFILES_KEY = 'kmn_custom_profiles';

const loadStoredProfiles = (): Profile[] => {
  try {
    const customJson = localStorage.getItem(CUSTOM_PROFILES_KEY);
    if (customJson) {
      const custom: Profile[] = JSON.parse(customJson);
      const existingEmails = new Set(MOCK_PROFILES.map((p) => p.email?.toLowerCase()));
      const filteredCustom = custom.filter((c) => !existingEmails.has(c.email?.toLowerCase()));
      return [...filteredCustom, ...MOCK_PROFILES];
    }
  } catch {
    // fallback
  }
  return [...MOCK_PROFILES];
};

const saveCustomProfiles = (profiles: Profile[]) => {
  try {
    const customOnly = profiles.filter(
      (p) => !MOCK_PROFILES.some((m) => m.id === p.id || m.email?.toLowerCase() === p.email?.toLowerCase())
    );
    localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(customOnly));
  } catch {
    // ignore
  }
};

let localProfiles: Profile[] = loadStoredProfiles();

export const userService = {
  getProfilesSync(): Profile[] {
    return localProfiles;
  },

  findProfileByEmail(email: string): Profile | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return localProfiles.find((p) => p.email?.toLowerCase() === cleanEmail);
  },

  async getUsers(): Promise<Profile[]> {
    if (!isSupabaseConfigured()) {
      return [...localProfiles];
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        return [...localProfiles];
      }

      // Merge remote profiles with local custom profiles
      const remoteProfiles = data as Profile[];
      const remoteEmails = new Set(remoteProfiles.map((r) => r.email?.toLowerCase()));
      const localOnly = localProfiles.filter((l) => !remoteEmails.has(l.email?.toLowerCase()));
      localProfiles = [...localOnly, ...remoteProfiles];
      return localProfiles;
    } catch {
      return [...localProfiles];
    }
  },

  async createUser(user: {
    name: string;
    email: string;
    phone_number?: string;
    password?: string;
    role: UserRole;
    status: UserStatus;
  }): Promise<{ success: boolean; error?: string; user?: Profile }> {
    const newProfile: Profile = {
      id: crypto.randomUUID(),
      name: user.name.trim(),
      email: user.email.trim(),
      phone_number: user.phone_number?.trim() || null,
      password: user.password || null,
      role: user.role,
      status: user.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localProfiles = [newProfile, ...localProfiles];
    saveCustomProfiles(localProfiles);

    if (!isSupabaseConfigured()) {
      return { success: true, user: newProfile };
    }

    try {
      // 1. Attempt Supabase Auth Sign Up if password provided
      if (user.password) {
        try {
          await supabase.auth.signUp({
            email: user.email.trim(),
            password: user.password,
            options: {
              data: {
                name: user.name.trim(),
                role: user.role,
                phone_number: user.phone_number?.trim(),
              },
            },
          });
        } catch {
          // Ignore Auth sign up duplicate errors if user exists
        }
      }

      // 2. Insert into profiles table
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: newProfile.id,
          name: newProfile.name,
          email: newProfile.email,
          role: newProfile.role,
          status: newProfile.status,
          created_at: newProfile.created_at,
          updated_at: newProfile.updated_at,
        })
        .select()
        .single();

      if (error) {
        return { success: true, user: newProfile };
      }
      return { success: true, user: data as Profile };
    } catch {
      return { success: true, user: newProfile };
    }
  },

  async updateUserRole(
    userId: string,
    name: string,
    role: UserRole,
    status: UserStatus,
    phone_number?: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> {
    localProfiles = localProfiles.map((u) =>
      u.id === userId
        ? {
            ...u,
            name: name.trim(),
            role,
            status,
            phone_number: phone_number?.trim() || u.phone_number,
            password: password || u.password,
            updated_at: new Date().toISOString(),
          }
        : u
    );

    saveCustomProfiles(localProfiles);

    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          role,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return { success: true };
      }

      return { success: true };
    } catch {
      return { success: true };
    }
  },

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    localProfiles = localProfiles.filter((u) => u.id !== userId);
    saveCustomProfiles(localProfiles);

    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    try {
      await supabase.from('profiles').delete().eq('id', userId);
      return { success: true };
    } catch {
      return { success: true };
    }
  },
};
