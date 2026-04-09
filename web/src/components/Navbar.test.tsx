import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import type { AppUser } from '../lib/types';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

const baseUser: AppUser = {
  id: 'user-1',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  role: 'PLAYER',
  isBaller: false,
  matchesPlayed: 10,
  wins: 7,
  losses: 3,
  credits: 25,
  ballerExpiresAt: null,
};

function renderNavbar() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
  });
  return renderer;
}

describe('Navbar — logged out', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      logout: vi.fn(),
      refetch: vi.fn(),
    } as never);
  });

  it('shows Log in link', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Log in');
  });

  it('shows Sign up link', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Sign up');
  });

  it('does not show credits pill', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('credits');
  });

  it('does not show Dashboard link', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('Dashboard');
  });

  it('does not show Organizer link', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('Organizer');
  });

  it('shows the Balling logo', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Ball');
  });
});

describe('Navbar — logged in as PLAYER', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: baseUser,
      isLoading: false,
      logout: vi.fn(),
      refetch: vi.fn(),
    } as never);
  });

  it('shows the user first name', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Alice');
  });

  it('shows credits count', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('25');
    expect(json).toContain('credits');
  });

  it('shows Dashboard link', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Dashboard');
  });

  it('does not show Log in or Sign up', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('Log in');
    expect(json).not.toContain('Sign up');
  });

  it('does not show Organizer link for PLAYER role', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('Organizer');
  });
});

describe('Navbar — logged in as ORGANIZER', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...baseUser, role: 'ORGANIZER' },
      isLoading: false,
      logout: vi.fn(),
      refetch: vi.fn(),
    } as never);
  });

  it('shows Organizer link for ORGANIZER role', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Organizer');
  });
});

describe('Navbar — logged in as ADMIN', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...baseUser, role: 'ADMIN' },
      isLoading: false,
      logout: vi.fn(),
      refetch: vi.fn(),
    } as never);
  });

  it('shows Organizer link for ADMIN role', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Organizer');
  });
});

describe('Navbar — dropdown', () => {
  const logoutMock = vi.fn();

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: baseUser,
      isLoading: false,
      logout: logoutMock,
      refetch: vi.fn(),
    } as never);
  });

  it('does not show Log out before account button is clicked', () => {
    const renderer = renderNavbar();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('Log out');
  });

  it('shows Log out after account button is clicked', () => {
    const renderer = renderNavbar();

    // Find the account button by looking for string child 'Alice'
    const allButtons = renderer.root.findAll((node) => node.type === 'button');
    const accountBtn = allButtons.find((btn) =>
      Array.isArray(btn.children) &&
      btn.children.some((c) => typeof c === 'string' && c === 'Alice')
    );
    expect(accountBtn).toBeDefined();

    act(() => {
      (accountBtn!.props as { onClick: () => void }).onClick();
    });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Log out');
  });

  it('hides dropdown after Log out is clicked', () => {
    const renderer = renderNavbar();

    const allButtons = renderer.root.findAll((node) => node.type === 'button');
    const accountBtn = allButtons.find((btn) =>
      Array.isArray(btn.children) &&
      btn.children.some((c) => typeof c === 'string' && c === 'Alice')
    );
    expect(accountBtn).toBeDefined();

    act(() => { (accountBtn!.props as { onClick: () => void }).onClick(); });

    const logoutBtn = renderer.root.findAll(
      (node) =>
        node.type === 'button' &&
        Array.isArray(node.children) &&
        node.children.some((c) => typeof c === 'string' && c === 'Log out')
    )[0];
    expect(logoutBtn).toBeDefined();

    act(() => { (logoutBtn.props as { onClick: () => void }).onClick(); });

    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('Log out');
  });
});
