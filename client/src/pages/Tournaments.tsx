import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import TournamentCard from '../components/TournamentCard';
import { useTournaments } from '../hooks/useTournaments';
import type { Sport, TournamentStatus } from '../lib/types';

export default function Tournaments() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [sport, setSport] = useState<Sport | ''>(
    (searchParams.get('sport') as Sport) || ''
  );
  const [status, setStatus] = useState<TournamentStatus | ''>(
    (searchParams.get('status') as TournamentStatus) || ''
  );
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const filters = useMemo(
    () => ({
      sport: sport || undefined,
      status: status || undefined,
      search: search || undefined,
    }),
    [sport, status, search]
  );

  const { tournaments, loading, error } = useTournaments(filters);

  const updateParams = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Tournaments</h1>

      {/* Filter bar */}
      <div className="mb-8 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-md sm:flex-row sm:items-center">
        <select
          value={sport}
          onChange={(e) => {
            setSport(e.target.value as Sport | '');
            updateParams('sport', e.target.value);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Sports</option>
          <option value="PADEL">Padel</option>
          <option value="TENNIS">Tennis</option>
          <option value="SQUASH">Squash</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as TournamentStatus | '');
            updateParams('status', e.target.value);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="REGISTRATION_OPEN">Registration Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <div className="flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              updateParams('search', e.target.value);
            }}
            placeholder="Search tournaments..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-xl bg-gray-200"
            />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        /* Empty state */
        <div className="rounded-xl bg-white py-16 text-center shadow-md">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <p className="mt-4 text-gray-500">No tournaments found.</p>
          <p className="text-sm text-gray-400">
            Try adjusting your filters or search.
          </p>
        </div>
      ) : (
        /* Tournament grid */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}
