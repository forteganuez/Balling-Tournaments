import { describe, it, expect } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import TournamentCard, { formatCentsToEuros } from './TournamentCard';
import type { Tournament } from '../lib/types';

const baseTournament: Tournament = {
  id: 'tour-1',
  name: 'Groningen Padel Open',
  sport: 'PADEL',
  format: 'SINGLE_ELIMINATION',
  status: 'REGISTRATION_OPEN',
  date: '2026-06-15T10:00:00Z',
  location: 'Groningen',
  maxPlayers: 16,
  entryFee: 1000,
  organizerId: 'user-1',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

function render(tournament: Tournament) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <MemoryRouter>
        <TournamentCard tournament={tournament} />
      </MemoryRouter>
    );
  });
  return renderer;
}

describe('formatCentsToEuros', () => {
  it('formats 1000 cents as €10', () => {
    const result = formatCentsToEuros(1000);
    expect(result).toContain('10');
    expect(result).toContain('€');
  });

  it('formats 500 cents as €5', () => {
    const result = formatCentsToEuros(500);
    expect(result).toContain('5');
  });

  it('formats 0 cents as €0', () => {
    const result = formatCentsToEuros(0);
    expect(result).toContain('0');
  });
});

describe('TournamentCard', () => {
  it('renders the tournament name', () => {
    const renderer = render(baseTournament);
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Groningen Padel Open');
  });

  it('renders the tournament location', () => {
    const renderer = render(baseTournament);
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Groningen');
  });

  it('shows "Free" when entryFee is 0', () => {
    const renderer = render({ ...baseTournament, entryFee: 0 });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Free');
    expect(json).not.toContain('€');
  });

  it('shows formatted price when entryFee is non-zero', () => {
    const renderer = render({ ...baseTournament, entryFee: 2500 });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('Free');
    expect(json).toContain('25');
  });

  it('shows the spots count', () => {
    const renderer = render({ ...baseTournament, maxPlayers: 16, _count: { registrations: 6 } });
    const json = JSON.stringify(renderer.toJSON());
    // React renders "6/16 spots" as separate text nodes: "6", "/", "16", " spots"
    expect(json).toContain('"6"');
    expect(json).toContain('"16"');
    expect(json).toContain('spots');
  });

  it('shows 0 used spots when _count is absent', () => {
    const renderer = render({ ...baseTournament, maxPlayers: 8 });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('"0"');
    expect(json).toContain('"8"');
    expect(json).toContain('spots');
  });

  it('links to the correct tournament URL', () => {
    const renderer = render(baseTournament);
    const links = renderer.root.findAll(
      (node) => node.type === 'a' && typeof node.props.href === 'string'
    );
    const hrefs = links.map((l) => l.props.href as string);
    expect(hrefs.some((h) => h.includes('tour-1'))).toBe(true);
  });

  it('shows the short format label for SINGLE_ELIMINATION', () => {
    const renderer = render(baseTournament);
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Single Elim');
  });

  it('shows the short format label for ROUND_ROBIN', () => {
    const renderer = render({ ...baseTournament, format: 'ROUND_ROBIN' });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Round Robin');
  });

  it('shows status label from TOURNAMENT_STATUS_MAP', () => {
    const renderer = render({ ...baseTournament, status: 'REGISTRATION_OPEN' });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Open');
  });

  it('shows Completed for COMPLETED status', () => {
    const renderer = render({ ...baseTournament, status: 'COMPLETED' });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Completed');
  });

  it('shows venue alongside location when present', () => {
    const renderer = render({ ...baseTournament, location: 'Groningen', venue: 'Court 1' });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Court 1');
  });
});
