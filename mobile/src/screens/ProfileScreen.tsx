import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../context/AuthContext';
import * as api from '../lib/api';
import type { UserStats, Registration } from '../lib/types';
import type { ProfileStackParamList } from '../navigation/types';
import { colors } from '../constants/theme';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'MyProfile'>;

function getSkillColor(level: number): { text: string; bg: string } {
  if (level <= 3) return { text: 'text-green-600', bg: 'bg-green-100' };
  if (level <= 6) return { text: 'text-blue-600', bg: 'bg-blue-100' };
  return { text: 'text-purple-600', bg: 'bg-purple-100' };
}

function getSkillLabel(level: number): string {
  if (level <= 3) return 'Beginner';
  if (level <= 6) return 'Intermediate';
  return 'Advanced';
}

const SPORT_ICONS: Record<string, string> = {
  PADEL: '🏓',
  TENNIS: '🎾',
  SQUASH: '🏸',
};

function formatProfileDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuthContext();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [tournaments, setTournaments] = useState<Registration[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [statsData, tournamentsData, followersData, followingData] = await Promise.all([
        api.getUserStats(user.id),
        api.getUserTournaments(user.id),
        api.getFollowers(),
        api.getFollowing(),
      ]);
      setStats(statsData);
      setTournaments(tournamentsData);
      setFollowerCount(followersData.length);
      setFollowingCount(followingData.length);
    } catch {
      // Best effort
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleRefresh() {
    setRefreshing(true);
    fetchData();
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  }

  if (!user) return null;

  const winRate = stats && stats.matchesPlayed > 0
    ? Math.round((stats.wins / stats.matchesPlayed) * 100)
    : 0;
  const formattedDateOfBirth = formatProfileDate(user.dateOfBirth);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View className="items-center pt-8 pb-6">
          <View className="relative mb-3">
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center">
                <Text className="text-4xl font-bold text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => navigation.navigate('EditProfile')}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center border-2 border-white"
            >
              <Text className="text-white text-xs">✏️</Text>
            </Pressable>
          </View>

          <Text className="text-xl font-bold text-secondary">{user.name}</Text>
          {user.city && (
            <Text className="text-sm text-muted mt-0.5">📍 {user.city}</Text>
          )}
          {formattedDateOfBirth && (
            <Text className="text-sm text-muted mt-0.5">🎂 {formattedDateOfBirth}</Text>
          )}
          {user.bio && (
            <Text className="text-sm text-muted mt-1 px-8 text-center">{user.bio}</Text>
          )}
        </View>

        {/* Skill Badge + Sport Tags */}
        <View className="flex-row items-center justify-center gap-2 px-4 mb-4">
          {user.skillLevel != null && (
            <View className={`flex-row items-center px-3 py-1.5 rounded-full ${getSkillColor(user.skillLevel).bg}`}>
              <Text className={`text-sm font-semibold ${getSkillColor(user.skillLevel).text}`}>
                Lvl {user.skillLevel} · {getSkillLabel(user.skillLevel)}
              </Text>
            </View>
          )}
          {user.sports?.map((sport) => (
            <View key={sport} className="flex-row items-center px-3 py-1.5 rounded-full bg-surface border border-border">
              <Text className="text-sm">{SPORT_ICONS[sport] ?? '🏅'} {sport.charAt(0) + sport.slice(1).toLowerCase()}</Text>
            </View>
          ))}
        </View>

        {/* Followers / Following */}
        <View className="flex-row justify-center gap-6 mb-5">
          <Pressable className="items-center">
            <Text className="text-lg font-bold text-secondary">{followerCount}</Text>
            <Text className="text-xs text-muted">Followers</Text>
          </Pressable>
          <Pressable className="items-center">
            <Text className="text-lg font-bold text-secondary">{followingCount}</Text>
            <Text className="text-xs text-muted">Following</Text>
          </Pressable>
        </View>

        {/* Stats Row */}
        {loading ? (
          <View className="py-4">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : stats ? (
          <View className="flex-row mx-4 mb-5 bg-surface rounded-xl p-4">
            <View className="flex-1 items-center">
              <Text className="text-lg font-bold text-secondary">{stats.matchesPlayed}</Text>
              <Text className="text-xs text-muted">Matches</Text>
            </View>
            <View className="flex-1 items-center border-l border-border">
              <Text className="text-lg font-bold text-green-600">{stats.wins}</Text>
              <Text className="text-xs text-muted">Wins</Text>
            </View>
            <View className="flex-1 items-center border-l border-border">
              <Text className="text-lg font-bold text-red-500">{stats.losses}</Text>
              <Text className="text-xs text-muted">Losses</Text>
            </View>
            <View className="flex-1 items-center border-l border-border">
              <Text className="text-lg font-bold text-primary">{winRate}%</Text>
              <Text className="text-xs text-muted">Win Rate</Text>
            </View>
          </View>
        ) : null}

        {/* Tournament History */}
        <View className="px-4 mb-5">
          <Text className="text-base font-semibold text-secondary mb-3">
            Tournament History
          </Text>
          {tournaments.length === 0 ? (
            <View className="bg-surface rounded-xl p-4 items-center">
              <Text className="text-muted text-sm">No tournaments yet</Text>
            </View>
          ) : (
            tournaments.slice(0, 10).map((reg) => (
              <Pressable
                key={reg.id}
                onPress={() =>
                  navigation.getParent()?.navigate('Tournaments', {
                    screen: 'TournamentDetail',
                    params: { id: reg.tournamentId },
                  })
                }
                className="flex-row items-center bg-surface rounded-xl p-3 mb-2"
              >
                <Text className="text-xl mr-3">
                  {reg.tournament ? SPORT_ICONS[reg.tournament.sport] ?? '🏅' : '🏅'}
                </Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-secondary">
                    {reg.tournament?.name ?? 'Tournament'}
                  </Text>
                  <Text className="text-xs text-muted">
                    {reg.tournament?.date
                      ? new Date(reg.tournament.date).toLocaleDateString()
                      : ''}
                    {reg.tournament?.location ? ` · ${reg.tournament.location}` : ''}
                  </Text>
                </View>
                <Text className="text-muted text-xs">→</Text>
              </Pressable>
            ))
          )}
        </View>

        {/* Action Buttons */}
        <View className="px-4">
          <Pressable
            onPress={() => navigation.navigate('EditProfile')}
            className="bg-primary rounded-xl py-3.5 items-center mb-3"
          >
            <Text className="text-white font-semibold text-base">Edit Profile</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('PaymentHistory')}
            className="bg-surface rounded-xl py-3.5 items-center mb-3 border border-border"
          >
            <Text className="text-secondary font-semibold text-base">Payment History</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Settings')}
            className="bg-surface rounded-xl py-3.5 items-center mb-3 border border-border"
          >
            <Text className="text-secondary font-semibold text-base">Settings</Text>
          </Pressable>

          <Pressable
            onPress={handleLogout}
            className="rounded-xl py-3.5 items-center border border-red-300"
          >
            <Text className="text-red-500 font-semibold text-base">Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
