import { useState, useEffect, useCallback } from 'react';
import type { Tournament, Registration } from '../lib/types';
import {
  getTournaments,
  getTournament,
  getMyTournaments,
  type TournamentFilters,
} from '../lib/api';

export function useTournaments(filters?: TournamentFilters) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTournaments(filters);
      setTournaments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, [filters?.sport, filters?.status, filters?.search]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tournaments, loading, error, refetch: fetch };
}

export function useTournament(id: string) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTournament(id);
      setTournament(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tournament, loading, error, refetch: fetch };
}

export function useMyTournaments() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyTournaments();
      setRegistrations(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load registrations'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { registrations, loading, error, refetch: fetch };
}
