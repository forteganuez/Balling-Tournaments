import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useTournaments } from '../hooks/useTournaments';
import { useOpenMatches } from '../hooks/useOpenMatches';
import { TournamentCard } from '../components/TournamentCard';
import { OpenMatchCard } from '../components/OpenMatchCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import * as api from '../lib/api';
import type { HomeStackParamList } from '../navigation/types';

type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

function formatMatchCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuth();
  const tabNavigation = useNavigation<any>();
  const {
    tournaments,
    loading: tournamentsLoading,
    error: tournamentsError,
    refetch: refetchTournaments,
  } = useTournaments({ status: 'REGISTRATION_OPEN' });
  const {
    feed,
    loading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useOpenMatches();

  const [refreshing, setRefreshing] = useState(false);
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refetchMatches();
    }, [refetchMatches]),
  );

  async function refreshAll() {
    setRefreshing(true);
    try {
      await Promise.all([refetchTournaments(), refetchMatches()]);
    } finally {
      setRefreshing(false);
    }
  }

  async function runMatchAction(matchId: string, action: () => Promise<unknown>) {
    setBusyMatchId(matchId);
    try {
      await action();
      await refetchMatches();
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusyMatchId(null);
    }
  }

  const heroTournamentCount = tournaments.length;
  const heroOpenMatchCount = feed.available.length;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor="#102a43" />
        }
      >
        <View className="px-4 pb-10 pt-4">
          <View className="rounded-[32px] bg-[#102a43] px-5 py-6">
            <Text className="text-sm font-semibold uppercase tracking-[2px] text-[#d9e2ec]">
              Home
            </Text>
            <Text className="mt-3 text-3xl font-bold leading-10 text-white">
              {user?.name ? `${user.name}, your next game starts here.` : 'Your next game starts here.'}
            </Text>
            <Text className="mt-3 text-base leading-6 text-[#bcccdc]">
              Tournaments stay on top. Social matches stay right below, ready for someone to join.
            </Text>

            <View className="mt-5 flex-row">
              <View className="mr-3 flex-1 rounded-3xl bg-[#0f3a5f] px-4 py-4">
                <Text className="text-2xl font-bold text-white">{heroTournamentCount}</Text>
                <Text className="mt-1 text-sm text-[#d9e2ec]">open tournaments</Text>
              </View>
              <View className="flex-1 rounded-3xl bg-[#f0b429] px-4 py-4">
                <Text className="text-2xl font-bold text-[#102a43]">{heroOpenMatchCount}</Text>
                <Text className="mt-1 text-sm text-[#102a43]">matches to join</Text>
              </View>
            </View>
          </View>

          <View className="mt-8">
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-bold text-[#102a43]">Tournaments</Text>
                <Text className="mt-1 text-sm leading-5 text-[#6b7c93]">
                  Bigger events first, with quick access to the ones still taking registrations.
                </Text>
              </View>
              <Pressable
                onPress={() => tabNavigation.navigate('Tournaments', { screen: 'TournamentList' })}
                className="rounded-full bg-white px-4 py-2"
              >
                <Text className="text-sm font-semibold text-[#102a43]">See all</Text>
              </Pressable>
            </View>

            {tournamentsLoading && tournaments.length === 0 ? (
              <View className="h-44 rounded-[28px] bg-[#f8fbff]">
                <LoadingSpinner />
              </View>
            ) : tournamentsError ? (
              <View className="rounded-[28px] bg-[#fff1f1] p-4">
                <Text className="text-center text-sm text-[#b42318]">{tournamentsError}</Text>
              </View>
            ) : tournaments.length === 0 ? (
              <View className="rounded-[28px] border border-[#e6edf3] bg-white px-5 py-6">
                <Text className="text-base font-semibold text-[#102a43]">Nothing open right now</Text>
                <Text className="mt-2 text-sm leading-5 text-[#6b7c93]">
                  When new tournaments open up, they will land here first.
                </Text>
              </View>
            ) : (
              <FlatList
                horizontal
                data={tournaments.slice(0, 6)}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View className="mr-4 w-80">
                    <TournamentCard
                      tournament={item}
                      onPress={() =>
                        tabNavigation.navigate('Tournaments', {
                          screen: 'TournamentDetail',
                          params: { id: item.id },
                        })
                      }
                    />
                  </View>
                )}
              />
            )}
          </View>

          <View className="mt-9">
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-bold text-[#102a43]">Play Together</Text>
                <Text className="mt-1 text-sm leading-5 text-[#6b7c93]">
                  Quick match posts from players who want to get on court without waiting for a tournament.
                </Text>
              </View>
            </View>

            <View className="mb-5 rounded-[30px] bg-[#102a43] px-5 py-5">
              <Text className="text-sm font-semibold uppercase tracking-[2px] text-[#d9e2ec]">
                Host Flow
              </Text>
              <Text className="mt-2 text-2xl font-bold text-white">
                Need a player fast?
              </Text>
              <Text className="mt-2 text-sm leading-6 text-[#d9e2ec]">
                Create a sharper match post with a proper schedule screen and stronger visual contrast.
              </Text>
              <Pressable
                onPress={() => navigation.navigate('HostMatch')}
                className="mt-4 self-start rounded-2xl bg-[#f0b429] px-5 py-3"
              >
                <Text className="text-base font-semibold text-[#102a43]">Host a match</Text>
              </Pressable>
            </View>

            {feed.hosting.length > 0 || feed.playing.length > 0 ? (
              <View className="mb-5 rounded-[28px] border border-[#d9e2ec] bg-[#f8fbff] px-4 py-4">
                <Text className="text-lg font-bold text-[#102a43]">Your board</Text>
                <Text className="mt-1 text-sm text-[#6b7c93]">
                  {formatMatchCount(feed.hosting.length, 'hosted post', 'hosted posts')} and{' '}
                  {formatMatchCount(feed.playing.length, 'joined match', 'joined matches')}.
                </Text>

                <View className="mt-4 gap-4">
                  {feed.hosting.map((match) => (
                    <OpenMatchCard
                      key={match.id}
                      match={match}
                      statusLabel={match.opponent ? 'Booked' : 'Hosting'}
                      actionLabel="Cancel post"
                      actionDisabled={busyMatchId === match.id}
                      onActionPress={() =>
                        Alert.alert(
                          'Cancel this match?',
                          'This will remove the post from the board.',
                          [
                            { text: 'Keep it', style: 'cancel' },
                            {
                              text: 'Cancel match',
                              style: 'destructive',
                              onPress: () => runMatchAction(match.id, () => api.cancelOpenMatch(match.id)),
                            },
                          ],
                        )
                      }
                    />
                  ))}
                  {feed.playing.map((match) => (
                    <OpenMatchCard
                      key={match.id}
                      match={match}
                      statusLabel="You joined"
                      participantLabel="You're in"
                      actionLabel="Leave match"
                      actionDisabled={busyMatchId === match.id}
                      onActionPress={() =>
                        Alert.alert(
                          'Leave this match?',
                          'The host will see that the spot opened again.',
                          [
                            { text: 'Stay in', style: 'cancel' },
                            {
                              text: 'Leave match',
                              style: 'destructive',
                              onPress: () => runMatchAction(match.id, () => api.leaveOpenMatch(match.id)),
                            },
                          ],
                        )
                      }
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {matchesLoading && feed.available.length === 0 && feed.hosting.length === 0 && feed.playing.length === 0 ? (
              <View className="h-40 rounded-[28px] bg-[#f8fbff]">
                <LoadingSpinner />
              </View>
            ) : matchesError ? (
              <View className="rounded-[28px] bg-[#fff1f1] p-4">
                <Text className="text-center text-sm text-[#b42318]">{matchesError}</Text>
              </View>
            ) : feed.available.length === 0 ? (
              <View className="rounded-[28px] border border-[#e6edf3] bg-white px-5 py-6">
                <Text className="text-base font-semibold text-[#102a43]">No open match posts yet</Text>
                <Text className="mt-2 text-sm leading-5 text-[#6b7c93]">
                  Start the board by hosting a match and letting someone nearby claim the spot.
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {feed.available.map((match) => (
                  <OpenMatchCard
                    key={match.id}
                    match={match}
                    actionLabel="Join match"
                    actionDisabled={busyMatchId === match.id}
                    onActionPress={() => runMatchAction(match.id, () => api.joinOpenMatch(match.id))}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
