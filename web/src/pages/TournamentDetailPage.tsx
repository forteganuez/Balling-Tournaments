import { useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTournament } from '../hooks/useTournaments';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import SportIcon from '../components/SportIcon';
import Countdown from '../components/Countdown';
import BracketView from '../components/BracketView';
import RoundRobinView from '../components/RoundRobinView';
import { formatCentsToEuros } from '../components/TournamentCard';

const formatLabels: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elimination',
  DOUBLE_ELIMINATION: 'Double Elimination',
  ROUND_ROBIN: 'Round Robin',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  REGISTRATION_OPEN: { label: 'Registration Open', color: 'text-[#8a6838]' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-600' },
  COMPLETED: { label: 'Completed', color: 'text-[#6d6358]' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-600' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { tournament, loading, error } = useTournament(id!);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const rawPaymentStatus = searchParams.get('payment');
  const paymentStatus =
    rawPaymentStatus === 'success' || rawPaymentStatus === 'cancelled'
      ? rawPaymentStatus
      : null;

  const playerMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (tournament?.registrations) {
      for (const reg of tournament.registrations) {
        if (reg.user) map[reg.userId] = reg.user.name;
      }
    }
    return map;
  }, [tournament?.registrations]);

  const isRegistered = useMemo(
    () => !!user && !!tournament?.registrations?.some((r) => r.userId === user.id),
    [user, tournament?.registrations]
  );

  const spotsUsed = tournament?._count?.registrations ?? tournament?.registrations?.length ?? 0;
  const isFull = tournament ? spotsUsed >= tournament.maxPlayers : false;

  const handleJoin = async () => {
    if (!tournament) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await api.post<{ url: string }>(`/api/tournaments/${tournament.id}/join`);
      const parsed = new URL(res.data.url, window.location.origin);
      const isSameOrigin = parsed.origin === window.location.origin;
      const isTrustedPayment = parsed.hostname.endsWith('.stripe.com');
      if (!isSameOrigin && !isTrustedPayment) throw new Error('Unexpected redirect URL');
      window.location.href = res.data.url;
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#f3eee5] flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#c4a47a] border-t-transparent" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="bg-[#f3eee5] text-[#191510] mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-red-600">{error ?? 'Tournament not found'}</p>
        <Link to="/tournaments" className="mt-4 inline-block text-black hover:underline">
          ← Back to Tournaments
        </Link>
      </div>
    );
  }

  const statusInfo = statusLabels[tournament.status] ?? statusLabels.COMPLETED;

  return (
    <div className="bg-[#f3eee5] text-[#191510] mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Payment banner */}
      {paymentStatus === 'success' && (
        <div className="mb-6 rounded-sm border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          Payment successful! You are now registered.
        </div>
      )}
      {paymentStatus === 'cancelled' && (
        <div className="mb-6 rounded-sm border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-700">
          Payment was cancelled. You can try joining again.
        </div>
      )}

      <Link to="/tournaments" className="mb-6 inline-flex items-center gap-1 text-sm text-[#6d6358] hover:text-black">
        ← Back to Tournaments
      </Link>

      {/* Info card */}
      <div className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <SportIcon sport={tournament.sport} className="text-3xl" />
            <div>
              <h1 className="text-2xl font-bold text-black sm:text-3xl">{tournament.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                <span className="rounded border border-[#d8ccb9] px-2 py-0.5 text-xs text-[#6d6358]">
                  {formatLabels[tournament.format] ?? tournament.format}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#8a6838]">
              {tournament.entryFee === 0 ? 'Free' : formatCentsToEuros(tournament.entryFee)}
            </p>
            <p className="text-xs text-[#6d6358]">entry fee</p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 border-t border-[#d8ccb9] pt-6 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-black">{formatDate(tournament.date)}</p>
            <p className="text-xs text-[#6d6358]">Date &amp; Time</p>
          </div>
          <div>
            <p className="text-sm font-medium text-black">{tournament.location}</p>
            {tournament.venue && <p className="text-xs text-[#6d6358]">{tournament.venue}</p>}
          </div>
        </div>

        {tournament.description && (
          <div className="mb-6">
            <h3 className="mb-1 text-sm font-semibold text-[#6d6358]">About</h3>
            <p className="text-sm leading-relaxed text-black">{tournament.description}</p>
          </div>
        )}

        {(tournament.status === 'REGISTRATION_OPEN' || tournament.status === 'IN_PROGRESS') && (
          <div className="mb-6"><Countdown targetDate={tournament.date} /></div>
        )}

        {/* Spots progress */}
        <div className="mb-6">
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-black">{spotsUsed} / {tournament.maxPlayers} spots filled</span>
            <span className="text-[#6d6358]">{tournament.maxPlayers - spotsUsed} remaining</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#e2d7c7]">
            <div
              className="h-full rounded-full bg-[#8a6838] transition-all"
              style={{ width: `${Math.min((spotsUsed / tournament.maxPlayers) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Players */}
        {tournament.registrations && tournament.registrations.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-semibold text-[#6d6358]">Registered Players</h3>
            <div className="flex flex-wrap gap-2">
              {tournament.registrations.slice(0, 8).map((reg) => (
                <span key={reg.id} className="rounded-full border border-[#d8ccb9] bg-[#f7f2ea] px-3 py-1 text-sm text-black">
                  {reg.user?.name ?? 'Player'}
                </span>
              ))}
              {tournament.registrations.length > 8 && (
                <span className="rounded-full border border-[#d8ccb9] bg-[#f7f2ea] px-3 py-1 text-sm text-[#6d6358]">
                  +{tournament.registrations.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Join action */}
        <div className="border-t border-[#d8ccb9] pt-6">
          {joinError && (
            <div className="mb-3 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {joinError}
            </div>
          )}
          {tournament.status === 'REGISTRATION_OPEN' && (
            <>
              {!user && (
                <Link to="/login" className="inline-block rounded-sm bg-black px-6 py-3 font-semibold text-white hover:bg-black/90">
                  Log in to Join
                </Link>
              )}
              {user && isRegistered && (
                <span className="inline-flex items-center gap-2 rounded-sm border border-[#b99763] bg-[#efe4d2] px-6 py-3 font-semibold text-[#8a6838]">
                  ✓ You&apos;re Registered
                </span>
              )}
              {user && !isRegistered && !isFull && (
                <button
                  onClick={() => void handleJoin()}
                  disabled={joining}
                  className="rounded-sm bg-black px-6 py-3 font-semibold text-white hover:bg-black/90 disabled:opacity-60"
                >
                  {joining ? 'Redirecting to payment…' : `Join — ${tournament.entryFee === 0 ? 'Free' : formatCentsToEuros(tournament.entryFee)}`}
                </button>
              )}
              {user && !isRegistered && isFull && (
                <span className="rounded-sm border border-[#d8ccb9] px-6 py-3 font-semibold text-[#6d6358]">
                  Tournament Full
                </span>
              )}
            </>
          )}
          {tournament.status === 'CANCELLED' && (
            <p className="text-sm font-medium text-red-600">This tournament has been cancelled.</p>
          )}
        </div>
      </div>

      {/* Bracket */}
      {(tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') &&
        tournament.matches && tournament.matches.length > 0 && (
          <div className="mt-8 rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6 sm:p-8">
            <h2 className="mb-6 text-xl font-bold text-black">
              {tournament.status === 'COMPLETED' ? 'Final Results' : 'Live Bracket'}
            </h2>
            {tournament.format === 'ROUND_ROBIN' ? (
              <RoundRobinView matches={tournament.matches} players={playerMap} />
            ) : (
              <BracketView matches={tournament.matches} players={playerMap} highlightPlayerId={user?.id} />
            )}
          </div>
        )}

      {tournament.organizer && (
        <div className="mt-6 text-center text-sm text-[#6d6358]">
          Organized by <span className="font-medium text-black">{tournament.organizer.name}</span>
        </div>
      )}
    </div>
  );
}
