import { Link } from 'react-router-dom';
import { useMyTournaments } from '../hooks/useTournaments';
import { useAuth } from '../context/AuthContext';
import SportIcon from '../components/SportIcon';
import { formatCentsToEuros } from '../components/TournamentCard';
import { TOURNAMENT_STATUS_MAP } from '../lib/constants';

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const { tournaments, loading, error } = useMyTournaments();

  const totalPlayers = tournaments.reduce((sum, t) => sum + (t._count?.registrations ?? 0), 0);
  const totalRevenue = tournaments.reduce((sum, t) => sum + (t._count?.registrations ?? 0) * t.entryFee, 0);

  const stats = [
    { label: 'Tournaments', value: tournaments.length },
    { label: 'Total Players', value: totalPlayers },
    { label: 'Revenue', value: formatCentsToEuros(totalRevenue) },
  ];

  return (
    <div className="bg-[#f3eee5] text-[#191510] mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Organizer Dashboard</h1>
          <p className="mt-1 text-[#6d6358]">{user?.name}</p>
        </div>
        <Link
          to="/tournaments/new"
          className="rounded-sm bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-black/90"
        >
          + New Tournament
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-5 text-center">
            <div className="text-2xl font-bold text-black">{s.value}</div>
            <div className="text-xs text-[#6d6358]">{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tournament list */}
      <h2 className="mb-4 text-lg font-semibold text-black">Your Tournaments</h2>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-sm bg-[#f8f4ed]" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] py-12 text-center">
          <p className="text-[#6d6358]">No tournaments yet.</p>
          <Link to="/tournaments/new" className="mt-3 inline-block text-sm text-black hover:underline">
            Create your first tournament
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <SportIcon sport={t.sport} className="text-xl" />
                <div>
                  <p className="font-semibold text-black">{t.name}</p>
                  <p className={`text-xs ${TOURNAMENT_STATUS_MAP[t.status]?.color ?? 'text-[#6d6358]'}`}>
                    {t.status.replace('_', ' ')} · {t._count?.registrations ?? 0}/{t.maxPlayers} players
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#6d6358]">{formatCentsToEuros(t.entryFee)}</span>
                <Link
                  to={`/tournaments/${t.id}/manage`}
                  className="rounded-sm border border-[#d8ccb9] px-3 py-1.5 text-sm text-[#6d6358] hover:border-[#c4a47a] hover:text-black"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
