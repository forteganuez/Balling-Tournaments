import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';
import HomePage from './HomePage';

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
  });
  return renderer;
}

describe('HomePage — logged out', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false, logout: vi.fn(), refetch: vi.fn() } as never);
  });

  it('shows "Get Started" CTA when not logged in', () => {
    const renderer = render();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Get Started');
  });

  it('shows "Create Account" CTA in the bottom section', () => {
    const renderer = render();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Create Account');
  });

  it('does not show "Explore Tournaments" in the hero when not logged in', () => {
    const renderer = render();
    // Find the hero section link (first CTA)
    const links = renderer.root.findAll(
      (node) => node.type === 'a' && JSON.stringify(node.children).includes('Get Started')
    );
    expect(links.length).toBeGreaterThan(0);
  });
});

describe('HomePage — logged in', () => {
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
        credits: 10,
        ballerExpiresAt: null,
      },
      isLoading: false,
      logout: vi.fn(),
      refetch: vi.fn(),
    } as never);
  });

  it('shows "Explore Tournaments" when logged in', () => {
    const renderer = render();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Explore Tournaments');
  });

  it('shows "Explore Events" in the bottom CTA when logged in', () => {
    const renderer = render();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Explore Events');
  });

  it('does not show "Get Started" when logged in', () => {
    const renderer = render();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('Get Started');
  });
});

describe('HomePage — content', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: null, isLoading: false, logout: vi.fn(), refetch: vi.fn() } as never);
  });

  it('renders the platform headline', () => {
    const renderer = render();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Where Competition');
  });

  it('renders the product pillars section', () => {
    const renderer = render();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Tournament Brackets');
    expect(json).toContain('Live Scoring');
  });

  it('renders the three product cards', () => {
    const renderer = render();
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Secure Registration');
  });

  it('links to /pricing from the hero', () => {
    const renderer = render();
    const pricingLinks = renderer.root.findAll(
      (node) => node.type === 'a' && node.props.href === '/pricing'
    );
    expect(pricingLinks.length).toBeGreaterThan(0);
  });

  it('links to /tournaments from the bottom section', () => {
    const renderer = render();
    const tournamentLinks = renderer.root.findAll(
      (node) => node.type === 'a' && node.props.href === '/tournaments'
    );
    expect(tournamentLinks.length).toBeGreaterThan(0);
  });
});
