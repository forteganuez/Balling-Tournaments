import React from 'react';
import { View, Text } from 'react-native';
import type { Match } from '../lib/types';

interface BracketViewProps {
  matches: Match[];
}

function MatchCard({ match }: { match: Match }) {
  return (
    <View
      key={match.id}
      className="bg-surface dark:bg-surface-dark rounded-lg p-3 mb-2 border border-border dark:border-border-dark"
    >
      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-secondary dark:text-secondary-dark">
          Match {match.position + 1}
        </Text>
        {match.score ? (
          <Text className="text-sm font-semibold text-primary">
            {match.score}
          </Text>
        ) : match.winnerId ? (
          <Text className="text-sm font-semibold text-green-600">Done</Text>
        ) : (
          <Text className="text-sm text-muted dark:text-muted-dark">Pending</Text>
        )}
      </View>
    </View>
  );
}

function RoundSection({ label, matches }: { label: string; matches: Match[] }) {
  return (
    <View className="mb-4">
      <Text className="text-base font-semibold text-secondary dark:text-secondary-dark mb-2">
        {label}
      </Text>
      {matches
        .sort((a, b) => a.position - b.position)
        .map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
    </View>
  );
}

export function BracketView({ matches }: BracketViewProps) {
  if (matches.length === 0) {
    return (
      <Text className="text-muted dark:text-muted-dark text-center py-4">
        No matches yet
      </Text>
    );
  }

  // Check if this is a double elimination bracket
  const hasBracketField = matches.some((m) => m.bracket != null);

  if (hasBracketField) {
    const winners = matches.filter((m) => m.bracket === 'WINNERS');
    const losers = matches.filter((m) => m.bracket === 'LOSERS');
    const grandFinal = matches.filter((m) => m.bracket === 'GRAND_FINAL');

    const wbRounds = groupByRound(winners);
    const lbRounds = groupByRound(losers);

    return (
      <View className="mt-2">
        {winners.length > 0 && (
          <View className="mb-4">
            <View className="bg-green-100 px-3 py-1 rounded-full self-start mb-2">
              <Text className="text-xs font-semibold text-green-700">Winners Bracket</Text>
            </View>
            {wbRounds.map(([round, roundMatches]) => (
              <RoundSection key={`wb-${round}`} label={`Round ${round}`} matches={roundMatches} />
            ))}
          </View>
        )}
        {losers.length > 0 && (
          <View className="mb-4">
            <View className="bg-red-100 px-3 py-1 rounded-full self-start mb-2">
              <Text className="text-xs font-semibold text-red-700">Losers Bracket</Text>
            </View>
            {lbRounds.map(([round, roundMatches]) => (
              <RoundSection key={`lb-${round}`} label={`Round ${round}`} matches={roundMatches} />
            ))}
          </View>
        )}
        {grandFinal.length > 0 && (
          <View className="mb-4">
            <View className="bg-purple-100 px-3 py-1 rounded-full self-start mb-2">
              <Text className="text-xs font-semibold text-purple-700">Grand Final</Text>
            </View>
            {grandFinal.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </View>
        )}
      </View>
    );
  }

  // Standard single elimination / round robin view
  const rounds = groupByRound(matches);

  return (
    <View className="mt-2">
      {rounds.map(([round, roundMatches]) => (
        <RoundSection key={round} label={`Round ${round}`} matches={roundMatches} />
      ))}
    </View>
  );
}

function groupByRound(matches: Match[]): [number, Match[]][] {
  const map: Record<number, Match[]> = {};
  for (const m of matches) {
    if (!map[m.round]) map[m.round] = [];
    map[m.round].push(m);
  }
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((round) => [round, map[round]]);
}
