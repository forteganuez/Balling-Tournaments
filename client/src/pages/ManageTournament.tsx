import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTournament } from '../hooks/useTournaments';
import {
  closeRegistration,
  cancelTournament,
  submitMatchResult,
} from '../lib/api';
import SportIcon from '../components/SportIcon';
import BracketView from '../components/BracketView';
import RoundRobinView from '../components/RoundRobinView';
import type { Match } from '../lib/types';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusLabels: Record<string, { label: string; color: string }> = {
  REGISTRATION_OPEN: { label: 'Registration Open', color: 'bg-green-100 text-green-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

// ── Match Result Form ────────────────────────────────────────────────

function MatchResultForm({
  match,
  players,
  onSubmitted,
}: {
  match: Match;
  players: Record<string, string>;
  onSubmitted: () => void;
}) {
  const [score, setScore] = useState(match.score || '');
  const [winnerId, setWinnerId] = useState(match.winnerId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!score.trim() || !winnerId) {
      setError('Please enter score and select a winner');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await submitMatchResult(match.id, score, winnerId);
      onSubmitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit result');
    } finally {
      setLoading(false);
    }
  };

  const p1Name = match.player1Id ? players[match.player1Id] || 'Player 1' : 'BYE';
  const p2Name = match.player2Id ? players[match.player2Id] || 'Player 2' : 'BYE';

  if (!match.player1Id || !match.player2Id) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
        R{match.round} M{match.position}: {p1Name} vs {p2Name} — Waiting for players
      </div>
    );
  }

  if (match.completedAt) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
        <span className="font-medium text-gray-900">
          R{match.round} M{match.position}:
        </span>{' '}
        <span className={match.winnerId === match.player1Id ? 'font-semibold text-primary-700' : 'text-gray-600'}>
          {p1Name}
        </span>
        {' vs '}
        <span className={match.winnerId === match.player2Id ? 'font-semibold text-primary-700' : 'text-gray-600'}>
          {p2Name}
        </span>
        {' — '}
        <span className="text-gray-700">{match.score}</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-white p-4"
    >
      <p className="mb-2 text-sm font-medium text-gray-900">
        R{match.round} M{match.position}: {p1Name} vs {p2Name}
      </p>
      {error && (
        <p className="mb-2 text-xs text-red-600">{error}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">Score</label>
          <input
            type="text"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="e.g. 6-3, 7-5"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">Winner</label>
          <select
            value={winnerId}
            onChange={(e) => setWinnerId(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select winner...</option>
            {match.player1Id && (
              <option value={match.player1Id}>{p1Name}</option>
            )}
            {match.player2Id && (
              <option value={match.player2Id}>{p2Name}</option>
            )}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function ManageTournament() {
  const { id } = useParams<{ id: string }>();
  const { tournament, loading, error, refetch } = useTournament(id!);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

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

  const handleCloseRegistration = useCallback(async () => {
    if (!tournament) return;
    setActionLoading(true);
    setActionError('');
    try {
      await closeRegistration(tournament.id);
      setConfirmClose(false);
      refetch();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to close registration'
      );
    } finally {
      setActionLoading(false);
    }
  }, [tournament, refetch]);

  const handleCancelTournament = useCallback(async () => {
    if (!tournament) return;
    setActionLoading(true);
    setActionError('');
    try {
      await cancelTournament(tournament.id);
      setConfirmCancel(false);
      refetch();
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to cancel tournament'
      );
    } finally {
      setActionLoading(false);
    }
  }, [tournament, refetch]);

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
        <p className="text-lg text-red-600">{error || 'Tournament not found'}</p>
        <Link
          to="/organizer"
          className="mt-4 inline-block text-primary-600 hover:text-primary-700"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  const statusInfo = statusLabels[tournament.status] ?? statusLabels.COMPLETED;
  const sortedMatches = [...(tournament.matches || [])].sort(
    (a, b) => a.round - b.round || a.position - b.position
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Back link */}
      <Link
        to="/organizer"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Tournament header */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <SportIcon sport={tournament.sport} className="text-3xl" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {tournament.name}
            </h1>
            <p className="text-sm text-gray-500">
              {formatDate(tournament.date)} &middot; {tournament.location}
              {tournament.venue && ` &middot; ${tournament.venue}`}
            </p>
          </div>
          <span className={`ml-auto inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {actionError && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Actions section */}
      {tournament.status === 'REGISTRATION_OPEN' && (
        <div className="mb-8 rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {!confirmClose ? (
              <button
                onClick={() => setConfirmClose(true)}
                className="rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
              >
                Close Registration &amp; Generate Brackets
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3">
                <p className="text-sm text-primary-800">
                  This will close registration and generate the bracket. Continue?
                </p>
                <button
                  onClick={handleCloseRegistration}
                  disabled={actionLoading}
                  className="rounded-md bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60"
                >
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirmClose(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}

            {!confirmCancel ? (
              <button
                onClick={() => setConfirmCancel(true)}
                className="rounded-lg border border-red-300 px-6 py-3 font-semibold text-red-700 transition-colors hover:bg-red-50"
              >
                Cancel Tournament
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-800">
                  This action cannot be undone. Cancel the tournament?
                </p>
                <button
                  onClick={handleCancelTournament}
                  disabled={actionLoading}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {actionLoading ? 'Processing...' : 'Yes, Cancel'}
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  No, Keep
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Registrations table */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Registrations ({tournament.registrations?.length ?? 0}/{tournament.maxPlayers})
        </h2>
        {tournament.registrations && tournament.registrations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Email</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Paid</th>
                </tr>
              </thead>
              <tbody>
                {tournament.registrations.map((reg, idx) => (
                  <tr key={reg.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {reg.user?.name ?? 'Unknown'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {reg.user?.email ?? '-'}
                    </td>
                    <td className="px-3 py-2">
                      {reg.paidAt ? (
                        <span className="inline-flex items-center gap-1 text-green-700">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {new Date(reg.paidAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No registrations yet.</p>
        )}
      </div>

      {/* Bracket visualization */}
      {(tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') &&
        tournament.matches &&
        tournament.matches.length > 0 && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Bracket</h2>
            {tournament.format === 'ROUND_ROBIN' ? (
              <RoundRobinView matches={tournament.matches} players={playerMap} />
            ) : (
              <BracketView matches={tournament.matches} players={playerMap} />
            )}
          </div>
        )}

      {/* Match results entry */}
      {tournament.status === 'IN_PROGRESS' &&
        tournament.matches &&
        tournament.matches.length > 0 && (
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Enter Match Results
            </h2>
            <div className="space-y-3">
              {sortedMatches.map((match) => (
                <MatchResultForm
                  key={match.id}
                  match={match}
                  players={playerMap}
                  onSubmitted={refetch}
                />
              ))}
            </div>
          </div>
        )}

      {/* Completed state */}
      {tournament.status === 'COMPLETED' && (
        <div className="rounded-xl bg-green-50 p-6 text-center shadow-md">
          <p className="text-lg font-semibold text-green-800">
            Tournament Complete!
          </p>
          <p className="mt-1 text-sm text-green-600">
            All matches have been played and results are final.
          </p>
        </div>
      )}
    </div>
  );
}
