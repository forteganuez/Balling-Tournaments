import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '../lib/types';
import * as api from '../lib/api';
import { setToken, clearToken, getToken } from '../lib/storage';
import { setOnUnauthorized } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
    });
  }, []);

  useEffect(() => {
    async function loadUser() {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user: me } = await api.getMe();
        setUser(me);
      } catch {
        await clearToken();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedIn, token } = await api.login(email, password);
    await setToken(token);
    setUser(loggedIn);
  }, []);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    phone?: string
  ) => {
    const { user: registered, token } = await api.register(name, email, password, phone);
    await setToken(token);
    setUser(registered);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout: handleLogout }}>
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
