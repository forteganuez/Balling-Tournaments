import React from 'react';
import { View, Text } from 'react-native';
import type { Match } from '../lib/types';

interface BracketViewProps {
  matches: Match[];
}

export function BracketView({ matches }: BracketViewProps) {
  if (matches.length === 0) {
    return (
      <Text className="text-muted text-center py-4">
        No matches yet
      </Text>
    );
  }

  const rounds = matches.reduce<Record<number, Match[]>>((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const sortedRounds = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <View className="mt-2">
      {sortedRounds.map((round) => (
        <View key={round} className="mb-4">
          <Text className="text-base font-semibold text-secondary mb-2">
            Round {round}
          </Text>
          {rounds[round]
            .sort((a, b) => a.position - b.position)
            .map((match) => (
              <View
                key={match.id}
                className="bg-surface rounded-lg p-3 mb-2 border border-border"
              >
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-secondary">
                    Match {match.position}
                  </Text>
                  {match.score ? (
                    <Text className="text-sm font-semibold text-primary">
                      {match.score}
                    </Text>
                  ) : (
                    <Text className="text-sm text-muted">Pending</Text>
                  )}
                </View>
              </View>
            ))}
        </View>
      ))}
    </View>
  );
}
