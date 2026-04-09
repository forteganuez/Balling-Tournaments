import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '../test-utils';

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
    let snapshot: { isLoading: boolean; user: { name: string } | null } | null = null;
    const getSnapshot = () => {
      if (!snapshot) {
        throw new Error('Auth snapshot not ready');
      }

      return snapshot;
    };

    function TestChild() {
      snapshot = useAuth();
      return null;
    }

    const view = render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    expect(getSnapshot().isLoading).toBe(true);
    await waitFor(() => expect(getSnapshot().isLoading).toBe(false));
    expect(getSnapshot().user).toBeNull();
    view.unmount();
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
        data: {
          credits: {
            total: 10,
            packs: [],
          },
          subscription: null,
          isBaller: false,
          competitiveMatchesThisMonth: 0,
          nudge: null,
        },
      });

    const { useAuth, AuthProvider } = await import('./AuthContext');
    let snapshot: { isLoading: boolean; user: { name: string } | null } | null = null;
    const getSnapshot = () => {
      if (!snapshot) {
        throw new Error('Auth snapshot not ready');
      }

      return snapshot;
    };

    function TestChild() {
      snapshot = useAuth();
      return null;
    }

    const view = render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    );

    await waitFor(() => expect(getSnapshot().user?.name).toBe('Alice'));
    view.unmount();
  });
});
