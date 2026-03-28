import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useAuthContext } from '../context/AuthContext';
import {
  getGoogleAuthBaseCandidates,
  joinApiUrl,
  rememberWorkingGoogleAuthBaseUrl,
} from '../lib/apiConfig';
import { getStoredValue, setStoredValue, setToken } from '../lib/storage';

WebBrowser.maybeCompleteAuthSession();

const MICROSOFT_CLIENT_ID = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '';
const GOOGLE_REDIRECT_PATH = 'oauth/google';
const APPLE_PROFILE_KEY_PREFIX = 'apple_profile_';

interface AppleProfileCache {
  email?: string;
  name?: string;
}

function getAppleProfileKey(userId: string | null | undefined): string | null {
  if (!userId) {
    return null;
  }

  const sanitizedUserId = userId.replace(/[^A-Za-z0-9._-]/g, '_');
  if (!sanitizedUserId) {
    return null;
  }

  return `${APPLE_PROFILE_KEY_PREFIX}${sanitizedUserId}`;
}

export function useSocialAuth() {
  const { socialLogin, refreshUser } = useAuthContext();
  const [loading, setLoading] = useState<'google' | 'apple' | 'microsoft' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const googleRedirectUri = makeRedirectUri({ path: GOOGLE_REDIRECT_PATH });
  const redirectUri = makeRedirectUri({ path: 'oauth/microsoft' });

  useEffect(() => {
    WebBrowser.warmUpAsync().catch(() => {
      // Best effort only.
    });

    return () => {
      WebBrowser.coolDownAsync().catch(() => {
        // Best effort only.
      });
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setAppleAvailable(false);
      return;
    }

    let active = true;

    async function loadAppleAvailability() {
      try {
        const AppleAuth = await import('expo-apple-authentication');
        const available = await AppleAuth.isAvailableAsync();
        if (active) {
          setAppleAvailable(available);
        }
      } catch {
        if (active) {
          setAppleAvailable(false);
        }
      }
    }

    loadAppleAvailability();

    return () => {
      active = false;
    };
  }, []);

  const handleGoogle = async () => {
    try {
      setError(null);
      setLoading('google');

      // Generate a unique state to track this auth session.
      const state = Math.random().toString(36).substring(2, 15);
      const [googleAuthBaseUrl] = getGoogleAuthBaseCandidates();

      if (!googleAuthBaseUrl) {
        throw new Error('No Google auth URL is configured.');
      }

      const authUrl =
        `${joinApiUrl(googleAuthBaseUrl, '/api/auth/google/start')}?state=${encodeURIComponent(state)}` +
        `&redirect_uri=${encodeURIComponent(googleRedirectUri)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, googleRedirectUri);
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }

      if (result.type !== 'success' || !result.url) {
        throw new Error('Google sign in did not complete.');
      }

      const callbackUrl = new URL(result.url);
      const callbackError = callbackUrl.searchParams.get('error');
      const returnedState = callbackUrl.searchParams.get('state');

      if (callbackError) {
        throw new Error('Google sign in was cancelled or failed.');
      }

      if (returnedState !== state) {
        throw new Error('Google sign in session mismatch. Please try again.');
      }

      // Poll for the token after the auth session redirects back into the app.
      const pollForToken = async (): Promise<string | null> => {
        const authBaseUrls = getGoogleAuthBaseCandidates();

        for (const baseUrl of authBaseUrls) {
          for (let i = 0; i < 20; i++) {
            try {
              const res = await fetch(
                `${joinApiUrl(baseUrl, '/api/auth/google/poll')}?state=${state}`,
              );
              const data = await res.json();
              if (data.token) {
                rememberWorkingGoogleAuthBaseUrl(baseUrl);
                return data.token;
              }
            } catch {
              // Move to the next candidate URL below if this one is unreachable.
              break;
            }

            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        return null;
      };

      const token = await pollForToken();
      if (token) {
        await setToken(token);
        await refreshUser();
      } else {
        setError('Sign in timed out. Please try again.');
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
      const cachedProfileRaw = appleProfileKey
        ? await getStoredValue(appleProfileKey)
        : null;
      const cachedProfile: AppleProfileCache | null =
        cachedProfileRaw ? JSON.parse(cachedProfileRaw) as AppleProfileCache : null;

      const name = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : cachedProfile?.name;
      const email = credential.email ?? cachedProfile?.email;

      if (appleProfileKey && (name || email)) {
        await setStoredValue(
          appleProfileKey,
          JSON.stringify({ name, email }),
        );
      }

      await socialLogin('apple', {
        idToken: credential.identityToken,
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      });
    } catch (err: unknown) {
      const isCancel = typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'ERR_REQUEST_CANCELED';
      if (!isCancel) {
        setError(err instanceof Error ? err.message : 'Apple sign in failed');
      }
    } finally {
      setLoading(null);
    }
  };

  const handleMicrosoft = async () => {
    try {
      setError(null);
      setLoading('microsoft');

      const authUrl =
        `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${MICROSOFT_CLIENT_ID}` +
        `&response_type=token` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent('openid profile email User.Read')}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        const params = new URLSearchParams(result.url.split('#')[1]);
        const accessToken = params.get('access_token');
        if (accessToken) {
          await socialLogin('microsoft', { accessToken });
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Microsoft sign in failed');
    } finally {
      setLoading(null);
    }
  };

  return {
    handleGoogle,
    handleApple,
    handleMicrosoft,
    loading,
    error,
    appleAvailable,
    clearError: () => setError(null),
  };
}
