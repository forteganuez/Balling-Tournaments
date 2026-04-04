import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TournamentCard from '../components/TournamentCard';
import { useTournaments } from '../hooks/useTournaments';
import { useAuth } from '../context/AuthContext';
import type { Sport, TournamentStatus } from '../lib/types';

export default function TournamentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [sport, setSport] = useState<Sport | ''>((searchParams.get('sport') as Sport) ?? '');
  const [status, setStatus] = useState<TournamentStatus | ''>((searchParams.get('status') as TournamentStatus) ?? '');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const filters = useMemo(
    () => ({ sport: sport || undefined, status: status || undefined, search: search || undefined }),
    [sport, status, search]
  );

  const { tournaments, loading, error } = useTournaments(filters);

  const updateParams = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    value ? next.set(key, value) : next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const selectClass =
    'rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] px-3 py-2.5 text-sm text-black outline-none focus:border-[#c4a47a]';

  return (
    <div className="bg-[#f3eee5] text-[#191510] mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-black">Tournaments</h1>
        {user?.role === 'ORGANIZER' && (
          <Link
            to="/tournaments/new"
            className="rounded-sm bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
          >
            + Create Tournament
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-3 rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-4 sm:flex-row">
        <select value={sport} onChange={(e) => { setSport(e.target.value as Sport | ''); updateParams('sport', e.target.value); }} className={selectClass}>
          <option value="">All Sports</option>
          <option value="PADEL">Padel</option>
          <option value="TENNIS">Tennis</option>
          <option value="SQUASH">Squash</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value as TournamentStatus | ''); updateParams('status', e.target.value); }} className={selectClass}>
          <option value="">All Statuses</option>
          <option value="REGISTRATION_OPEN">Registration Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); updateParams('search', e.target.value); }}
          placeholder="Search tournaments…"
          className="flex-1 rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] px-4 py-2.5 text-sm text-black placeholder-[#6d6358] outline-none focus:border-[#c4a47a]"
        />
      </div>

      {error && (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-sm bg-[#f8f4ed]" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] py-16 text-center">
          <p className="text-[#6d6358]">No tournaments found.</p>
          <p className="mt-1 text-sm text-[#6d6358]">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      )}
    </div>
  );
}
