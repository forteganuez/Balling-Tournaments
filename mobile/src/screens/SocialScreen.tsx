import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import {
  getFriends,
  getFriendRequests,
  getLookingForMatch,
  searchUsers,
  sendFriendRequest as apiSendFriendRequest,
  acceptFriendRequest as apiAcceptFriendRequest,
  declineFriendRequest as apiDeclineFriendRequest,
} from '../lib/api';
import type { UserPublic, Friendship, Sport } from '../lib/types';
import type { SocialStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<SocialStackParamList>;

const SPORT_LABELS: Record<Sport, string> = {
  TENNIS: 'T',
  PADEL: 'P',
  SQUASH: 'S',
};

export function SocialScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublic[]>([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<UserPublic[]>([]);
  const [friendRequests, setFriendRequests] = useState<Friendship[]>([]);
  const [lookingForMatch, setLookingForMatch] = useState<Array<UserPublic & { lookingForMatchSport?: Sport | null; sportRatings?: Array<{ sport: Sport; rating: number }> }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [friendsData, requestsData, lookingData] = await Promise.all([
        getFriends(),
        getFriendRequests(),
        getLookingForMatch(),
      ]);
      setFriends(friendsData);
      setFriendRequests(requestsData);
      setLookingForMatch(lookingData as any);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results.filter((u: UserPublic) => u.id !== user?.id));
      } catch {
        // Silently handle
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  const acceptRequest = async (requesterId: string) => {
    try {
      await apiAcceptFriendRequest(requesterId);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const declineRequest = async (requesterId: string) => {
    try {
      await apiDeclineFriendRequest(requesterId);
      setFriendRequests(prev => prev.filter(r => r.requesterId !== requesterId));
    } catch {
      Alert.alert('Error', 'Failed to decline request');
    }
  };

  const handleSendFriendRequest = async (userId: string) => {
    try {
      await apiSendFriendRequest(userId);
      Alert.alert('Sent', 'Friend request sent!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send request');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Search bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 }}>
        <View style={{
          flex: 1, flexDirection: 'row', alignItems: 'center',
          backgroundColor: theme.card, borderRadius: 12, paddingHorizontal: 12,
        }}>
          <Text style={{ marginRight: 8, fontSize: 16 }}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search username..."
            placeholderTextColor={theme.textSecondary}
            style={{ flex: 1, color: theme.text, paddingVertical: 10, fontSize: 15 }}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity
          style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20 }}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* Search results overlay */}
      {searchQuery.length >= 2 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 12, overflow: 'hidden' }}>
            {searching ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : searchResults.length === 0 ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: theme.textSecondary }}>No users found</Text>
              </View>
            ) : (
              searchResults.slice(0, 8).map(u => (
                <TouchableOpacity
                  key={u.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border,
                  }}
                  onPress={() => navigation.navigate('PlayerProfile', { id: u.id })}
                >
                  {u.avatarUrl ? (
                    <Image source={{ uri: u.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
                  ) : (
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.border, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: theme.textSecondary }}>{(u.username || u.name)?.[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '600' }}>
                      {u.displayName || u.username || u.name}
                    </Text>
                    {u.username && (
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>@{u.username}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleSendFriendRequest(u.id)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.primary, borderRadius: 8 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Add</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
      >
        {/* Friend requests */}
        {friendRequests.length > 0 && (
          <>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
              FRIEND REQUESTS ({friendRequests.length})
            </Text>
            <View style={{ backgroundColor: theme.card, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {friendRequests.map(req => (
                <View
                  key={req.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border,
                  }}
                >
                  {req.requester?.avatarUrl ? (
                    <Image source={{ uri: req.requester.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.border, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: theme.textSecondary }}>{req.requester?.name?.[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '600' }}>
                      {(req.requester as any)?.username || req.requester?.name} wants to be friends
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => acceptRequest(req.requesterId)}
                      style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: theme.primary, borderRadius: 8 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => declineRequest(req.requesterId)}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.border, borderRadius: 8 }}
                    >
                      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Looking for a match */}
        {lookingForMatch.length > 0 && (
          <>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
              LOOKING FOR A MATCH
            </Text>
            <View style={{ backgroundColor: theme.card, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              {lookingForMatch.map(friend => (
                <TouchableOpacity
                  key={friend.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border,
                  }}
                  onPress={() => navigation.navigate('PlayerProfile', { id: friend.id })}
                >
                  {friend.avatarUrl ? (
                    <Image source={{ uri: friend.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.border, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: theme.textSecondary }}>{(friend.username || friend.name)?.[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '600' }}>
                      {friend.displayName || friend.username || friend.name}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                      {friend.lookingForMatchSport ? SPORT_LABELS[friend.lookingForMatchSport] : 'Any sport'}
                      {friend.sportRatings?.find(r => r.sport === friend.lookingForMatchSport) &&
                        ` — ${friend.sportRatings.find(r => r.sport === friend.lookingForMatchSport)!.rating.toFixed(1)}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.primary, borderRadius: 8 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Invite</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* All friends */}
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
          ALL FRIENDS ({friends.length})
        </Text>
        <View style={{ backgroundColor: theme.card, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
          {friends.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary, fontSize: 15, marginBottom: 4 }}>No friends yet</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>Search for players to add as friends</Text>
            </View>
          ) : (
            friends.map((friend, index) => (
              <TouchableOpacity
                key={friend.id}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  padding: 12,
                  borderBottomWidth: index < friends.length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                }}
                onPress={() => navigation.navigate('PlayerProfile', { id: friend.id })}
              >
                {friend.avatarUrl ? (
                  <Image source={{ uri: friend.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
                ) : (
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.border, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: theme.textSecondary }}>{(friend.username || friend.name)?.[0]?.toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>
                      {friend.displayName || friend.username || friend.name}
                    </Text>
                    {friend.isBaller && (
                      <View style={{ backgroundColor: '#f59e0b', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginLeft: 6 }}>
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>BALLER</Text>
                      </View>
                    )}
                  </View>
                  {friend.city && (
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{friend.city}</Text>
                  )}
                </View>
                {friend.lookingForMatch && (
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: '#22c55e', marginLeft: 8,
                  }} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
