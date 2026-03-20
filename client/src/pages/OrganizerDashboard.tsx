import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { useTournaments } from '../hooks/useTournaments';
import SportIcon from '../components/SportIcon';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCentsToEuros(cents: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  REGISTRATION_OPEN: { bg: 'bg-green-100', text: 'text-green-800', label: 'Open' },
  IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
};

export default function OrganizerDashboard() {
  const { user } = useAuthContext();
  const { tournaments: allTournaments, loading, error } = useTournaments();

  const myTournaments = useMemo(() => {
    if (!user) return [];
    return allTournaments.filter((t) => t.organizerId === user.id);
  }, [allTournaments, user]);

  const stats = useMemo(() => {
    let totalPlayers = 0;
    let totalRevenue = 0;

    for (const t of myTournaments) {
      const regCount = t._count?.registrations ?? 0;
      totalPlayers += regCount;
      totalRevenue += t.entryFee * regCount;
    }

    return {
      totalTournaments: myTournaments.length,
      totalPlayers,
      totalRevenue,
    };
  }, [myTournaments]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Organizer Dashboard
        </h1>
        <Link
          to="/organizer/create"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Tournament
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-md">
          <p className="text-sm font-medium text-gray-500">Tournaments</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {stats.totalTournaments}
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-md">
          <p className="text-sm font-medium text-gray-500">Total Players</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            {stats.totalPlayers}
          </p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-md">
          <p className="text-sm font-medium text-gray-500">Total Revenue</p>
          <p className="mt-1 text-3xl font-bold text-primary-600">
            {formatCentsToEuros(stats.totalRevenue)}
          </p>
        </div>
      </div>

      {/* Tournaments list */}
      {myTournaments.length === 0 ? (
        <div className="rounded-xl bg-white py-16 text-center shadow-md">
          <p className="text-gray-500">
            You haven&apos;t created any tournaments yet.
          </p>
          <Link
            to="/organizer/create"
            className="mt-4 inline-block text-primary-600 hover:text-primary-700"
          >
            Create your first tournament &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myTournaments.map((t) => {
            const st = statusStyles[t.status] ?? statusStyles.COMPLETED;
            const regCount = t._count?.registrations ?? 0;
            return (
              <div
                key={t.id}
                className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-md sm:flex-row sm:items-center"
              >
                <SportIcon sport={t.sport} className="text-2xl" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-gray-900">
                    {t.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(t.date)} &middot; {t.location} &middot;{' '}
                    {regCount}/{t.maxPlayers} players
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${st.bg} ${st.text}`}
                >
                  {st.label}
                </span>
                <Link
                  to={`/organizer/tournament/${t.id}`}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Manage
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
