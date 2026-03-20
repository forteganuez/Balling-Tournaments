import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useAuthContext } from '../context/AuthContext';
import { setToken } from '../lib/storage';

WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const GOOGLE_AUTH_URL = process.env.EXPO_PUBLIC_GOOGLE_AUTH_URL || API_URL;
const MICROSOFT_CLIENT_ID = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '';

export function useSocialAuth() {
  const { socialLogin, refreshUser } = useAuthContext();
  const [loading, setLoading] = useState<'google' | 'apple' | 'microsoft' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = makeRedirectUri({ scheme: 'balling' });

  const handleGoogle = async () => {
    try {
      setError(null);
      setLoading('google');

      // Generate a unique state to track this auth session
      const state = Math.random().toString(36).substring(2, 15);
      const authUrl = `${GOOGLE_AUTH_URL}/api/auth/google/start?state=${state}`;

      // Open browser for Google sign in
      await WebBrowser.openBrowserAsync(authUrl);

      // Poll for the token after user returns to app
      const pollForToken = async (): Promise<string | null> => {
        for (let i = 0; i < 30; i++) {
          const res = await fetch(`${GOOGLE_AUTH_URL}/api/auth/google/poll?state=${state}`);
          const data = await res.json();
          if (data.token) return data.token;
          await new Promise(r => setTimeout(r, 2000));
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
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    try {
      setError(null);
      setLoading('apple');
      const AppleAuth = await import('expo-apple-authentication');
      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const name = credential.fullName
          ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
          : undefined;

        await socialLogin('apple', {
          idToken: credential.identityToken,
          ...(name ? { name } : {}),
          ...(credential.email ? { email: credential.email } : {}),
        });
      }
    } catch (err: any) {
      if (err.code !== 'ERR_CANCELED') {
        setError(err.message || 'Apple sign in failed');
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
    } catch (err: any) {
      setError(err.message || 'Microsoft sign in failed');
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
    clearError: () => setError(null),
  };
}
