import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state then resolves to null user when no session', async () => {
    const { supabase } = await import('../lib/supabase');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { useAuth, AuthProvider } = await import('./AuthContext');

    function TestChild() {
      const { user, isLoading } = useAuth();
      if (isLoading) return <div>loading</div>;
      return <div>{user ? user.name : 'no-user'}</div>;
    }

    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('no-user')).toBeInTheDocument());
  });

  it('populates user when session and API calls succeed', async () => {
    const { supabase } = await import('../lib/supabase');
    const { api } = await import('../api/client');

    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: 'tok' } as never },
      error: null,
    });
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: {
          user: {
            id: '1',
            name: 'Alice',
            email: 'a@b.com',
            role: 'PLAYER',
            isBaller: false,
            matchesPlayed: 5,
            wins: 3,
            losses: 2,
          },
        },
      })
      .mockResolvedValueOnce({
        data: { totalCredits: 10, subscription: null },
      });

    const { useAuth, AuthProvider } = await import('./AuthContext');

    function TestChild() {
      const { user, isLoading } = useAuth();
      if (isLoading) return <div>loading</div>;
      return <div>{user?.name ?? 'no-user'}</div>;
    }

    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
  });
});
