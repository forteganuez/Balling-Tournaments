import { Link } from 'react-router-dom';
import { useMyTournaments } from '../hooks/useTournaments';
import { useAuth } from '../context/AuthContext';
import SportIcon from '../components/SportIcon';
import { formatCentsToEuros } from '../components/TournamentCard';

const statusColors: Record<string, string> = {
  REGISTRATION_OPEN: 'text-accent',
  IN_PROGRESS: 'text-yellow-400',
  COMPLETED: 'text-muted',
  CANCELLED: 'text-red-400',
};

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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Organizer Dashboard</h1>
          <p className="mt-1 text-muted">{user?.name}</p>
        </div>
        <Link
          to="/tournaments/new"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-600"
        >
          + New Tournament
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-surface p-5 text-center">
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tournament list */}
      <h2 className="mb-4 text-lg font-semibold text-primary">Your Tournaments</h2>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-12 text-center">
          <p className="text-muted">No tournaments yet.</p>
          <Link to="/tournaments/new" className="mt-3 inline-block text-sm text-accent hover:underline">
            Create your first tournament
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <SportIcon sport={t.sport} className="text-xl" />
                <div>
                  <p className="font-semibold text-primary">{t.name}</p>
                  <p className={`text-xs ${statusColors[t.status] ?? 'text-muted'}`}>
                    {t.status.replace('_', ' ')} · {t._count?.registrations ?? 0}/{t.maxPlayers} players
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">{formatCentsToEuros(t.entryFee)}</span>
                <Link
                  to={`/tournaments/${t.id}/manage`}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-primary"
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
