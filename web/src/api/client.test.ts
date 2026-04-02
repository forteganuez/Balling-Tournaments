import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock supabase before importing client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock window.location
const locationMock = { href: '' };
Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
});

describe('api client', () => {
  beforeEach(() => {
    locationMock.href = '';
  });

  it('attaches Bearer token when session exists', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: 'test-token' } as never },
      error: null,
    });

    const { api } = await import('./client');
    // Intercept the outgoing request config
    const config = await api.interceptors.request.handlers[0].fulfilled({
      headers: new axios.AxiosHeaders(),
      url: '/test',
    } as never);

    expect((config.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer test-token'
    );
  });

  it('redirects to /login and signs out on 401', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

    const { api } = await import('./client');
    const error = { response: { status: 401 } };

    await api.interceptors.response.handlers[0].rejected(error as never).catch(() => {});

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(locationMock.href).toBe('/login');
  });
});
