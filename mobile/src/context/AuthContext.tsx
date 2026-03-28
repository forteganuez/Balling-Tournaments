import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, ProfileUpdate } from '../lib/types';
import * as api from '../lib/api';
import { supabase } from '../lib/supabase';
import { setOnUnauthorized } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { user: me } = await api.getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
    });
  }, []);

  // Listen for Supabase auth state changes
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await fetchProfile();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Session refreshed, profile stays the same
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    // Sync profile from our server (creates user in Prisma if needed)
    await fetchProfile();
  }, [fetchProfile]);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    });
    if (error) throw new Error(error.message);
    // Sync profile to our server
    await fetchProfile();
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'balling://auth/callback',
        skipBrowserRedirect: true,
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const updateProfile = useCallback(async (data: ProfileUpdate) => {
    const { user: updated } = await api.updateProfile(data);
    setUser(updated);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout: handleLogout,
      signInWithGoogle, updateProfile, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}
