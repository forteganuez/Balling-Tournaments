import { Link } from 'react-router-dom';
import type { Tournament } from '../lib/types';
import SportIcon from './SportIcon';
import { TOURNAMENT_FORMAT_SHORT_LABELS, TOURNAMENT_STATUS_MAP } from '../lib/constants';

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

interface Props {
  tournament: Tournament;
}

export default function TournamentCard({ tournament }: Props) {
  const statusEntry = TOURNAMENT_STATUS_MAP[tournament.status] ?? TOURNAMENT_STATUS_MAP.COMPLETED;
  const status = { text: statusEntry.color, label: statusEntry.shortLabel };
  const spotsUsed = tournament._count?.registrations ?? 0;
  const fillPct = Math.min((spotsUsed / tournament.maxPlayers) * 100, 100);

  return (
    <Link
      to={`/tournaments/${tournament.id}`}
      className="block rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6 text-[#191510] transition hover:border-[#b99763] hover:bg-[#fbf7f1]"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <SportIcon sport={tournament.sport} className="text-2xl" />
          <h3 className="font-serif text-2xl text-black">{tournament.name}</h3>
        </div>
        <span className={`text-xs font-medium uppercase tracking-[0.18em] ${status.text}`}>{status.label}</span>
      </div>

      <div className="mb-5 space-y-1 text-sm text-[#6d6358]">
        <p>{tournament.location}{tournament.venue ? ` · ${tournament.venue}` : ''}</p>
        <p>{formatDate(tournament.date)}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="rounded-sm border border-[#d8ccb9] px-2.5 py-1 text-xs uppercase tracking-[0.16em] text-[#6d6358]">
          {TOURNAMENT_FORMAT_SHORT_LABELS[tournament.format] ?? tournament.format}
        </span>
        <div className="text-right">
          <p className="font-serif text-2xl text-black">
            {tournament.entryFee === 0 ? 'Free' : formatCentsToEuros(tournament.entryFee)}
          </p>
          <p className="text-xs text-[#6d6358]">{spotsUsed}/{tournament.maxPlayers} spots</p>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#e2d7c7]">
        <div
          className="h-full rounded-full bg-[#8a6838] transition-all"
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </Link>
  );
}
