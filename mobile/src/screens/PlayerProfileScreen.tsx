import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthContext } from '../context/AuthContext';
import * as api from '../lib/api';
import type {
  Follow,
  Friendship,
  Registration,
  Sport,
  User,
  UserStats,
} from '../lib/types';
import type { ProfileStackParamList } from '../navigation/types';
import { colors } from '../constants/theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PlayerProfile'>;

type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

const SPORT_ICONS: Record<string, string> = {
  PADEL: '🏓',
  TENNIS: '🎾',
  SQUASH: '🏸',
};

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

export function PlayerProfileScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { user: currentUser } = useAuthContext();

  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [tournaments, setTournaments] = useState<Registration[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [profileData, statsData, tournamentsData, followingData, friendsData, requestsData] =
        await Promise.all([
          api.getUserProfile(id),
          api.getUserStats(id),
          api.getUserTournaments(id),
          api.getFollowing(),
          api.getFriends(),
          api.getFriendRequests(),
        ]);

      setProfile(profileData);
      setStats(statsData);
      setTournaments(tournamentsData);

      // Check if current user follows this player
      setIsFollowing(followingData.some((f: Follow) => f.followingId === id));

      // Determine friendship status
      const isFriend = friendsData.some((f: User) => f.id === id);
      if (isFriend) {
        setFriendStatus('accepted');
      } else {
        // Check incoming requests (someone requested us)
        const incomingRequest = requestsData.find(
          (r: Friendship) => r.requesterId === id && r.status === 'PENDING'
        );
        if (incomingRequest) {
          setFriendStatus('pending_received');
        } else {
          // We cannot easily check outgoing from these APIs, so we track it locally
          setFriendStatus((prev) => (prev === 'pending_sent' ? 'pending_sent' : 'none'));
        }
      }
    } catch {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (profile) {
      navigation.setOptions({ title: profile.name });
    }
  }, [profile, navigation]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      await api.followUser(id);
      setIsFollowing(true);
    } catch {
      Alert.alert('Error', 'Could not follow user.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setFollowLoading(true);
    try {
      await api.unfollowUser(id);
      setIsFollowing(false);
    } catch {
      Alert.alert('Error', 'Could not unfollow user.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    setFriendLoading(true);
    try {
      await api.sendFriendRequest(id);
      setFriendStatus('pending_sent');
    } catch {
      Alert.alert('Error', 'Could not send friend request.');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    setFriendLoading(true);
    try {
      await api.acceptFriendRequest(id);
      setFriendStatus('accepted');
    } catch {
      Alert.alert('Error', 'Could not accept friend request.');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    Alert.alert('Remove Friend', 'Are you sure you want to remove this friend?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setFriendLoading(true);
          try {
            await api.removeFriend(id);
            setFriendStatus('none');
          } catch {
            Alert.alert('Error', 'Could not remove friend.');
          } finally {
            setFriendLoading(false);
          }
        },
      },
    ]);
  };

  // ── Loading state ────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────

  if (error || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-red-500 text-center text-base mb-4">
            {error ?? 'Profile not found.'}
          </Text>
          <Pressable onPress={() => navigation.goBack()} className="px-6 py-2.5 rounded-lg bg-primary">
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const winRate =
    stats && stats.matchesPlayed > 0
      ? Math.round((stats.wins / stats.matchesPlayed) * 100)
      : 0;

  const isOwnProfile = currentUser?.id === id;

  // ── Friend button ────────────────────────────────────────────────────

  const renderFriendButton = () => {
    if (isOwnProfile) return null;

    if (friendLoading) {
      return (
        <View className="flex-1 py-3 rounded-xl items-center bg-surface border border-border">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }

    switch (friendStatus) {
      case 'accepted':
        return (
          <Pressable
            onPress={handleRemoveFriend}
            className="flex-1 py-3 rounded-xl items-center bg-green-100 border border-green-300"
          >
            <Text className="text-green-600 font-semibold text-sm">Friends</Text>
          </Pressable>
        );
      case 'pending_sent':
        return (
          <View className="flex-1 py-3 rounded-xl items-center bg-surface border border-border">
            <Text className="text-muted font-semibold text-sm">Request Sent</Text>
          </View>
        );
      case 'pending_received':
        return (
          <Pressable
            onPress={handleAcceptFriendRequest}
            className="flex-1 py-3 rounded-xl items-center bg-secondary"
          >
            <Text className="text-white font-semibold text-sm">Accept Request</Text>
          </Pressable>
        );
      default:
        return (
          <Pressable
            onPress={handleSendFriendRequest}
            className="flex-1 py-3 rounded-xl items-center bg-secondary"
          >
            <Text className="text-white font-semibold text-sm">Add Friend</Text>
          </Pressable>
        );
    }
  };

  // ── Follow button ────────────────────────────────────────────────────

  const renderFollowButton = () => {
    if (isOwnProfile) return null;

    if (followLoading) {
      return (
        <View className="flex-1 py-3 rounded-xl items-center bg-surface border border-border">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }

    if (isFollowing) {
      return (
        <Pressable
          onPress={handleUnfollow}
          className="flex-1 py-3 rounded-xl items-center border border-border"
        >
          <Text className="text-muted font-semibold text-sm">Following</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={handleFollow}
        className="flex-1 py-3 rounded-xl items-center bg-primary"
      >
        <Text className="text-white font-semibold text-sm">Follow</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Avatar + Name */}
        <View className="items-center pt-8 pb-4">
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} className="w-24 h-24 rounded-full mb-3" />
          ) : (
            <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center mb-3">
              <Text className="text-4xl font-bold text-primary">
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text className="text-xl font-bold text-secondary">{profile.name}</Text>
          {profile.city ? (
            <Text className="text-sm text-muted mt-0.5">📍 {profile.city}</Text>
          ) : null}
          {profile.bio ? (
            <Text className="text-sm text-muted mt-1 px-8 text-center">{profile.bio}</Text>
          ) : null}
        </View>

        {/* Skill Badge + Sport Tags */}
        <View className="flex-row items-center justify-center flex-wrap gap-2 px-4 mb-4">
          {profile.skillLevel != null && (
            <View
              className={`flex-row items-center px-3 py-1.5 rounded-full ${getSkillColor(profile.skillLevel).bg}`}
            >
              <Text
                className={`text-sm font-semibold ${getSkillColor(profile.skillLevel).text}`}
              >
                Lvl {profile.skillLevel} · {getSkillLabel(profile.skillLevel)}
              </Text>
            </View>
          )}
          {profile.sports?.map((sport: Sport) => (
            <View
              key={sport}
              className="flex-row items-center px-3 py-1.5 rounded-full bg-surface border border-border"
            >
              <Text className="text-sm">
                {SPORT_ICONS[sport] ?? '🏅'} {sport.charAt(0) + sport.slice(1).toLowerCase()}
              </Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <View className="flex-row gap-3 px-4 mb-5">
            {renderFollowButton()}
            {renderFriendButton()}
          </View>
        )}

        {/* Stats Row */}
        {stats ? (
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
          <Text className="text-base font-semibold text-secondary mb-3">Recent Tournaments</Text>
          {tournaments.length === 0 ? (
            <View className="bg-surface rounded-xl p-4 items-center">
              <Text className="text-muted text-sm">No tournaments yet</Text>
            </View>
          ) : (
            tournaments.slice(0, 10).map((reg) => (
              <View key={reg.id} className="flex-row items-center bg-surface rounded-xl p-3 mb-2">
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
                {reg.tournament?.status && (
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      reg.tournament.status === 'COMPLETED'
                        ? 'bg-green-100'
                        : reg.tournament.status === 'IN_PROGRESS'
                          ? 'bg-blue-100'
                          : reg.tournament.status === 'CANCELLED'
                            ? 'bg-red-100'
                            : 'bg-surface'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        reg.tournament.status === 'COMPLETED'
                          ? 'text-green-600'
                          : reg.tournament.status === 'IN_PROGRESS'
                            ? 'text-blue-600'
                            : reg.tournament.status === 'CANCELLED'
                              ? 'text-red-500'
                              : 'text-muted'
                      }`}
                    >
                      {reg.tournament.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
