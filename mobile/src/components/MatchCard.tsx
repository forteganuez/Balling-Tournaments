import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import type { Match } from '../lib/types';

interface MatchCardProps {
  match: Match;
  currentUserId?: string;
  players?: Record<string, { name: string; avatarUrl?: string | null }>;
  onPress?: () => void;
}

function getMatchStatus(match: Match): 'Pending' | 'In Progress' | 'Completed' {
  if (match.completedAt || match.winnerId) return 'Completed';
  if (match.player1Id && match.player2Id && !match.winnerId) return 'In Progress';
  return 'Pending';
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  Pending: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Pending' },
  'In Progress': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'In Progress' },
  Completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
};

function formatScheduledTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function PlayerAvatar({
  playerId,
  players,
}: {
  playerId: string | null | undefined;
  players?: Record<string, { name: string; avatarUrl?: string | null }>;
}) {
  if (!playerId) {
    return (
      <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
        <Text className="text-gray-400 text-sm font-semibold">?</Text>
      </View>
    );
  }

  const player = players?.[playerId];
  const name = player?.name ?? 'Unknown';
  const avatarUrl = player?.avatarUrl;
  const initial = name.charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        className="w-10 h-10 rounded-full bg-gray-200"
      />
    );
  }

  return (
    <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
      <Text className="text-white text-sm font-bold">{initial}</Text>
    </View>
  );
}

export function MatchCard({ match, currentUserId, players, onPress }: MatchCardProps) {
  const status = getMatchStatus(match);
  const cfg = statusConfig[status];
  const isCompleted = status === 'Completed';

  const isUserMatch =
    currentUserId != null &&
    (match.player1Id === currentUserId || match.player2Id === currentUserId);

  const player1Name = match.player1Id
    ? (players?.[match.player1Id]?.name ?? 'Unknown')
    : 'TBD';
  const player2Name = match.player2Id
    ? (players?.[match.player2Id]?.name ?? 'Unknown')
    : 'TBD';

  const isPlayer1Winner = isCompleted && match.winnerId === match.player1Id;
  const isPlayer2Winner = isCompleted && match.winnerId === match.player2Id;

  const scheduledDisplay = match.scheduledTime ?? match.scheduledAt ?? null;

  return (
    <Pressable
      onPress={onPress}
      className={`bg-white rounded-xl p-4 mb-3 shadow-sm border ${
        isUserMatch ? 'border-primary border-2' : 'border-border'
      }`}
    >
      {isUserMatch && (
        <View className="mb-2">
          <Text className="text-xs font-semibold text-primary">Your Match</Text>
        </View>
      )}

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xs text-muted">
          Round {match.round} - Match {match.position}
        </Text>
        <View className={`px-2 py-0.5 rounded-full ${cfg.bg}`}>
          <Text className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</Text>
        </View>
      </View>

      {/* Player 1 */}
      <View
        className="flex-row items-center py-2"
        style={{ opacity: isCompleted && !isPlayer1Winner ? 0.5 : 1 }}
      >
        <PlayerAvatar playerId={match.player1Id} players={players} />
        <Text
          className={`ml-3 flex-1 text-sm ${
            isPlayer1Winner ? 'font-bold text-green-600' : 'text-secondary'
          }`}
          numberOfLines={1}
        >
          {player1Name}
        </Text>
        {isPlayer1Winner && (
          <Text className="text-xs font-semibold text-green-600">W</Text>
        )}
      </View>

      {/* VS divider */}
      <View className="items-center py-1">
        <Text className="text-xs text-muted font-semibold">VS</Text>
      </View>

      {/* Player 2 */}
      <View
        className="flex-row items-center py-2"
        style={{ opacity: isCompleted && !isPlayer2Winner ? 0.5 : 1 }}
      >
        <PlayerAvatar playerId={match.player2Id} players={players} />
        <Text
          className={`ml-3 flex-1 text-sm ${
            isPlayer2Winner ? 'font-bold text-green-600' : 'text-secondary'
          }`}
          numberOfLines={1}
        >
          {player2Name}
        </Text>
        {isPlayer2Winner && (
          <Text className="text-xs font-semibold text-green-600">W</Text>
        )}
      </View>

      {/* Score */}
      {isCompleted && match.score != null && (
        <View className="mt-2 pt-2 border-t border-gray-100 items-center">
          <Text className="text-sm font-semibold text-secondary">{match.score}</Text>
        </View>
      )}

      {/* Scheduled time */}
      {scheduledDisplay != null && !isCompleted && (
        <View className="mt-2 pt-2 border-t border-gray-100">
          <Text className="text-xs text-muted text-center">
            {formatScheduledTime(scheduledDisplay)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
