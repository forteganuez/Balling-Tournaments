import { useMemo } from 'react';
import type { Match } from '../lib/types';

interface Props {
  matches: Match[];
  players: Record<string, string>;
}

interface Standing {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  points: number;
}

export default function RoundRobinView({ matches, players }: Props) {
  const playerIds = useMemo(() => Object.keys(players), [players]);

  const resultMap = useMemo(() => {
    const map: Record<string, Record<string, { score: string; won: boolean }>> = {};
    for (const m of matches) {
      if (!m.player1Id || !m.player2Id || !m.completedAt) continue;
      if (!map[m.player1Id]) map[m.player1Id] = {};
      if (!map[m.player2Id]) map[m.player2Id] = {};
      map[m.player1Id][m.player2Id] = { score: m.score ?? '-', won: m.winnerId === m.player1Id };
      map[m.player2Id][m.player1Id] = { score: m.score ?? '-', won: m.winnerId === m.player2Id };
    }
    return map;
  }, [matches]);

  const standings = useMemo(() => {
    const stats: Record<string, Standing> = {};
    for (const id of playerIds) {
      stats[id] = { playerId: id, name: players[id] ?? 'Unknown', wins: 0, losses: 0, points: 0 };
    }
    for (const m of matches) {
      if (!m.winnerId || !m.player1Id || !m.player2Id) continue;
      const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
      if (stats[m.winnerId]) { stats[m.winnerId].wins += 1; stats[m.winnerId].points += 3; }
      if (stats[loserId]) stats[loserId].losses += 1;
    }
    return Object.values(stats).sort((a, b) => b.points - a.points || b.wins - a.wins);
  }, [matches, playerIds, players]);

  if (!matches.length) {
    return <p className="py-8 text-center text-[#6d6358]">No round robin data yet.</p>;
  }

  const thClass = 'border border-[#d8ccb9] bg-[#f8f4ed] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#6d6358]';
  const tdClass = 'border border-[#d8ccb9] px-3 py-2 text-sm text-[#191510]';

  return (
    <div className="space-y-8">
      <div>
        <h4 className="mb-3 text-sm font-semibold text-[#6d6358]">Results Matrix</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Player</th>
                {playerIds.map((id) => (
                  <th key={id} className={thClass}>
                    <span className="block max-w-[80px] truncate">{players[id]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerIds.map((rowId) => (
                <tr key={rowId}>
                  <td className={`${tdClass} font-medium`}>{players[rowId]}</td>
                  {playerIds.map((colId) => {
                    if (rowId === colId) return <td key={colId} className={`${tdClass} text-center text-[#6d6358]`}>—</td>;
                    const result = resultMap[rowId]?.[colId];
                    if (!result) return <td key={colId} className={`${tdClass} text-center text-[#6d6358]`}>—</td>;
                    return (
                      <td key={colId} className={`${tdClass} text-center font-medium ${result.won ? 'text-[#8a6838]' : 'text-red-500'}`}>
                        {result.won ? 'W' : 'L'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold text-[#6d6358]">Standings</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                {['#', 'Player', 'W', 'L', 'Pts'].map((h) => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => (
                <tr key={s.playerId} className={idx === 0 ? 'bg-[#8a6838]/5' : ''}>
                  <td className={tdClass}>{idx + 1}</td>
                  <td className={`${tdClass} font-medium`}>{s.name}</td>
                  <td className={`${tdClass} text-center text-[#8a6838]`}>{s.wins}</td>
                  <td className={`${tdClass} text-center text-red-500`}>{s.losses}</td>
                  <td className={`${tdClass} text-center font-semibold`}>{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
