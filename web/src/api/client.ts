import axios from 'axios';
import { supabase } from '../lib/supabase';

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (!apiUrl) throw new Error('Missing VITE_API_URL environment variable');

// Mutable object so tests can replace the function without touching the
// non-configurable window.location in jsdom.
export const _nav = {
  to: (path: string) => {
    const locationLike = (globalThis as { location?: { assign?: (nextPath: string) => void } }).location;
    locationLike?.assign?.(path);
  },
};

export const api = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
});

async function getSessionAccessToken() {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: { session: null } }>((resolve) => {
        globalThis.setTimeout(() => resolve({ data: { session: null } }), 1500);
      }),
    ]);

    return result.data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

api.interceptors.request.use(async (config) => {
  const headers = axios.AxiosHeaders.from(config.headers);
  const hasExplicitAuthorization =
    headers.has('Authorization') ||
    headers.has('authorization');

  if (hasExplicitAuthorization) {
    config.headers = headers;
    return config;
  }

  const accessToken = await getSessionAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  config.headers = headers;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const status =
      error &&
      typeof error === 'object' &&
      'response' in error &&
      error.response &&
      typeof error.response === 'object' &&
      'status' in error.response
        ? (error.response as { status: number }).status
        : null;

    if (status === 401) {
      await supabase.auth.signOut();
      _nav.to('/login');
    }
    return Promise.reject(error);
  }
);
