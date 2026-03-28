import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useAuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getStoredValue, setStoredValue } from '../lib/storage';

WebBrowser.maybeCompleteAuthSession();

const APPLE_PROFILE_KEY_PREFIX = 'apple_profile_';

interface AppleProfileCache {
  email?: string;
  name?: string;
}

function getAppleProfileKey(userId: string | null | undefined): string | null {
  if (!userId) return null;
  const sanitized = userId.replace(/[^A-Za-z0-9._-]/g, '_');
  if (!sanitized) return null;
  return `${APPLE_PROFILE_KEY_PREFIX}${sanitized}`;
}

export function useSocialAuth() {
  const { refreshUser } = useAuthContext();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const redirectUri = makeRedirectUri({ scheme: 'balling', path: 'auth/callback' });

  useEffect(() => {
    WebBrowser.warmUpAsync().catch(() => {});
    return () => { WebBrowser.coolDownAsync().catch(() => {}); };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setAppleAvailable(false);
      return;
    }

    let active = true;
    async function check() {
      try {
        const AppleAuth = await import('expo-apple-authentication');
        const available = await AppleAuth.isAvailableAsync();
        if (active) setAppleAvailable(available);
      } catch {
        if (active) setAppleAvailable(false);
      }
    }
    check();
    return () => { active = false; };
  }, []);

  const handleGoogle = async () => {
    try {
      setError(null);
      setLoading('google');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) throw new Error(oauthError.message);
      if (!data.url) throw new Error('No OAuth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === 'cancel' || result.type === 'dismiss') return;

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        // Supabase returns tokens in the URL fragment
        const fragment = url.hash.substring(1);
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          await refreshUser();
        } else {
          throw new Error('Google sign in did not return tokens.');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign in failed');
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    try {
      setError(null);
      setLoading('apple');
      const AppleAuth = await import('expo-apple-authentication');

      if (!(await AppleAuth.isAvailableAsync())) {
        setError('Apple Sign In is only available on supported iOS devices.');
        return;
      }

      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }

      const appleProfileKey = getAppleProfileKey(credential.user);
      const cachedRaw = appleProfileKey ? await getStoredValue(appleProfileKey) : null;
      const cached: AppleProfileCache | null = cachedRaw ? JSON.parse(cachedRaw) : null;

      const name = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : cached?.name;
      const email = credential.email ?? cached?.email;

      if (appleProfileKey && (name || email)) {
        await setStoredValue(appleProfileKey, JSON.stringify({ name, email }));
      }

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (signInError) throw new Error(signInError.message);

      await refreshUser();
    } catch (err: unknown) {
      const isCancel = typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'ERR_REQUEST_CANCELED';
      if (!isCancel) {
        setError(err instanceof Error ? err.message : 'Apple sign in failed');
      }
    } finally {
      setLoading(null);
    }
  };

  return {
    handleGoogle,
    handleApple,
    loading,
    error,
    appleAvailable,
    clearError: () => setError(null),
  };
}
