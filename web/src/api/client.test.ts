import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('api client', () => {
  let navSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const { _nav } = await import('./client');
    navSpy = vi.fn();
    _nav.to = navSpy;
  });

  afterEach(async () => {
    const { _nav } = await import('./client');
    _nav.to = (path: string) => { void path; };
  });

  it('attaches Bearer token when session exists', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: 'test-token' } as never },
      error: null,
    });

    const { api } = await import('./client');
    const requestHandlers = api.interceptors.request.handlers ?? [];
    const requestHandler = requestHandlers[0]?.fulfilled;
    expect(requestHandler).toBeTypeOf('function');
    if (!requestHandler) throw new Error('Request interceptor missing');

    const config = await requestHandler({
      headers: new axios.AxiosHeaders(),
      url: '/test',
    } as never);

    expect((config.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer test-token'
    );
  });

  it('keeps an explicit Authorization header when one is already provided', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: 'stale-token' } as never },
      error: null,
    });

    const { api } = await import('./client');
    const requestHandlers = api.interceptors.request.handlers ?? [];
    const requestHandler = requestHandlers[0]?.fulfilled;
    expect(requestHandler).toBeTypeOf('function');
    if (!requestHandler) throw new Error('Request interceptor missing');

    const config = await requestHandler({
      headers: new axios.AxiosHeaders({ Authorization: 'Bearer fresh-token' }),
      url: '/test',
    } as never);

    expect((config.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer fresh-token'
    );
  });

  it('redirects to /login and signs out on 401', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({ error: null });

    const { api } = await import('./client');
    const error = { response: { status: 401 } };
    const responseHandlers = api.interceptors.response.handlers ?? [];
    const responseHandler = responseHandlers[0]?.rejected;

    expect(responseHandler).toBeTypeOf('function');
    if (!responseHandler) throw new Error('Response interceptor missing');

    await responseHandler(error as never).catch(() => {});

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith('/login');
  });
});
