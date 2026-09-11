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

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, phone_number, role, status, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to load users from Supabase:', error);
      throw new Error(error.message || 'Failed to fetch user accounts from database.');
    }

    return (data || []) as Profile[];
  },

  async createUser(user: {
    name: string;
    email: string;
    phone_number?: string;
    password?: string;
    role: UserRole;
    status: UserStatus;
  }): Promise<{ success: boolean; error?: string; user?: Profile }> {
    if (!isSupabaseConfigured()) {
      const newProfile: Profile = {
        id: crypto.randomUUID(),
        name: user.name.trim(),
        email: user.email.trim(),
        phone_number: user.phone_number?.trim() || null,
        role: user.role,
        status: user.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localProfiles = [newProfile, ...localProfiles];
      saveCustomProfiles(localProfiles);
      return { success: true, user: newProfile };
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          name: user.name.trim(),
          email: user.email.trim().toLowerCase(),
          password: user.password,
          phone_number: user.phone_number?.trim() || undefined,
          role: user.role,
          status: user.status,
        },
      });

      if (error) {
        console.error('create-user function error:', error);
        return {
          success: false,
          error: error.message || 'Unable to invoke user creation service.',
        };
      }

      if (!data || data.success === false) {
        return {
          success: false,
          error: data?.error || 'Failed to create user account.',
        };
      }

      return {
        success: true,
        user: data.user as Profile,
      };
    } catch (err: any) {
      console.error('Unexpected error creating user:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred while creating the user.',
      };
    }
  },

  async updateUserRole(
    userId: string,
    roleOrName: UserRole | string,
    statusOrRole?: UserStatus | UserRole,
    statusParam?: UserStatus,
    nameParam?: string,
    phoneNumberParam?: string
  ): Promise<{ success: boolean; error?: string }> {
    let finalName: string | undefined;
    let finalRole: UserRole;
    let finalStatus: UserStatus;
    let finalPhone: string | undefined;

    if (['admin', 'engineer', 'operator'].includes(roleOrName as string)) {
      finalRole = roleOrName as UserRole;
      finalStatus = (statusOrRole as UserStatus) || 'active';
      finalName = nameParam;
      finalPhone = phoneNumberParam;
    } else {
      finalName = roleOrName as string;
      finalRole = statusOrRole as UserRole;
      finalStatus = statusParam || 'active';
      finalPhone = phoneNumberParam;
    }

    if (!isSupabaseConfigured()) {
      localProfiles = localProfiles.map((u) =>
        u.id === userId
          ? {
              ...u,
              name: finalName?.trim() || u.name,
              role: finalRole,
              status: finalStatus,
              phone_number: finalPhone?.trim() || u.phone_number,
              updated_at: new Date().toISOString(),
            }
          : u
      );
      saveCustomProfiles(localProfiles);
      return { success: true };
    }

    try {
      const updates: Record<string, any> = {
        role: finalRole,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      };

      if (finalName) {
        updates.name = finalName.trim();
      }

      if (finalPhone !== undefined) {
        updates.phone_number = finalPhone.trim() || null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        console.error('Failed to update user profile in Supabase:', error);
        return {
          success: false,
          error: error.message || 'Failed to update user profile.',
        };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Unexpected error updating user:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred while updating the profile.',
      };
    }
  },

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      localProfiles = localProfiles.filter((u) => u.id !== userId);
      saveCustomProfiles(localProfiles);
      return { success: true };
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (error) {
        console.error('delete-user function error:', error);
        return {
          success: false,
          error: error.message || 'Failed to invoke delete user service.',
        };
      }

      if (!data || data.success === false) {
        return {
          success: false,
          error: data?.error || 'Failed to delete user account.',
        };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Unexpected error deleting user:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred while deleting the user.',
      };
    }
  },
};
