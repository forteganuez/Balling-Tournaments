import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../context/AuthContext';
import * as api from '../lib/api';
import type {
  Follow,
  Friendship,
  Sport,
  User,
  UserPublic,
} from '../lib/types';
import type { ProfileStackParamList } from '../navigation/types';
import { colors } from '../constants/theme';
import { SkeletonFriendRow } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';

type Tab = 'friends' | 'requests' | 'following' | 'followers';

const TABS: { key: Tab; label: string }[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'requests', label: 'Requests' },
  { key: 'following', label: 'Following' },
  { key: 'followers', label: 'Followers' },
];

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

function Avatar({ uri, name, size = 'md' }: { uri?: string | null; name: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
  const textSize = size === 'sm' ? 'text-base' : 'text-lg';

  if (uri) {
    return <Image source={{ uri }} className={`${sizeClass} rounded-full`} />;
  }
  return (
    <View className={`${sizeClass} rounded-full bg-primary/10 items-center justify-center`}>
      <Text className={`${textSize} font-bold text-primary`}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function SkillBadge({ level }: { level: number }) {
  const { text, bg } = getSkillColor(level);
  return (
    <View className={`px-2 py-0.5 rounded-full ${bg}`}>
      <Text className={`text-xs font-semibold ${text}`}>
        Lvl {level} · {getSkillLabel(level)}
      </Text>
    </View>
  );
}

function SportTags({ sports }: { sports: Sport[] }) {
  return (
    <View className="flex-row flex-wrap gap-1 mt-1">
      {sports.map((sport) => (
        <View key={sport} className="flex-row items-center px-2 py-0.5 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark">
          <Text className="text-xs">
            {SPORT_ICONS[sport] ?? '🏅'} {sport.charAt(0) + sport.slice(1).toLowerCase()}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function FriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user } = useAuthContext();

  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublic[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [following, setFollowing] = useState<Follow[]>([]);
  const [followers, setFollowers] = useState<Follow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [pendingFriendIds, setPendingFriendIds] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [friendsData, requestsData, followingData, followersData] = await Promise.all([
        api.getFriends(),
        api.getFriendRequests(),
        api.getFollowing(),
        api.getFollowers(),
      ]);
      setFriends(friendsData);
      setRequests(requestsData);
      setFollowing(followingData);
      setFollowers(followersData);

      setFollowingIds(new Set(followingData.map((f) => f.followingId)));
      setPendingFriendIds(new Set(requestsData.map((r) => r.requesterId)));
    } catch {
      setError('Failed to load data. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.searchUsers(trimmed);
        setSearchResults(results.filter((r) => r.id !== user?.id));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, user?.id]);

  const setActionLoadingFor = (id: string, value: boolean) => {
    setActionLoading((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleFollow = async (userId: string) => {
    setActionLoadingFor(userId, true);
    try {
      await api.followUser(userId);
      setFollowingIds((prev) => new Set(prev).add(userId));
      await fetchData();
    } catch {
      Alert.alert('Error', 'Could not follow user.');
    } finally {
      setActionLoadingFor(userId, false);
    }
  };

  const handleUnfollow = async (userId: string) => {
    setActionLoadingFor(userId, true);
    try {
      await api.unfollowUser(userId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      await fetchData();
    } catch {
      Alert.alert('Error', 'Could not unfollow user.');
    } finally {
      setActionLoadingFor(userId, false);
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    setActionLoadingFor(userId, true);
    try {
      await api.sendFriendRequest(userId);
      setPendingFriendIds((prev) => new Set(prev).add(userId));
    } catch {
      Alert.alert('Error', 'Could not send friend request.');
    } finally {
      setActionLoadingFor(userId, false);
    }
  };

  const handleAcceptRequest = async (requesterId: string) => {
    setActionLoadingFor(requesterId, true);
    try {
      await api.acceptFriendRequest(requesterId);
      await fetchData();
    } catch {
      Alert.alert('Error', 'Could not accept request.');
    } finally {
      setActionLoadingFor(requesterId, false);
    }
  };

  const handleDeclineRequest = async (requesterId: string) => {
    setActionLoadingFor(requesterId, true);
    try {
      await api.declineFriendRequest(requesterId);
      await fetchData();
    } catch {
      Alert.alert('Error', 'Could not decline request.');
    } finally {
      setActionLoadingFor(requesterId, false);
    }
  };

  const navigateToProfile = (id: string) => {
    navigation.navigate('PlayerProfile', { id });
  };

  const friendIds = new Set(friends.map((f) => f.id));

  const isSearchActive = searchQuery.trim().length >= 2;

  // ── Search result row ────────────────────────────────────────────────

  const renderSearchResult = ({ item }: { item: UserPublic }) => {
    const isAlreadyFriend = friendIds.has(item.id);
    const isPending = pendingFriendIds.has(item.id);
    const isFollowing = followingIds.has(item.id);
    const isLoading = actionLoading.has(item.id);

    return (
      <Pressable
        onPress={() => navigateToProfile(item.id)}
        className="flex-row items-center bg-white dark:bg-card-dark px-4 py-3 border-b border-border dark:border-border-dark"
      >
        <Avatar uri={item.avatarUrl} name={item.name} />
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-secondary dark:text-secondary-dark">{item.name}</Text>
          {item.city ? (
            <Text className="text-xs text-muted dark:text-muted-dark mt-0.5">📍 {item.city}</Text>
          ) : null}
          <View className="flex-row items-center gap-2 mt-1">
            {item.skillLevel != null && <SkillBadge level={item.skillLevel} />}
          </View>
          {item.sports && item.sports.length > 0 && <SportTags sports={item.sports} />}
        </View>
        <View className="items-end gap-1.5">
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              {isFollowing ? (
                <Pressable
                  onPress={() => handleUnfollow(item.id)}
                  className="px-3 py-1.5 rounded-full border border-border dark:border-border-dark"
                >
                  <Text className="text-xs font-medium text-muted dark:text-muted-dark">Following</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => handleFollow(item.id)}
                  className="px-3 py-1.5 rounded-full bg-primary"
                >
                  <Text className="text-xs font-medium text-white">Follow</Text>
                </Pressable>
              )}
              {isAlreadyFriend ? (
                <View className="px-3 py-1.5 rounded-full bg-green-100">
                  <Text className="text-xs font-medium text-green-600">Friends</Text>
                </View>
              ) : isPending ? (
                <View className="px-3 py-1.5 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark">
                  <Text className="text-xs font-medium text-muted dark:text-muted-dark">Pending</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleSendFriendRequest(item.id)}
                  className="px-3 py-1.5 rounded-full bg-secondary"
                >
                  <Text className="text-xs font-medium text-white">Add Friend</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </Pressable>
    );
  };

  // ── Friend row ───────────────────────────────────────────────────────

  const renderFriend = ({ item }: { item: User }) => (
    <Pressable
      onPress={() => navigateToProfile(item.id)}
      className="flex-row items-center bg-white dark:bg-card-dark px-4 py-3 border-b border-border dark:border-border-dark"
    >
      <Avatar uri={item.avatarUrl} name={item.name} />
      <View className="flex-1 ml-3">
        <Text className="text-base font-semibold text-secondary dark:text-secondary-dark">{item.name}</Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          {item.skillLevel != null && <SkillBadge level={item.skillLevel} />}
          {item.city ? (
            <Text className="text-xs text-muted dark:text-muted-dark">📍 {item.city}</Text>
          ) : null}
        </View>
      </View>
      <Text className="text-muted dark:text-muted-dark text-sm">→</Text>
    </Pressable>
  );

  // ── Request row ──────────────────────────────────────────────────────

  const renderRequest = ({ item }: { item: Friendship }) => {
    const requester = item.requester;
    if (!requester) return null;
    const isLoading = actionLoading.has(requester.id);

    return (
      <Pressable
        onPress={() => navigateToProfile(requester.id)}
        className="flex-row items-center bg-white dark:bg-card-dark px-4 py-3 border-b border-border dark:border-border-dark"
      >
        <Avatar uri={requester.avatarUrl} name={requester.name} />
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-secondary dark:text-secondary-dark">{requester.name}</Text>
          {requester.city ? (
            <Text className="text-xs text-muted dark:text-muted-dark mt-0.5">📍 {requester.city}</Text>
          ) : null}
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => handleAcceptRequest(requester.id)}
              className="px-3 py-1.5 rounded-full bg-primary"
            >
              <Text className="text-xs font-medium text-white">Accept</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDeclineRequest(requester.id)}
              className="px-3 py-1.5 rounded-full border border-red-300"
            >
              <Text className="text-xs font-medium text-red-500 dark:text-red-300">Decline</Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  // ── Follow row (following / follower) ────────────────────────────────

  const renderFollowUser = (userInfo: UserPublic | undefined) => {
    if (!userInfo) return null;
    return (
      <Pressable
        onPress={() => navigateToProfile(userInfo.id)}
        className="flex-row items-center bg-white dark:bg-card-dark px-4 py-3 border-b border-border dark:border-border-dark"
      >
        <Avatar uri={userInfo.avatarUrl} name={userInfo.name} />
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-secondary dark:text-secondary-dark">{userInfo.name}</Text>
          {userInfo.city ? (
            <Text className="text-xs text-muted dark:text-muted-dark mt-0.5">📍 {userInfo.city}</Text>
          ) : null}
          {userInfo.skillLevel != null && (
            <View className="mt-1">
              <SkillBadge level={userInfo.skillLevel} />
            </View>
          )}
        </View>
        <Text className="text-muted dark:text-muted-dark text-sm">→</Text>
      </Pressable>
    );
  };

  const renderFollowing = ({ item }: { item: Follow }) => renderFollowUser(item.following);
  const renderFollower = ({ item }: { item: Follow }) => renderFollowUser(item.follower);

  // ── Empty state helper ─────────────────────────────────────────────

  const TabEmptyState = ({ icon, title, message }: { icon: string; title: string; message: string }) => (
    <EmptyState icon={icon} title={title} message={message} />
  );

  // ── Main render ──────────────────────────────────────────────────────

  const renderTabContent = () => {
    if (loading) {
      return (
        <View>
          <SkeletonFriendRow />
          <SkeletonFriendRow />
          <SkeletonFriendRow />
          <SkeletonFriendRow />
        </View>
      );
    }

    if (error) {
      return (
        <View className="flex-1 items-center justify-center py-16 px-8">
          <Text className="text-red-500 dark:text-red-300 text-center text-base">{error}</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'friends':
        return (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={renderFriend}
            ListEmptyComponent={<TabEmptyState icon="👥" title="No friends yet" message="Search for players above to connect and add them as friends." />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
          />
        );
      case 'requests':
        return (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequest}
            ListEmptyComponent={<TabEmptyState icon="📬" title="No pending requests" message="When someone sends you a friend request, it will appear here." />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
          />
        );
      case 'following':
        return (
          <FlatList
            data={following}
            keyExtractor={(item) => item.id}
            renderItem={renderFollowing}
            ListEmptyComponent={<TabEmptyState icon="👀" title="Not following anyone" message="Follow players to keep up with their tournaments and matches." />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
          />
        );
      case 'followers':
        return (
          <FlatList
            data={followers}
            keyExtractor={(item) => item.id}
            renderItem={renderFollower}
            ListEmptyComponent={<TabEmptyState icon="🌟" title="No followers yet" message="As you play and compete, other players will start following you." />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
          />
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-secondary dark:text-secondary-dark mb-3">Friends</Text>

        {/* Search bar */}
        <View className="flex-row items-center bg-surface dark:bg-surface-dark rounded-xl px-3 py-2 mb-3 border border-border dark:border-border-dark">
          <Text className="text-base mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-base text-secondary dark:text-secondary-dark"
            placeholder="Search players..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text className="text-muted dark:text-muted-dark text-base ml-2">✕</Text>
            </Pressable>
          )}
        </View>

        {/* Tabs (only when not searching) */}
        {!isSearchActive && (
          <View className="flex-row gap-1">
            {TABS.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-lg items-center ${
                  activeTab === tab.key ? 'bg-primary' : 'bg-surface dark:bg-surface-dark'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    activeTab === tab.key ? 'text-white' : 'text-muted dark:text-muted-dark'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'requests' && requests.length > 0
                    ? ` (${requests.length})`
                    : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Content */}
      {isSearchActive ? (
        searchLoading ? (
          <View className="flex-1 items-center justify-center py-16">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : searchResults.length === 0 ? (
          <EmptyState icon="🔍" title="No players found" message="Try a different name." />
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderSearchResult}
          />
        )
      ) : (
        renderTabContent()
      )}
    </SafeAreaView>
  );
}
