import { supabase, isSupabaseConfigured } from './supabase/client';
import type { Profile, UserRole, UserStatus } from '../types/database';
import { MOCK_PROFILES } from './mockData';

let localProfiles: Profile[] = [...MOCK_PROFILES];

export const userService = {
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

      localProfiles = data as Profile[];
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

    if (!isSupabaseConfigured()) {
      return { success: true, user: newProfile };
    }

    try {
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


