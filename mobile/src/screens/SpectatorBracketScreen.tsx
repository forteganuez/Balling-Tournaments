import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import * as api from '../lib/api';
import type { Tournament, Sport, TournamentStatus } from '../lib/types';
import { VisualBracket } from '../components/VisualBracket';
import { SportIcon } from '../components/SportIcon';

interface SpectatorBracketScreenProps {
  route: { params: { id: string } };
}

const STATUS_CONFIG: Record<
  TournamentStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  REGISTRATION_OPEN: {
    label: 'Registration Open',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
  },
  COMPLETED: {
    label: 'Completed',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
  },
  CANCELLED: {
    label: 'Cancelled',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
  },
};

function buildPlayersMap(
  registrations: Tournament['registrations'],
): Record<string, { name: string; avatarUrl?: string | null }> {
  const map: Record<string, { name: string; avatarUrl?: string | null }> = {};
  if (!registrations) return map;
  for (const reg of registrations) {
    if (reg.user) {
      map[reg.userId] = {
        name: reg.user.name,
        avatarUrl: reg.user.avatarUrl,
      };
    }
  }
  return map;
}

export function SpectatorBracketScreen({ route }: SpectatorBracketScreenProps) {
  const { id } = route.params;
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTournament = useCallback(async () => {
    setError(null);
    try {
      const data = await api.getTournament(id);
      setTournament(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load tournament';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.getTournament(id);
      setTournament(data);
      setError(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load tournament';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      api
        .getTournament(id)
        .then((data) => {
          setTournament(data);
          setError(null);
        })
        .catch(() => {
          // Silently fail on background refresh
        });
    }, 30_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id]);

  const handleShare = useCallback(async () => {
    const deepLink = `balling://tournament/${id}`;
    const name = tournament?.name ?? 'this tournament';
    try {
      await Share.share({
        message: `Check out ${name} on Balling! ${deepLink}`,
      });
    } catch {
      // User cancelled or share failed
    }
  }, [id, tournament?.name]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-muted mt-3 text-sm">Loading bracket...</Text>
      </SafeAreaView>
    );
  }

  if (error || !tournament) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-4">
        <Text className="text-red-600 text-center text-base mb-4">
          {error ?? 'Tournament not found'}
        </Text>
        <Pressable
          onPress={fetchTournament}
          className="bg-primary px-8 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[tournament.status];
  const players = buildPlayersMap(tournament.registrations);
  const matches = tournament.matches ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1 mr-3">
              <SportIcon sport={tournament.sport} size={28} />
              <Text
                className="text-xl font-bold text-secondary ml-2 flex-1"
                numberOfLines={2}
              >
                {tournament.name}
              </Text>
            </View>

            {/* Share button */}
            <Pressable
              onPress={handleShare}
              className="bg-surface rounded-full p-2.5"
              hitSlop={8}
            >
              <Text className="text-lg">&#x1F517;</Text>
            </Pressable>
          </View>

          {/* Status badge */}
          <View className="flex-row mb-4">
            <View
              className={`px-3 py-1 rounded-full ${statusConfig.bgClass}`}
            >
              <Text
                className={`text-xs font-semibold ${statusConfig.textClass}`}
              >
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Bracket */}
        <View className="flex-1 px-2 pb-6">
          {matches.length > 0 ? (
            <VisualBracket
              matches={matches}
              format={tournament.format}
              currentUserId={user?.id}
              players={players}
            />
          ) : (
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-muted text-base text-center">
                No matches generated yet
              </Text>
              <Text className="text-muted text-sm text-center mt-1">
                Pull down to refresh
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
