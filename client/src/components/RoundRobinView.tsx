import { useMemo } from 'react';
import type { Match } from '../lib/types';

interface Props {
  matches: Match[];
  players: Record<string, string>; // playerId → playerName
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

  // Build result lookup: [player1][player2] → score from player1's perspective
  const resultMap = useMemo(() => {
    const map: Record<string, Record<string, { score: string; won: boolean }>> =
      {};

    for (const m of matches) {
      if (!m.player1Id || !m.player2Id || !m.completedAt) continue;

      if (!map[m.player1Id]) map[m.player1Id] = {};
      if (!map[m.player2Id]) map[m.player2Id] = {};

      map[m.player1Id][m.player2Id] = {
        score: m.score || '-',
        won: m.winnerId === m.player1Id,
      };
      map[m.player2Id][m.player1Id] = {
        score: m.score || '-',
        won: m.winnerId === m.player2Id,
      };
    }

    return map;
  }, [matches]);

  // Calculate standings
  const standings = useMemo(() => {
    const stats: Record<string, Standing> = {};

    for (const id of playerIds) {
      stats[id] = {
        playerId: id,
        name: players[id] || 'Unknown',
        wins: 0,
        losses: 0,
        points: 0,
      };
    }

    for (const m of matches) {
      if (!m.winnerId || !m.player1Id || !m.player2Id) continue;

      const loserId =
        m.winnerId === m.player1Id ? m.player2Id : m.player1Id;

      if (stats[m.winnerId]) {
        stats[m.winnerId].wins += 1;
        stats[m.winnerId].points += 3;
      }
      if (stats[loserId]) {
        stats[loserId].losses += 1;
      }
    }

    return Object.values(stats).sort(
      (a, b) => b.points - a.points || b.wins - a.wins
    );
  }, [matches, playerIds, players]);

  if (!matches.length) {
    return (
      <p className="py-8 text-center text-gray-500">
        No round robin data available yet.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cross-table */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-700">
          Results Matrix
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">
                  Player
                </th>
                {playerIds.map((id) => (
                  <th
                    key={id}
                    className="border border-gray-200 bg-gray-50 px-3 py-2 text-center font-medium text-gray-600"
                  >
                    <span className="block max-w-[80px] truncate">
                      {players[id]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerIds.map((rowId) => (
                <tr key={rowId}>
                  <td className="border border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-800">
                    {players[rowId]}
                  </td>
                  {playerIds.map((colId) => {
                    if (rowId === colId) {
                      return (
                        <td
                          key={colId}
                          className="border border-gray-200 bg-gray-100 px-3 py-2 text-center text-gray-400"
                        >
                          -
                        </td>
                      );
                    }

                    const result = resultMap[rowId]?.[colId];
                    if (!result) {
                      return (
                        <td
                          key={colId}
                          className="border border-gray-200 px-3 py-2 text-center text-gray-400"
                        >
                          -
                        </td>
                      );
                    }

                    return (
                      <td
                        key={colId}
                        className={`border border-gray-200 px-3 py-2 text-center font-medium ${
                          result.won
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
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

      {/* Standings */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-gray-700">
          Standings
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">
                  #
                </th>
                <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600">
                  Player
                </th>
                <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                  W
                </th>
                <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                  L
                </th>
                <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => (
                <tr key={s.playerId} className={idx === 0 ? 'bg-primary-50' : ''}>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700">
                    {idx + 1}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800">
                    {s.name}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-center text-green-700">
                    {s.wins}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-center text-red-700">
                    {s.losses}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-center font-semibold text-gray-900">
                    {s.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
