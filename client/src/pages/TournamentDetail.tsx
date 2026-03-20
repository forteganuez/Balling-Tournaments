import { useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTournament } from '../hooks/useTournaments';
import { useAuthContext } from '../context/AuthContext';
import { joinTournament } from '../lib/api';
import SportIcon from '../components/SportIcon';
import Countdown from '../components/Countdown';
import BracketView from '../components/BracketView';
import RoundRobinView from '../components/RoundRobinView';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCentsToEuros(cents: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

const formatLabels: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  ROUND_ROBIN: 'Round Robin',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  REGISTRATION_OPEN: { label: 'Registration Open', color: 'bg-green-100 text-green-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuthContext();
  const { tournament, loading, error, refetch } = useTournament(id!);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const paymentStatus = searchParams.get('payment');

  // Build player name map from registrations
  const playerMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (tournament?.registrations) {
      for (const reg of tournament.registrations) {
        if (reg.user) {
          map[reg.userId] = reg.user.name;
        }
      }
    }
    return map;
  }, [tournament?.registrations]);

  const isRegistered = useMemo(() => {
    if (!user || !tournament?.registrations) return false;
    return tournament.registrations.some((r) => r.userId === user.id);
  }, [user, tournament?.registrations]);

  const spotsUsed = tournament?._count?.registrations ?? tournament?.registrations?.length ?? 0;
  const isFull = tournament ? spotsUsed >= tournament.maxPlayers : false;

  const handleJoin = async () => {
    if (!tournament) return;
    setJoining(true);
    setJoinError('');
    try {
      const { url } = await joinTournament(tournament.id);
      window.location.href = url;
    } catch (err: unknown) {
      setJoinError(
        err instanceof Error ? err.message : 'Failed to join tournament'
      );
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-lg text-red-600">
          {error || 'Tournament not found'}
        </p>
        <Link
          to="/tournaments"
          className="mt-4 inline-block text-primary-600 hover:text-primary-700"
        >
          &larr; Back to Tournaments
        </Link>
      </div>
    );
  }

  const statusInfo = statusLabels[tournament.status] ?? statusLabels.COMPLETED;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Payment banners */}
      {paymentStatus === 'success' && (
        <div className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          Payment successful! You are now registered for this tournament.
        </div>
      )}
      {paymentStatus === 'cancelled' && (
        <div className="mb-6 rounded-lg bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
          Payment was cancelled. You can try joining again.
        </div>
      )}

      {/* Back link */}
      <Link
        to="/tournaments"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Tournaments
      </Link>

      {/* Tournament info card */}
      <div className="rounded-xl bg-white p-6 shadow-md sm:p-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <SportIcon sport={tournament.sport} className="text-3xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {tournament.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {formatLabels[tournament.format] ?? tournament.format}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-600">
              {formatCentsToEuros(tournament.entryFee)}
            </p>
            <p className="text-xs text-gray-500">entry fee</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="mb-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">{formatDate(tournament.date)}</p>
              <p className="text-xs text-gray-500">Date &amp; Time</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">{tournament.location}</p>
              {tournament.venue && (
                <p className="text-xs text-gray-500">{tournament.venue}</p>
              )}
            </div>
          </div>
        </div>

        {tournament.description && (
          <div className="mb-6">
            <h3 className="mb-1 text-sm font-semibold text-gray-700">About</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              {tournament.description}
            </p>
          </div>
        )}

        {/* Countdown */}
        {(tournament.status === 'REGISTRATION_OPEN' || tournament.status === 'IN_PROGRESS') && (
          <div className="mb-6">
            <Countdown targetDate={tournament.date} />
          </div>
        )}

        {/* Registration progress */}
        <div className="mb-6">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              {spotsUsed} / {tournament.maxPlayers} spots filled
            </span>
            <span className="text-gray-500">
              {tournament.maxPlayers - spotsUsed} remaining
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{
                width: `${Math.min((spotsUsed / tournament.maxPlayers) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Players list */}
        {tournament.registrations && tournament.registrations.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Registered Players
            </h3>
            <div className="flex flex-wrap gap-2">
              {tournament.registrations.slice(0, 8).map((reg) => (
                <span
                  key={reg.id}
                  className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
                >
                  {reg.user?.name ?? 'Player'}
                </span>
              ))}
              {tournament.registrations.length > 8 && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500">
                  +{tournament.registrations.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="border-t border-gray-100 pt-6">
          {joinError && (
            <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {joinError}
            </div>
          )}

          {tournament.status === 'REGISTRATION_OPEN' && (
            <>
              {!user ? (
                <Link
                  to="/login"
                  className="inline-block rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
                >
                  Log in to Join
                </Link>
              ) : isRegistered ? (
                <button
                  disabled
                  className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-6 py-3 font-semibold text-green-800"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  You&apos;re Registered
                </button>
              ) : isFull ? (
                <button
                  disabled
                  className="rounded-lg bg-gray-200 px-6 py-3 font-semibold text-gray-500"
                >
                  Tournament Full
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
                >
                  {joining ? 'Redirecting to payment...' : `Join Tournament \u2014 ${formatCentsToEuros(tournament.entryFee)}`}
                </button>
              )}
            </>
          )}

          {tournament.status === 'CANCELLED' && (
            <p className="text-sm font-medium text-red-600">
              This tournament has been cancelled.
            </p>
          )}
        </div>
      </div>

      {/* Bracket / Results section */}
      {(tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') &&
        tournament.matches &&
        tournament.matches.length > 0 && (
          <div className="mt-8 rounded-xl bg-white p-6 shadow-md sm:p-8">
            <h2 className="mb-6 text-xl font-bold text-gray-900">
              {tournament.status === 'COMPLETED' ? 'Final Results' : 'Live Bracket'}
            </h2>
            {tournament.format === 'ROUND_ROBIN' ? (
              <RoundRobinView matches={tournament.matches} players={playerMap} />
            ) : (
              <BracketView
                matches={tournament.matches}
                players={playerMap}
                highlightPlayerId={user?.id}
              />
            )}
          </div>
        )}

      {/* Organizer info */}
      {tournament.organizer && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Organized by{' '}
          <span className="font-medium text-gray-700">
            {tournament.organizer.name}
          </span>
        </div>
      )}
    </div>
  );
}
