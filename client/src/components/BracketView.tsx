import type { Match } from '../lib/types';

interface Props {
  matches: Match[];
  players: Record<string, string>; // playerId → playerName
  highlightPlayerId?: string;
}

function getRoundLabel(round: number, totalRounds: number): string {
  const fromFinal = totalRounds - round;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semifinals';
  if (fromFinal === 2) return 'Quarterfinals';
  return `Round ${round}`;
}

export default function BracketView({
  matches,
  players,
  highlightPlayerId,
}: Props) {
  if (!matches.length) {
    return (
      <p className="py-8 text-center text-gray-500">
        No bracket data available yet.
      </p>
    );
  }

  // Group matches by round, sorted by position
  const roundMap = new Map<number, Match[]>();
  for (const m of matches) {
    const arr = roundMap.get(m.round) || [];
    arr.push(m);
    roundMap.set(m.round, arr);
  }

  const rounds = Array.from(roundMap.keys()).sort((a, b) => a - b);
  for (const r of rounds) {
    roundMap.get(r)!.sort((a, b) => a.position - b.position);
  }

  const totalRounds = rounds.length;

  const playerName = (id?: string) => {
    if (!id) return 'BYE';
    return players[id] || 'TBD';
  };

  const isHighlighted = (id?: string) =>
    highlightPlayerId && id === highlightPlayerId;

  return (
    <div className="bracket-scroll overflow-x-auto pb-4">
      <div className="inline-flex items-stretch gap-0">
        {rounds.map((round, roundIdx) => {
          const roundMatches = roundMap.get(round)!;
          return (
            <div key={round} className="flex flex-col">
              {/* Round header */}
              <h4 className="mb-3 text-center text-sm font-semibold text-gray-600">
                {getRoundLabel(round, totalRounds)}
              </h4>

              {/* Matches in this round */}
              <div className="flex flex-1 flex-col justify-around gap-4">
                {roundMatches.map((match) => (
                  <div key={match.id} className="flex items-center">
                    {/* Match card */}
                    <div className="w-52 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                      {/* Player 1 */}
                      <div
                        className={`flex items-center justify-between border-b border-gray-100 px-3 py-2 text-sm ${
                          match.winnerId && match.winnerId === match.player1Id
                            ? 'bg-primary-50 font-semibold text-primary-700'
                            : ''
                        } ${isHighlighted(match.player1Id) ? 'ring-2 ring-inset ring-primary-400' : ''}`}
                      >
                        <span className="truncate">
                          {playerName(match.player1Id)}
                        </span>
                        {match.score && match.winnerId === match.player1Id && (
                          <span className="ml-2 text-xs font-bold text-primary-600">
                            W
                          </span>
                        )}
                      </div>

                      {/* Player 2 */}
                      <div
                        className={`flex items-center justify-between px-3 py-2 text-sm ${
                          match.winnerId && match.winnerId === match.player2Id
                            ? 'bg-primary-50 font-semibold text-primary-700'
                            : ''
                        } ${isHighlighted(match.player2Id) ? 'ring-2 ring-inset ring-primary-400' : ''}`}
                      >
                        <span className="truncate">
                          {playerName(match.player2Id)}
                        </span>
                        {match.score && match.winnerId === match.player2Id && (
                          <span className="ml-2 text-xs font-bold text-primary-600">
                            W
                          </span>
                        )}
                      </div>

                      {/* Score */}
                      {match.score && (
                        <div className="border-t border-gray-100 bg-gray-50 px-3 py-1 text-center text-xs text-gray-500">
                          {match.score}
                        </div>
                      )}
                    </div>

                    {/* Connector line to next round */}
                    {roundIdx < rounds.length - 1 && (
                      <div className="flex h-full w-8 items-center">
                        <div className="h-px w-full bg-gray-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
