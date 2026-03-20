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

function formatCentsToEuros(cents: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

const formatLabels: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elim',
  DOUBLE_ELIMINATION: 'Double Elim',
  ROUND_ROBIN: 'Round Robin',
};

const statusStyles: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  REGISTRATION_OPEN: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    label: 'Open',
  },
  IN_PROGRESS: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    label: 'In Progress',
  },
  COMPLETED: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: 'Completed',
  },
  CANCELLED: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    label: 'Cancelled',
  },
};

interface Props {
  tournament: Tournament;
}

export default function TournamentCard({ tournament }: Props) {
  const status = statusStyles[tournament.status] ?? statusStyles.COMPLETED;
  const spotsUsed = tournament._count?.registrations ?? 0;

  return (
    <Link
      to={`/tournaments/${tournament.id}`}
      className="block rounded-xl bg-white p-6 shadow-md transition-shadow hover:shadow-lg"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <SportIcon sport={tournament.sport} className="text-2xl" />
          <h3 className="text-lg font-semibold text-gray-900">
            {tournament.name}
          </h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mb-4 space-y-1 text-sm text-gray-500">
        <p className="flex items-center gap-1.5">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          {tournament.location}
          {tournament.venue && ` - ${tournament.venue}`}
        </p>
        <p className="flex items-center gap-1.5">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
          {formatDate(tournament.date)}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          {formatLabels[tournament.format] ?? tournament.format}
        </span>

        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">
            {formatCentsToEuros(tournament.entryFee)}
          </p>
          <p className="text-xs text-gray-500">
            {spotsUsed}/{tournament.maxPlayers} spots
          </p>
        </div>
      </div>

      {/* Spots filled progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-primary-500 transition-all"
          style={{
            width: `${Math.min(
              (spotsUsed / tournament.maxPlayers) * 100,
              100
            )}%`,
          }}
        />
      </div>
    </Link>
  );
}
