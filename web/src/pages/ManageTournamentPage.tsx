import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTournament } from '../hooks/useTournaments';
import { api } from '../api/client';
import BracketView from '../components/BracketView';
import RoundRobinView from '../components/RoundRobinView';
import { formatCentsToEuros } from '../components/TournamentCard';
import type { Match } from '../lib/types';

export default function ManageTournamentPage() {
  const { id } = useParams<{ id: string }>();
  const { tournament, loading, error, refetch } = useTournament(id!);

  const [resultForm, setResultForm] = useState<{ matchId: string; winnerId: string; score: string }>({
    matchId: '', winnerId: '', score: '',
  });
  const [actionLoading, setActionLoading] = useState('');
  const [actionError, setActionError] = useState('');

  const playerMap: Record<string, string> = {};
  if (tournament?.registrations) {
    for (const reg of tournament.registrations) {
      if (reg.user) playerMap[reg.userId] = reg.user.name;
    }
  }

  const doAction = async (path: string, key: string, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    setActionLoading(key);
    setActionError('');
    try {
      await api.post(`/api/tournaments/${id}/${path}`);
      await refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading('');
    }
  };

  const submitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultForm.matchId || !resultForm.winnerId) return;
    setActionLoading('result');
    setActionError('');
    try {
      await api.put(`/api/matches/${resultForm.matchId}/result`, {
        winnerId: resultForm.winnerId,
        score: resultForm.score || undefined,
      });
      setResultForm({ matchId: '', winnerId: '', score: '' });
      await refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to save result');
    } finally {
      setActionLoading('');
    }
  };

  const selectedMatch = tournament?.matches?.find((m) => m.id === resultForm.matchId) as Match | undefined;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-red-400">{error ?? 'Tournament not found'}</p>
        <Link to="/organizer" className="mt-4 inline-block text-accent hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/organizer" className="text-sm text-muted hover:text-primary">← Organizer Dashboard</Link>
          <h1 className="mt-1 text-2xl font-bold text-primary">{tournament.name}</h1>
          <p className="text-sm text-muted capitalize">{tournament.status.replace('_', ' ').toLowerCase()}</p>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/tournaments/${id}`}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:border-accent hover:text-primary"
          >
            View Public Page
          </Link>
          {tournament.status === 'REGISTRATION_OPEN' && (
            <button
              onClick={() => void doAction('close-registration', 'close', 'Close registration and generate bracket?')}
              disabled={actionLoading === 'close'}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
            >
              {actionLoading === 'close' ? 'Closing…' : 'Close Registration'}
            </button>
          )}
          {(tournament.status === 'REGISTRATION_OPEN' || tournament.status === 'IN_PROGRESS') && (
            <button
              onClick={() => void doAction('cancel', 'cancel', 'Cancel this tournament? This cannot be undone.')}
              disabled={actionLoading === 'cancel'}
              className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-400 hover:border-red-400 disabled:opacity-60"
            >
              {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel Tournament'}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* Registrations */}
      <div className="mb-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-primary">
          Registrations ({tournament._count?.registrations ?? tournament.registrations?.length ?? 0} / {tournament.maxPlayers})
        </h2>
        {!tournament.registrations || tournament.registrations.length === 0 ? (
          <p className="text-sm text-muted">No registrations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left text-xs font-semibold uppercase text-muted">Player</th>
                  <th className="py-2 pr-4 text-left text-xs font-semibold uppercase text-muted">Email</th>
                  <th className="py-2 text-left text-xs font-semibold uppercase text-muted">Paid</th>
                </tr>
              </thead>
              <tbody>
                {tournament.registrations.map((reg) => (
                  <tr key={reg.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium text-primary">{reg.user?.name ?? '—'}</td>
                    <td className="py-2 pr-4 text-muted">{tournament.entryFee === 0 ? 'Free' : (reg.paidAt ? formatCentsToEuros(tournament.entryFee) : 'Pending')}</td>
                    <td className="py-2 text-muted">{reg.paidAt ? new Date(reg.paidAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Match result entry */}
      {tournament.status === 'IN_PROGRESS' && tournament.matches && tournament.matches.length > 0 && (
        <div className="mb-8 rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-primary">Enter Match Result</h2>
          <form onSubmit={(e) => void submitResult(e)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase text-muted">Match</label>
              <select
                value={resultForm.matchId}
                onChange={(e) => setResultForm((f) => ({ ...f, matchId: e.target.value, winnerId: '' }))}
                className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-primary outline-none focus:border-accent"
              >
                <option value="">Select match…</option>
                {tournament.matches
                  .filter((m) => m.player1Id && m.player2Id && !m.winnerId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      R{m.round} P{m.position}: {playerMap[m.player1Id!] ?? 'TBD'} vs {playerMap[m.player2Id!] ?? 'TBD'}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase text-muted">Winner</label>
              <select
                value={resultForm.winnerId}
                onChange={(e) => setResultForm((f) => ({ ...f, winnerId: e.target.value }))}
                disabled={!selectedMatch}
                className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-primary outline-none focus:border-accent disabled:opacity-50"
              >
                <option value="">Select winner…</option>
                {selectedMatch?.player1Id && (
                  <option value={selectedMatch.player1Id}>{playerMap[selectedMatch.player1Id] ?? 'Player 1'}</option>
                )}
                {selectedMatch?.player2Id && (
                  <option value={selectedMatch.player2Id}>{playerMap[selectedMatch.player2Id] ?? 'Player 2'}</option>
                )}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase text-muted">Score (optional)</label>
              <input
                type="text"
                value={resultForm.score}
                onChange={(e) => setResultForm((f) => ({ ...f, score: e.target.value }))}
                placeholder="6-3, 6-4"
                className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-primary outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading === 'result' || !resultForm.matchId || !resultForm.winnerId}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
            >
              {actionLoading === 'result' ? 'Saving…' : 'Save Result'}
            </button>
          </form>
        </div>
      )}

      {/* Bracket */}
      {tournament.matches && tournament.matches.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-primary">Bracket</h2>
          {tournament.format === 'ROUND_ROBIN' ? (
            <RoundRobinView matches={tournament.matches} players={playerMap} />
          ) : (
            <BracketView matches={tournament.matches} players={playerMap} />
          )}
        </div>
      )}
    </div>
  );
}
