import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import * as api from '../lib/api';
import type { Registration } from '../lib/types';
import { SportIcon } from '../components/SportIcon';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TournamentsStackParamList } from '../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<TournamentsStackParamList>>();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    setError(null);
    try {
      const data = await api.getMyTournaments();
      setRegistrations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your tournaments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-4 bg-white">
        <Text className="text-lg text-muted text-center mb-4">
          Sign in to see your tournaments
        </Text>
      </View>
    );
  }

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-red-600 text-center mb-4">{error}</Text>
        <Pressable onPress={fetchRegistrations} className="bg-primary px-6 py-2 rounded-lg">
          <Text className="text-white font-medium">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const now = new Date();
  const upcoming = registrations.filter(
    (r) => r.tournament && new Date(r.tournament.date) >= now
  );
  const past = registrations.filter(
    (r) => r.tournament && new Date(r.tournament.date) < now
  );

  function renderRegistrationItem(reg: Registration) {
    const t = reg.tournament;
    if (!t) return null;
    const dateStr = new Date(t.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <Pressable
        key={reg.id}
        onPress={() => navigation.navigate('TournamentDetail', { id: t.id })}
        className="bg-white rounded-xl p-4 mb-3 border border-border flex-row items-center"
      >
        <SportIcon sport={t.sport} size={28} />
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-secondary" numberOfLines={1}>
            {t.name}
          </Text>
          <Text className="text-sm text-muted">{dateStr} · {t.location}</Text>
        </View>
        <View className={`px-2 py-1 rounded-full ${statusColors[t.status]?.split(' ')[0] ?? 'bg-gray-100'}`}>
          <Text className={`text-xs font-medium ${statusColors[t.status]?.split(' ')[1] ?? 'text-gray-800'}`}>
            {statusLabels[t.status]}
          </Text>
        </View>
      </Pressable>
    );
  }

  if (registrations.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-4xl mb-4">🏆</Text>
          <Text className="text-lg font-semibold text-secondary mb-2">
            No tournaments yet
          </Text>
          <Text className="text-muted text-center mb-6">
            Join your first tournament and start competing!
          </Text>
          <Pressable
            onPress={() => navigation.navigate('TournamentList')}
            className="bg-primary px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Browse Tournaments</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchRegistrations} />
        }
      >
        <View className="px-4 pt-4 pb-8">
          <Text className="text-2xl font-bold text-secondary mb-4">
            My Tournaments
          </Text>

          {upcoming.length > 0 && (
            <View className="mb-6">
              <Text className="text-base font-semibold text-muted mb-2 uppercase tracking-wide">
                Upcoming
              </Text>
              {upcoming.map(renderRegistrationItem)}
            </View>
          )}

          {past.length > 0 && (
            <View>
              <Text className="text-base font-semibold text-muted mb-2 uppercase tracking-wide">
                Past
              </Text>
              {past.map(renderRegistrationItem)}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
