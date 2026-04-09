import type { Match } from '../lib/types';

interface Props {
  matches: Match[];
  players: Record<string, string>;
  highlightPlayerId?: string;
}

function getRoundLabel(round: number, totalRounds: number): string {
  const fromFinal = totalRounds - round;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semifinals';
  if (fromFinal === 2) return 'Quarterfinals';
  return `Round ${round}`;
}

export default function BracketView({ matches, players, highlightPlayerId }: Props) {
  if (!matches.length) {
    return <p className="py-8 text-center text-[#6d6358]">No bracket data available yet.</p>;
  }

  const roundMap = new Map<number, Match[]>();
  for (const m of matches) {
    const arr = roundMap.get(m.round) ?? [];
    arr.push(m);
    roundMap.set(m.round, arr);
  }

  const rounds = Array.from(roundMap.keys()).sort((a, b) => a - b);
  for (const r of rounds) roundMap.get(r)!.sort((a, b) => a.position - b.position);

  const totalRounds = rounds.length;
  const playerName = (id?: string) => (id ? (players[id] ?? 'TBD') : 'BYE');
  const isHighlighted = (id?: string) => highlightPlayerId && id === highlightPlayerId;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="inline-flex items-stretch gap-0">
        {rounds.map((round, roundIdx) => {
          const roundMatches = roundMap.get(round)!;
          return (
            <div key={round} className="flex flex-col">
              <h4 className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-[#6d6358]">
                {getRoundLabel(round, totalRounds)}
              </h4>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {roundMatches.map((match) => (
                  <div key={match.id} className="flex items-center">
                    <div className="w-52 overflow-hidden rounded-lg border border-[#d8ccb9] bg-[#f8f4ed]">
                      <div
                        className={`flex items-center justify-between border-b border-[#d8ccb9] px-3 py-2 text-sm ${
                          match.winnerId === match.player1Id
                            ? 'bg-[#8a6838]/10 font-semibold text-[#8a6838]'
                            : 'text-[#191510]'
                        } ${isHighlighted(match.player1Id) ? 'ring-2 ring-inset ring-[#8a6838]' : ''}`}
                      >
                        <span className="truncate">{playerName(match.player1Id)}</span>
                        {match.winnerId === match.player1Id && (
                          <span className="ml-2 text-xs font-bold text-[#8a6838]">W</span>
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-between px-3 py-2 text-sm ${
                          match.winnerId === match.player2Id
                            ? 'bg-[#8a6838]/10 font-semibold text-[#8a6838]'
                            : 'text-[#191510]'
                        } ${isHighlighted(match.player2Id) ? 'ring-2 ring-inset ring-[#8a6838]' : ''}`}
                      >
                        <span className="truncate">{playerName(match.player2Id)}</span>
                        {match.winnerId === match.player2Id && (
                          <span className="ml-2 text-xs font-bold text-[#8a6838]">W</span>
                        )}
                      </div>
                      {match.score && (
                        <div className="border-t border-[#d8ccb9] px-3 py-1 text-center text-xs text-[#6d6358]">
                          {match.score}
                        </div>
                      )}
                    </div>
                    {roundIdx < rounds.length - 1 && (
                      <div className="flex h-full w-8 items-center">
                        <div className="h-px w-full bg-[#d8ccb9]" />
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
