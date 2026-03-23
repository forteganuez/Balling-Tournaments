import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, AppState, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TournamentsStackParamList } from '../navigation/types';
import { useAuth } from '../hooks/useAuth';
import * as api from '../lib/api';
import type { Tournament } from '../lib/types';
import { SportIcon } from '../components/SportIcon';
import { Countdown } from '../components/Countdown';
import { BracketView } from '../components/BracketView';
import { LoadingSpinner } from '../components/LoadingSpinner';

type Props = NativeStackScreenProps<TournamentsStackParamList, 'TournamentDetail'>;

export function TournamentDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const fetchTournament = useCallback(async () => {
    setError(null);
    try {
      const data = await api.getTournament(id);
      setTournament(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchTournament();
    }, [fetchTournament]),
  );

  // Refresh tournament data when app returns from Stripe checkout or background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        fetchTournament();
      }
    });

    return () => subscription.remove();
  }, [fetchTournament]);

  // Handle deep link return from payment (balling://tournament/:id)
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (url.includes(`tournament/${id}`)) {
        fetchTournament();
      }
    };
    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, [id, fetchTournament]);

  async function handleJoin() {
    if (!tournament) return;
    setJoining(true);
    try {
      const { url } = await api.joinTournament(tournament.id);
      await Linking.openURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join tournament');
    } finally {
      setJoining(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  if (error || !tournament) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-red-600 dark:text-red-300 text-center mb-4">{error ?? 'Tournament not found'}</Text>
        <Pressable onPress={fetchTournament} className="bg-primary px-6 py-2 rounded-lg">
          <Text className="text-white font-medium">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const filled = tournament._count?.registrations ?? tournament.registrations?.length ?? 0;
  const progress = tournament.maxPlayers > 0 ? filled / tournament.maxPlayers : 0;
  const isFull = filled >= tournament.maxPlayers;
  const isRegistered = tournament.registrations?.some((r) => r.userId === user?.id) ?? false;
  const isOpen = tournament.status === 'REGISTRATION_OPEN';
  const canEditTournament = user?.role === 'ADMIN' || user?.id === tournament.organizerId;
  const dateStr = new Date(tournament.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formatLabels: Record<string, string> = {
    SINGLE_ELIMINATION: 'Single Elimination',
    DOUBLE_ELIMINATION: 'Double Elimination',
    ROUND_ROBIN: 'Round Robin',
  };

  function renderJoinButton(tournament: Tournament) {
    if (!user) {
      return (
        <Pressable className="bg-secondary rounded-lg py-3.5 items-center">
          <Text className="text-white font-semibold">Log in to Join</Text>
        </Pressable>
      );
    }
    if (isRegistered) {
      return (
        <Pressable disabled className="bg-green-500 rounded-lg py-3.5 items-center opacity-80">
          <Text className="text-white font-semibold">You're Registered</Text>
        </Pressable>
      );
    }
    if (isFull) {
      return (
        <Pressable disabled className="bg-gray-400 rounded-lg py-3.5 items-center">
          <Text className="text-white font-semibold">Tournament Full</Text>
        </Pressable>
      );
    }
    if (!isOpen) {
      return null;
    }
    return (
      <Pressable
        onPress={handleJoin}
        disabled={joining}
        className={`rounded-lg py-3.5 items-center ${joining ? 'bg-primary/60' : 'bg-primary'}`}
      >
        <Text className="text-white font-semibold">
          {joining
            ? 'Processing...'
            : `Join — €${(tournament.entryFee / 100).toFixed(2)}`}
        </Text>
      </Pressable>
    );
  }

  const displayedPlayers = tournament.registrations?.slice(0, 8) ?? [];
  const remainingCount = (tournament.registrations?.length ?? 0) - displayedPlayers.length;

  return (
    <ScrollView className="flex-1 bg-white dark:bg-background-dark">
      <View className="px-4 pt-4 pb-8">
        <View className="flex-row items-center mb-2">
          <SportIcon sport={tournament.sport} size={32} />
          <Text className="text-2xl font-bold text-secondary dark:text-secondary-dark ml-3 flex-1">
            {tournament.name}
          </Text>
        </View>

        {tournament.description && (
          <Text className="text-muted dark:text-muted-dark mb-4">{tournament.description}</Text>
        )}

        {canEditTournament && (
          <Pressable
            onPress={() => navigation.navigate('CreateTournament', { id: tournament.id })}
            className="mb-4 rounded-2xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3"
          >
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-[#2563eb]">
              Organizer Tools
            </Text>
            <Text className="mt-1 text-base font-semibold text-secondary dark:text-secondary-dark">
              Edit this tournament
            </Text>
            <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
              Update the date, pricing, player limits, description, or cover image.
            </Text>
          </Pressable>
        )}

        <View className="bg-surface dark:bg-surface-dark rounded-lg p-4 mb-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-muted dark:text-muted-dark">Date</Text>
            <Text className="text-sm text-secondary dark:text-secondary-dark font-medium">{dateStr}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-muted dark:text-muted-dark">Location</Text>
            <Text className="text-sm text-secondary dark:text-secondary-dark font-medium">{tournament.location}</Text>
          </View>
          {tournament.venue && (
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-muted dark:text-muted-dark">Venue</Text>
              <Text className="text-sm text-secondary dark:text-secondary-dark font-medium">{tournament.venue}</Text>
            </View>
          )}
          <View className="flex-row justify-between mb-2">
            <Text className="text-sm text-muted dark:text-muted-dark">Format</Text>
            <Text className="text-sm text-secondary dark:text-secondary-dark font-medium">
              {formatLabels[tournament.format]}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted dark:text-muted-dark">Entry Fee</Text>
            <Text className="text-sm text-primary font-semibold">
              {tournament.entryFee === 0 ? 'Free' : `€${(tournament.entryFee / 100).toFixed(2)}`}
            </Text>
          </View>
        </View>

        {isOpen && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-secondary dark:text-secondary-dark mb-2 text-center">
              Starts in
            </Text>
            <Countdown targetDate={tournament.date} />
          </View>
        )}

        <View className="mb-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-muted dark:text-muted-dark">Registration</Text>
            <Text className="text-sm text-secondary dark:text-secondary-dark font-medium">
              {filled}/{tournament.maxPlayers} spots
            </Text>
          </View>
          <View className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </View>
        </View>

        {displayedPlayers.length > 0 && (
          <View className="mb-4">
            <Text className="text-base font-semibold text-secondary dark:text-secondary-dark mb-2">
              Registered Players
            </Text>
            {displayedPlayers.map((reg) => (
              <View key={reg.id} className="flex-row items-center py-2 border-b border-border dark:border-border-dark">
                <View className="w-8 h-8 bg-primary/10 rounded-full items-center justify-center mr-3">
                  <Text className="text-primary font-semibold text-sm">
                    {reg.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <Text className="text-sm text-secondary dark:text-secondary-dark">{reg.user?.name ?? 'Player'}</Text>
              </View>
            ))}
            {remainingCount > 0 && (
              <Text className="text-sm text-muted dark:text-muted-dark mt-2 text-center">
                +{remainingCount} more
              </Text>
            )}
          </View>
        )}

        {isOpen && renderJoinButton(tournament)}

        {(tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') &&
          tournament.matches && tournament.matches.length > 0 && (
          <View className="mt-6">
            <Text className="text-base font-semibold text-secondary dark:text-secondary-dark mb-2">
              Bracket
            </Text>
            <BracketView matches={tournament.matches} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}
