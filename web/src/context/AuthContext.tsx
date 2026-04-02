import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../api/client';
import type { AppUser, BalanceResponse } from '../lib/types';

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const [meRes, balanceRes] = await Promise.all([
        api.get<{ user: Omit<AppUser, 'credits' | 'ballerExpiresAt'> }>(
          '/api/auth/me'
        ),
        api.get<BalanceResponse>('/api/monetization/balance'),
      ]);

      setUser({
        ...meRes.data.user,
        credits: balanceRes.data.totalCredits,
        ballerExpiresAt:
          balanceRes.data.subscription?.currentPeriodEnd ?? null,
      });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await fetchUser();
      }
      setIsLoading(false);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        session &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')
      ) {
        await fetchUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, refetch: fetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
