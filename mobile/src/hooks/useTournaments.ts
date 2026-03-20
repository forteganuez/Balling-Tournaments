import { useState, useEffect, useCallback } from 'react';
import type { Tournament } from '../lib/types';
import * as api from '../lib/api';
import type { TournamentFilters } from '../lib/api';

interface UseTournamentsResult {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTournaments(filters?: TournamentFilters): UseTournamentsResult {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTournaments(filters);
      setTournaments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, [filters?.sport, filters?.status, filters?.search]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { tournaments, loading, error, refetch };
}
