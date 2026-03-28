import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { getMyRatings, getLeaderboard, getRatingHistory } from '../lib/api';
import type { Sport, UserSportRating, LeaderboardEntry, RatingHistoryEntry } from '../lib/types';
import type { RankingStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RankingStackParamList>;

const SPORTS: Sport[] = ['TENNIS', 'PADEL', 'SQUASH'];
const SPORT_LABELS: Record<Sport, string> = {
  TENNIS: 'Tennis',
  PADEL: 'Padel',
  SQUASH: 'Squash',
};

export function RankingScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [selectedSport, setSelectedSport] = useState<Sport>('PADEL');
  const [myRatings, setMyRatings] = useState<UserSportRating[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentHistory, setRecentHistory] = useState<RatingHistoryEntry[]>([]);
  const [myPosition, setMyPosition] = useState<{ rank: number; rating: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'global' | 'friends'>('global');

  const fetchData = useCallback(async () => {
    try {
      const [ratings, leaderboardRes, history] = await Promise.all([
        getMyRatings(),
        getLeaderboard(selectedSport, filter, 20),
        getRatingHistory(selectedSport, 10),
      ]);
      setMyRatings(ratings);
      setLeaderboard(leaderboardRes.leaderboard);
      setMyPosition(leaderboardRes.myPosition);
      setRecentHistory(history);
    } catch {
      // Silently handle errors
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSport, filter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const currentRating = myRatings.find(r => r.sport === selectedSport);

  const renderRatingCard = () => {
    if (!currentRating) return null;

    const changeColor = (currentRating.weeklyChange || 0) >= 0 ? '#22c55e' : '#ef4444';
    const changePrefix = (currentRating.weeklyChange || 0) >= 0 ? '↑' : '↓';

    return (
      <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>
          YOUR RANKING
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: theme.primary + '20',
            alignItems: 'center', justifyContent: 'center',
            marginRight: 16,
          }}>
            <Text style={{ color: theme.primary, fontSize: 24, fontWeight: '700' }}>
              {currentRating.rating.toFixed(1)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            {currentRating.weeklyChange !== undefined && currentRating.weeklyChange !== 0 && (
              <Text style={{ color: changeColor, fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                {changePrefix} {Math.abs(currentRating.weeklyChange).toFixed(1)} this week
              </Text>
            )}
            <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
              Best: {currentRating.bestRating.toFixed(1)} | W: {currentRating.wins} L: {currentRating.losses}
            </Text>
            {!currentRating.isPublic && (
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                🔒 Play {3 - currentRating.matchesPlayed} more to unlock ranking
              </Text>
            )}
          </View>
        </View>

        {/* Mini sparkline (simplified as dots) */}
        {recentHistory.length > 1 && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 40, gap: 2 }}>
            {recentHistory.map((entry, i) => {
              const minRating = Math.min(...recentHistory.map(e => e.newRating));
              const maxRating = Math.max(...recentHistory.map(e => e.newRating));
              const range = maxRating - minRating || 1;
              const height = ((entry.newRating - minRating) / range) * 30 + 5;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height,
                    borderRadius: 2,
                    backgroundColor: entry.result === 'WIN' ? '#22c55e' : '#ef4444',
                    opacity: 0.7,
                  }}
                />
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: item.userId === user?.id ? theme.primary + '10' : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
      onPress={() => navigation.navigate('PlayerProfile', { id: item.userId })}
    >
      <Text style={{
        width: 32,
        color: item.rank <= 3 ? '#f59e0b' : theme.textSecondary,
        fontSize: 14,
        fontWeight: item.rank <= 3 ? '700' : '400',
      }}>
        {item.rank}.
      </Text>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }} />
      ) : (
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.border, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
            {(item.username || item.name)?.[0]?.toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>
            {item.displayName || item.username || item.name}
          </Text>
          {item.isBaller && (
            <View style={{ backgroundColor: '#f59e0b', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, marginLeft: 6 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>BALLER</Text>
            </View>
          )}
        </View>
        {item.city && (
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{item.city}</Text>
        )}
      </View>
      <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 16 }}>
        {item.rating.toFixed(1)}
      </Text>
    </TouchableOpacity>
  );

  const renderRecentMatch = (entry: RatingHistoryEntry, index: number) => {
    const isWin = entry.result === 'WIN';
    return (
      <View
        key={index}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View style={{
          width: 24, height: 24, borderRadius: 12,
          backgroundColor: isWin ? '#22c55e20' : '#ef444420',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 10,
        }}>
          <Text style={{ color: isWin ? '#22c55e' : '#ef4444', fontWeight: '700', fontSize: 12 }}>
            {isWin ? 'W' : 'L'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 14 }}>
            vs {entry.opponent?.displayName || entry.opponent?.username || entry.opponent?.name || 'Unknown'} ({entry.opponentRating.toFixed(1)})
          </Text>
        </View>
        <Text style={{
          color: isWin ? '#22c55e' : '#ef4444',
          fontWeight: '600',
          fontSize: 13,
        }}>
          {entry.delta > 0 ? '+' : ''}{entry.delta.toFixed(2)} → {entry.newRating.toFixed(1)}
        </Text>
      </View>
    );
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
      {/* Sport tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 }}>
        {SPORTS.map(sport => (
          <TouchableOpacity
            key={sport}
            onPress={() => setSelectedSport(sport)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: selectedSport === sport ? theme.primary : theme.card,
            }}
          >
            <Text style={{
              color: selectedSport === sport ? '#fff' : theme.textSecondary,
              fontWeight: '600',
              fontSize: 14,
            }}>
              {SPORT_LABELS[sport]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Rating card */}
        {renderRatingCard()}

        {/* Leaderboard filter */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>LEADERBOARD</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['global', 'friends'] as const).map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: filter === f ? theme.primary + '20' : 'transparent',
                }}
              >
                <Text style={{
                  color: filter === f ? theme.primary : theme.textSecondary,
                  fontSize: 12,
                  fontWeight: '600',
                }}>
                  {f === 'global' ? 'Global' : 'Friends'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: theme.card, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          {leaderboard.map((item, index) => (
            <React.Fragment key={item.userId}>
              {renderLeaderboardItem({ item })}
            </React.Fragment>
          ))}
          {myPosition && !leaderboard.find(l => l.userId === user?.id) && (
            <>
              <View style={{ paddingVertical: 6, alignItems: 'center', backgroundColor: theme.border + '40' }}>
                <Text style={{ color: theme.textSecondary, fontSize: 11 }}>── YOUR POSITION ──</Text>
              </View>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingVertical: 12, paddingHorizontal: 16,
                backgroundColor: theme.primary + '10',
              }}>
                <Text style={{ width: 32, color: theme.text, fontSize: 14, fontWeight: '600' }}>
                  {myPosition.rank}.
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>
                    {user?.displayName || user?.username || user?.name}
                  </Text>
                </View>
                <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 16 }}>
                  {myPosition.rating.toFixed(1)}
                </Text>
              </View>
            </>
          )}
          {leaderboard.length === 0 && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: theme.textSecondary }}>No ranked players yet</Text>
            </View>
          )}
        </View>

        {/* Recent matches */}
        {recentHistory.length > 0 && (
          <>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>
              RECENT MATCHES
            </Text>
            <View style={{ backgroundColor: theme.card, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
              {recentHistory.slice().reverse().map(renderRecentMatch)}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
