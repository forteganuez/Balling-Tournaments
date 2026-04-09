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
  refetch: (accessToken?: string) => Promise<AppUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (accessToken?: string) => {
    try {
      const headers = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined;
      const [meRes, balanceRes] = await Promise.all([
        api.get<{ user: Omit<AppUser, 'credits' | 'ballerExpiresAt'> }>(
          '/api/auth/me',
          { headers }
        ),
        api.get<BalanceResponse>('/api/monetization/balance', { headers }),
      ]);

      const nextUser = {
        ...meRes.data.user,
        credits: balanceRes.data.credits.total,
        ballerExpiresAt:
          balanceRes.data.subscription?.currentPeriodEnd ?? null,
      };

      setUser(nextUser);
      return nextUser;
    } catch (error) {
      setUser(null);
      throw error;
    }
  }, []);

  useEffect(() => {
    // Detect pending OAuth exchange (PKCE code or implicit hash tokens)
    const hasPendingOAuth =
      window.location.search.includes('code=') ||
      window.location.hash.includes('access_token=') ||
      window.location.search.includes('error=');

    let loadingResolved = false;
    const resolveLoading = () => {
      if (!loadingResolved) {
        loadingResolved = true;
        setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        session &&
        (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')
      ) {
        await fetchUser(session.access_token).catch(() => null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }

      // If OAuth pending: wait for SIGNED_IN/SIGNED_OUT before resolving
      // Otherwise: resolve on INITIAL_SESSION
      if (hasPendingOAuth) {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          resolveLoading();
        }
      } else {
        if (event === 'INITIAL_SESSION') {
          resolveLoading();
        }
      }
    });

    // Safety timeout in case SIGNED_IN never fires (e.g. OAuth error)
    const timeout = setTimeout(resolveLoading, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
