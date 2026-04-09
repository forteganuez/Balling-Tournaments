import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { Tournament, Sport, TournamentStatus } from '../lib/types';

interface TournamentFilters {
  sport?: Sport;
  status?: TournamentStatus;
  search?: string;
  page?: number;
  limit?: number;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useTournaments(filters: TournamentFilters = {}) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (filters.sport) params.set('sport', filters.sport);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page ?? 1));
    params.set('limit', String(filters.limit ?? 20));

    api
      .get<Tournament[]>(`/api/tournaments?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setTournaments(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Failed to load tournaments'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters.sport, filters.status, filters.search, filters.page, filters.limit]);

  return { tournaments, loading, error };
}

export function useTournament(id: string) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(() => {
    setLoading(true);
    setError('');

    return api
      .get<Tournament>(`/api/tournaments/${id}`)
      .then((res) => {
        setTournament(res.data);
        setError('');
      })
      .catch((err: unknown) => {
        setError(getErrorMessage(err, 'Failed to load tournament'));
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { tournament, loading, error, refetch };
}

export function useMyTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    setLoading(true);

    api
      .get<Tournament[]>('/api/tournaments/organized')
      .then((res) => {
        if (!cancelled) {
          setTournaments(res.data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(err, 'Failed to load tournaments'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { tournaments, loading, error };
}
