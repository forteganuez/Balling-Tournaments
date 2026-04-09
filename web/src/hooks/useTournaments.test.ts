import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react-test-renderer';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

// Mock the api module
vi.mock('../api/client', () => ({
  api: {
    get: apiGetMock,
  },
}));

import { useTournaments, useTournament, useMyTournaments } from './useTournaments';
import type { Tournament } from '../lib/types';
import { renderHook, waitFor } from '../test-utils';

const mockTournament: Tournament = {
  id: 'tour-1',
  name: 'Padel Open',
  sport: 'PADEL',
  format: 'SINGLE_ELIMINATION',
  status: 'REGISTRATION_OPEN',
  date: '2026-05-01T10:00:00Z',
  location: 'Groningen',
  maxPlayers: 16,
  entryFee: 1000,
  organizerId: 'user-1',
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

describe('useTournaments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches tournaments and sets loading state', async () => {
    apiGetMock.mockResolvedValueOnce({ data: [mockTournament] });

    const { result, unmount } = renderHook(() => useTournaments());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tournaments).toEqual([mockTournament]);
    expect(result.current.error).toBe('');
    unmount();
  });

  it('builds query params from filters', async () => {
    apiGetMock.mockResolvedValueOnce({ data: [] });

    const { unmount } = renderHook(() =>
      useTournaments({ sport: 'TENNIS', status: 'IN_PROGRESS', search: 'open', page: 2, limit: 10 })
    );

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        expect.stringContaining('sport=TENNIS')
      );
    });

    const callArg = apiGetMock.mock.calls[0][0] as string;
    expect(callArg).toContain('status=IN_PROGRESS');
    expect(callArg).toContain('search=open');
    expect(callArg).toContain('page=2');
    expect(callArg).toContain('limit=10');
    unmount();
  });

  it('defaults page=1 and limit=20 when not provided', async () => {
    apiGetMock.mockResolvedValueOnce({ data: [] });

    const { unmount } = renderHook(() => useTournaments());

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith(
        expect.stringContaining('page=1')
      );
    });

    const callArg = apiGetMock.mock.calls[0][0] as string;
    expect(callArg).toContain('limit=20');
    unmount();
  });

  it('sets error message on fetch failure', async () => {
    apiGetMock.mockRejectedValueOnce(new Error('Network error'));

    const { result, unmount } = renderHook(() => useTournaments());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.tournaments).toEqual([]);
    unmount();
  });

  it('sets generic error message for non-Error rejections', async () => {
    apiGetMock.mockRejectedValueOnce('unexpected');

    const { result, unmount } = renderHook(() => useTournaments());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load tournaments');
    unmount();
  });
});

describe('useTournament', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches a single tournament by id', async () => {
    apiGetMock.mockResolvedValueOnce({ data: mockTournament });

    const { result, unmount } = renderHook(() => useTournament('tour-1'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tournament).toEqual(mockTournament);
    expect(result.current.error).toBe('');
    expect(apiGetMock).toHaveBeenCalledWith('/api/tournaments/tour-1');
    unmount();
  });

  it('sets error on fetch failure', async () => {
    apiGetMock.mockRejectedValueOnce(new Error('Not found'));

    const { result, unmount } = renderHook(() => useTournament('bad-id'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Not found');
    expect(result.current.tournament).toBeNull();
    unmount();
  });

  it('exposes a refetch function that re-fetches tournament', async () => {
    apiGetMock
      .mockResolvedValueOnce({ data: mockTournament })
      .mockResolvedValueOnce({ data: { ...mockTournament, name: 'Updated' } });

    const { result, unmount } = renderHook(() => useTournament('tour-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tournament?.name).toBe('Padel Open');

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.tournament?.name).toBe('Updated'));
    expect(apiGetMock).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('sets generic error for non-Error rejections', async () => {
    apiGetMock.mockRejectedValueOnce(42);

    const { result, unmount } = renderHook(() => useTournament('tour-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load tournament');
    unmount();
  });

  it('clears a previous error after a successful refetch', async () => {
    apiGetMock
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce({ data: mockTournament });

    const { result, unmount } = renderHook(() => useTournament('tour-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Temporary failure');

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('');
    expect(result.current.tournament).toEqual(mockTournament);
    unmount();
  });
});

describe('useMyTournaments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the current user organised tournaments', async () => {
    apiGetMock.mockResolvedValueOnce({ data: [mockTournament] });

    const { result, unmount } = renderHook(() => useMyTournaments());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tournaments).toEqual([mockTournament]);
    expect(result.current.error).toBe('');
    expect(apiGetMock).toHaveBeenCalledWith('/api/tournaments/organized');
    unmount();
  });

  it('sets error on fetch failure', async () => {
    apiGetMock.mockRejectedValueOnce(new Error('Unauthorized'));

    const { result, unmount } = renderHook(() => useMyTournaments());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Unauthorized');
    expect(result.current.tournaments).toEqual([]);
    unmount();
  });

  it('sets generic error for non-Error rejections', async () => {
    apiGetMock.mockRejectedValueOnce(null);

    const { result, unmount } = renderHook(() => useMyTournaments());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load tournaments');
    unmount();
  });
});
