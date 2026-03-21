import { useCallback, useEffect, useState } from 'react';
import * as api from '../lib/api';
import type { OpenMatchesFeed } from '../lib/types';

interface UseOpenMatchesResult {
  feed: OpenMatchesFeed;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const emptyFeed: OpenMatchesFeed = {
  hosting: [],
  playing: [],
  available: [],
};

export function useOpenMatches(): UseOpenMatchesResult {
  const [feed, setFeed] = useState<OpenMatchesFeed>(emptyFeed);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOpenMatchesFeed();
      setFeed(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load open matches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { feed, loading, error, refetch };
}
