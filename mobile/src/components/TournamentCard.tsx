import React from 'react';
import { Pressable, View, Text } from 'react-native';
import type { Tournament } from '../lib/types';
import { SportIcon } from './SportIcon';

interface TournamentCardProps {
  tournament: Tournament;
  onPress: () => void;
}

const statusColors: Record<string, string> = {
  REGISTRATION_OPEN: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  REGISTRATION_OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const formatLabels: Record<string, string> = {
  SINGLE_ELIMINATION: 'Single Elim',
  DOUBLE_ELIMINATION: 'Double Elim',
  ROUND_ROBIN: 'Round Robin',
};

export function TournamentCard({ tournament, onPress }: TournamentCardProps) {
  const filled = tournament._count?.registrations ?? 0;
  const progress = tournament.maxPlayers > 0 ? filled / tournament.maxPlayers : 0;
  const dateStr = new Date(tournament.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Pressable
      onPress={onPress}
      className="bg-white dark:bg-card-dark rounded-xl p-4 mb-3 shadow-sm border border-border dark:border-border-dark"
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <SportIcon sport={tournament.sport} size={28} />
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-secondary dark:text-secondary-dark" numberOfLines={1}>
              {tournament.name}
            </Text>
            <Text className="text-sm text-muted dark:text-muted-dark">{tournament.location}</Text>
          </View>
        </View>
        <View className={`px-2 py-1 rounded-full ${statusColors[tournament.status]?.split(' ')[0] ?? 'bg-gray-100'}`}>
          <Text className={`text-xs font-medium ${statusColors[tournament.status]?.split(' ')[1] ?? 'text-gray-800'}`}>
            {statusLabels[tournament.status]}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm text-muted dark:text-muted-dark">{dateStr}</Text>
        <View className="bg-surface dark:bg-surface-dark px-2 py-0.5 rounded">
          <Text className="text-xs text-muted dark:text-muted-dark">{formatLabels[tournament.format]}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-sm text-secondary dark:text-secondary-dark">
          {filled}/{tournament.maxPlayers} spots
        </Text>
        <Text className="text-sm font-semibold text-primary">
          {tournament.entryFee === 0 ? 'Free' : `€${(tournament.entryFee / 100).toFixed(2)}`}
        </Text>
      </View>

      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <View
          className="h-full bg-primary rounded-full"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </View>
    </Pressable>
  );
}
