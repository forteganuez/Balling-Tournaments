import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { useAuthContext } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const MICROSOFT_CLIENT_ID = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '';

export function useSocialAuth() {
  const { socialLogin } = useAuthContext();
  const [loading, setLoading] = useState<'google' | 'apple' | 'microsoft' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = makeRedirectUri({ scheme: 'balling' });

  const [, googleResponse, googlePromptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    redirectUri,
  });

  const handleGoogle = async () => {
    try {
      setError(null);
      setLoading('google');
      const result = await googlePromptAsync();
      if (result.type === 'success' && result.params.id_token) {
        await socialLogin('google', { idToken: result.params.id_token });
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
