import { Link } from 'react-router-dom';
import type { Tournament } from '../lib/types';
import SportIcon from './SportIcon';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatCentsToEuros(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

const formatLabels: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elim',
  DOUBLE_ELIMINATION: 'Double Elim',
  ROUND_ROBIN: 'Round Robin',
};

const statusStyles: Record<string, { text: string; label: string }> = {
  REGISTRATION_OPEN: { text: 'text-accent', label: 'Open' },
  IN_PROGRESS: { text: 'text-yellow-400', label: 'In Progress' },
  COMPLETED: { text: 'text-muted', label: 'Completed' },
  CANCELLED: { text: 'text-red-400', label: 'Cancelled' },
};

interface Props {
  tournament: Tournament;
}

export default function TournamentCard({ tournament }: Props) {
  const status = statusStyles[tournament.status] ?? statusStyles.COMPLETED;
  const spotsUsed = tournament._count?.registrations ?? 0;
  const fillPct = Math.min((spotsUsed / tournament.maxPlayers) * 100, 100);

  return (
    <Link
      to={`/tournaments/${tournament.id}`}
      className="block rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <SportIcon sport={tournament.sport} className="text-2xl" />
          <h3 className="font-semibold text-primary">{tournament.name}</h3>
        </div>
        <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
      </div>

      <div className="mb-4 space-y-1 text-sm text-muted">
        <p>{tournament.location}{tournament.venue ? ` · ${tournament.venue}` : ''}</p>
        <p>{formatDate(tournament.date)}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="rounded border border-border px-2 py-0.5 text-xs text-muted">
          {formatLabels[tournament.format] ?? tournament.format}
        </span>
        <div className="text-right">
          <p className="text-sm font-semibold text-primary">
            {tournament.entryFee === 0 ? 'Free' : formatCentsToEuros(tournament.entryFee)}
          </p>
          <p className="text-xs text-muted">{spotsUsed}/{tournament.maxPlayers} spots</p>
        </div>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </Link>
  );
}
