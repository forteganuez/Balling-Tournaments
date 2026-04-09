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
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const playerMap: Record<string, string> = {};
  if (tournament?.registrations) {
    for (const reg of tournament.registrations) {
      if (reg.user) playerMap[reg.userId] = reg.user.name;
    }
  }

  const requestAction = (key: string) => {
    setConfirmKey(key);
  };

  const doAction = async (path: string, key: string) => {
    setConfirmKey(null);
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
      <div className="bg-[#f3eee5] flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#c4a47a] border-t-transparent" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="bg-[#f3eee5] text-[#191510] mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-red-600">{error ?? 'Tournament not found'}</p>
        <Link to="/organizer" className="mt-4 inline-block text-black hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div className="bg-[#f3eee5] text-[#191510] mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/organizer" className="text-sm text-[#6d6358] hover:text-black">← Organizer Dashboard</Link>
          <h1 className="mt-1 text-2xl font-bold text-black">{tournament.name}</h1>
          <p className="text-sm text-[#6d6358] capitalize">{tournament.status.replace('_', ' ').toLowerCase()}</p>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/tournaments/${id}`}
            className="rounded-sm border border-[#d8ccb9] px-4 py-2 text-sm text-[#6d6358] hover:border-[#c4a47a] hover:text-black"
          >
            View Public Page
          </Link>
          {tournament.status === 'REGISTRATION_OPEN' && (
            confirmKey === 'close' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6d6358]">Close registration and generate bracket?</span>
                <button
                  onClick={() => void doAction('close-registration', 'close')}
                  disabled={actionLoading === 'close'}
                  className="rounded-sm bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-60"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmKey(null)}
                  className="rounded-sm border border-[#d8ccb9] px-3 py-2 text-sm text-[#6d6358] hover:border-[#c4a47a]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => requestAction('close')}
                disabled={actionLoading === 'close'}
                className="rounded-sm bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-60"
              >
                {actionLoading === 'close' ? 'Closing…' : 'Close Registration'}
              </button>
            )
          )}
          {(tournament.status === 'REGISTRATION_OPEN' || tournament.status === 'IN_PROGRESS') && (
            confirmKey === 'cancel' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">This cannot be undone.</span>
                <button
                  onClick={() => void doAction('cancel', 'cancel')}
                  disabled={actionLoading === 'cancel'}
                  className="rounded-sm border border-red-400 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                >
                  Confirm Cancel
                </button>
                <button
                  onClick={() => setConfirmKey(null)}
                  className="rounded-sm border border-[#d8ccb9] px-3 py-2 text-sm text-[#6d6358] hover:border-[#c4a47a]"
                >
                  Keep
                </button>
              </div>
            ) : (
              <button
                onClick={() => requestAction('cancel')}
                disabled={actionLoading === 'cancel'}
                className="rounded-sm border border-red-300 px-4 py-2 text-sm text-red-600 hover:border-red-400 disabled:opacity-60"
              >
                {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel Tournament'}
              </button>
            )
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Registrations */}
      <div className="mb-8 rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6">
        <h2 className="mb-4 text-lg font-semibold text-black">
          Registrations ({tournament._count?.registrations ?? tournament.registrations?.length ?? 0} / {tournament.maxPlayers})
        </h2>
        {!tournament.registrations || tournament.registrations.length === 0 ? (
          <p className="text-sm text-[#6d6358]">No registrations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#d8ccb9]">
                  <th className="py-2 pr-4 text-left text-xs font-semibold uppercase text-[#6d6358]">Player</th>
                  <th className="py-2 pr-4 text-left text-xs font-semibold uppercase text-[#6d6358]">Email</th>
                  <th className="py-2 text-left text-xs font-semibold uppercase text-[#6d6358]">Paid</th>
                </tr>
              </thead>
              <tbody>
                {tournament.registrations.map((reg) => (
                  <tr key={reg.id} className="border-b border-[#e2d7c7]">
                    <td className="py-2 pr-4 font-medium text-black">{reg.user?.name ?? '—'}</td>
                    <td className="py-2 pr-4 text-[#6d6358]">{tournament.entryFee === 0 ? 'Free' : (reg.paidAt ? formatCentsToEuros(tournament.entryFee) : 'Pending')}</td>
                    <td className="py-2 text-[#6d6358]">{reg.paidAt ? new Date(reg.paidAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Match result entry */}
      {tournament.status === 'IN_PROGRESS' && tournament.matches && tournament.matches.length > 0 && (
        <div className="mb-8 rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6">
          <h2 className="mb-4 text-lg font-semibold text-black">Enter Match Result</h2>
          <form onSubmit={(e) => void submitResult(e)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase text-[#6d6358]">Match</label>
              <select
                value={resultForm.matchId}
                onChange={(e) => setResultForm((f) => ({ ...f, matchId: e.target.value, winnerId: '' }))}
                className="w-full rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] px-3 py-2 text-sm text-black outline-none focus:border-[#c4a47a]"
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
              <label className="mb-1.5 block text-xs font-semibold uppercase text-[#6d6358]">Winner</label>
              <select
                value={resultForm.winnerId}
                onChange={(e) => setResultForm((f) => ({ ...f, winnerId: e.target.value }))}
                disabled={!selectedMatch}
                className="w-full rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] px-3 py-2 text-sm text-black outline-none focus:border-[#c4a47a] disabled:opacity-50"
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
              <label className="mb-1.5 block text-xs font-semibold uppercase text-[#6d6358]">Score (optional)</label>
              <input
                type="text"
                value={resultForm.score}
                onChange={(e) => setResultForm((f) => ({ ...f, score: e.target.value }))}
                placeholder="6-3, 6-4"
                className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] px-3 py-2 text-sm text-black outline-none focus:border-[#c4a47a]"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading === 'result' || !resultForm.matchId || !resultForm.winnerId}
              className="rounded-sm bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-60"
            >
              {actionLoading === 'result' ? 'Saving…' : 'Save Result'}
            </button>
          </form>
        </div>
      )}

      {/* Bracket */}
      {tournament.matches && tournament.matches.length > 0 && (
        <div className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6">
          <h2 className="mb-4 text-lg font-semibold text-black">Bracket</h2>
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
