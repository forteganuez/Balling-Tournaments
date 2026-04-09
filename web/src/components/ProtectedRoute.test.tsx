import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

function renderWithRoutes(initialPath = '/protected') {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
  });
  return renderer;
}

function renderWithRole(requiredRole: string, initialPath = '/protected') {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<ProtectedRoute requiredRole={requiredRole as never} />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
  });
  return renderer;
}

describe('ProtectedRoute — loading state', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: true,
      logout: vi.fn(),
      refetch: vi.fn(),
    } as never);
  });

  it('shows a spinner while loading', () => {
    const renderer = renderWithRoutes();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('animate-spin');
  });

  it('does not show protected content while loading', () => {
    const renderer = renderWithRoutes();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('Protected Content');
  });
});

describe('ProtectedRoute — unauthenticated', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      logout: vi.fn(),
      refetch: vi.fn(),
    } as never);
  });

  it('redirects to /login when no user', () => {
    const renderer = renderWithRoutes();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Login Page');
    expect(json).not.toContain('Protected Content');
  });
});

describe('ProtectedRoute — authenticated, no role requirement', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'PLAYER',
        isBaller: false,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        credits: 0,
        ballerExpiresAt: null,
      },
      isLoading: false,
      logout: vi.fn(),
      refetch: vi.fn(),
    } as never);
  });

  it('renders protected content when user is logged in', () => {
    const renderer = renderWithRoutes();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Protected Content');
  });

  it('does not redirect to login', () => {
    const renderer = renderWithRoutes();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('Login Page');
  });
});

describe('ProtectedRoute — role mismatch', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'PLAYER',
        isBaller: false,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        credits: 0,
        ballerExpiresAt: null,
      },
      isLoading: false,
      logout: vi.fn(),
      refetch: vi.fn(),
    } as never);
  });

  it('redirects PLAYER to /dashboard when ORGANIZER role is required', () => {
    const renderer = renderWithRole('ORGANIZER');
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Dashboard');
    expect(json).not.toContain('Protected Content');
  });
});

describe('ProtectedRoute — ADMIN bypass', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        isBaller: false,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        credits: 0,
        ballerExpiresAt: null,
      },
      isLoading: false,
      logout: vi.fn(),
      refetch: vi.fn(),
    } as never);
  });

  it('grants ADMIN access even when ORGANIZER role is required', () => {
    const renderer = renderWithRole('ORGANIZER');
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Protected Content');
  });
});
