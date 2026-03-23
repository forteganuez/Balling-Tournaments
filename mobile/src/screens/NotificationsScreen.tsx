import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthContext } from '../context/AuthContext';
import { colors } from '../constants/theme';
import { SkeletonNotificationRow } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import type { Notification, NotificationType } from '../lib/types';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../lib/api';

// ── Helpers ──────────────────────────────────────────────────────────────

function getIconForType(type: NotificationType): string {
  switch (type) {
    case 'MATCH_READY':
    case 'RESULT_CONFIRMED':
    case 'RESULT_DISPUTED':
      return '\u2694\uFE0F'; // ⚔️
    case 'TOURNAMENT_STARTING':
    case 'TOURNAMENT_ANNOUNCEMENT':
    case 'TOURNAMENT_INVITE':
    case 'SPOTS_FILLING':
    case 'NEW_TOURNAMENT':
      return '\uD83C\uDFC6'; // 🏆
    case 'FRIEND_REQUEST':
    case 'FRIEND_ACCEPTED':
      return '\uD83D\uDC65'; // 👥
    case 'FOLLOWED':
      return '\uD83D\uDD14'; // 🔔
  }
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return 'just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears}y ago`;
}

// ── Component ────────────────────────────────────────────────────────────

export function NotificationsScreen() {
  const { user } = useAuthContext();
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      const data = await getNotifications();
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setNotifications(sorted);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load notifications';
      setError(message);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      await fetchNotifications();
      if (mounted) setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, [fetchNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true })),
      );
    } catch {
      Alert.alert('Error', 'Could not mark notifications as read.');
    }
  }, []);

  const handleTap = useCallback(
    async (notification: Notification) => {
      // Mark as read optimistically
      if (!notification.read) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n,
          ),
        );
        try {
          await markNotificationRead(notification.id);
        } catch {
          // Revert on failure
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, read: false } : n,
            ),
          );
        }
      }

      // Navigate based on data
      const data = notification.data;
      if (data?.tournamentId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigation.navigate as (...args: unknown[]) => void)(
          'Tournaments',
          { screen: 'TournamentDetail', params: { id: data.tournamentId } },
        );
      } else if (data?.requesterId || data?.receiverId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigation.navigate as (...args: unknown[]) => void)('Friends');
      }
    },
    [navigation],
  );

  const handleDelete = useCallback((notification: Notification) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const previous = notifications;
            setNotifications((prev) =>
              prev.filter((n) => n.id !== notification.id),
            );
            try {
              await deleteNotification(notification.id);
            } catch {
              setNotifications(previous);
              Alert.alert('Error', 'Could not delete notification.');
            }
          },
        },
      ],
    );
  }, [notifications]);

  // ── Render helpers ───────────────────────────────────────────────────

  const hasUnread = notifications.some((n) => !n.read);

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <Pressable
        onPress={() => handleTap(item)}
        onLongPress={() => handleDelete(item)}
        className={`flex-row items-start px-4 py-3 mb-2 mx-4 rounded-lg ${
          item.read ? 'bg-surface dark:bg-surface-dark opacity-70' : 'bg-white dark:bg-card-dark border-l-4'
        }`}
        style={!item.read ? { borderLeftColor: colors.primary } : undefined}
      >
        <Text className="text-2xl mr-3 mt-0.5">{getIconForType(item.type)}</Text>
        <View className="flex-1">
          <Text
            className={`text-base font-bold ${
              item.read ? 'text-muted dark:text-muted-dark' : 'text-secondary dark:text-secondary-dark'
            }`}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            className={`text-sm mt-0.5 ${
              item.read ? 'text-muted dark:text-muted-dark' : 'text-secondary dark:text-secondary-dark'
            }`}
            numberOfLines={2}
          >
            {item.body}
          </Text>
          <Text className="text-xs text-muted dark:text-muted-dark mt-1">
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
      </Pressable>
    ),
    [handleTap, handleDelete],
  );

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  // ── Main render ────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
        <Text className="text-2xl font-bold text-secondary dark:text-secondary-dark">Notifications</Text>
        {hasUnread && (
          <Pressable onPress={handleMarkAllRead}>
            <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View className="pt-2">
          <SkeletonNotificationRow />
          <SkeletonNotificationRow />
          <SkeletonNotificationRow />
          <SkeletonNotificationRow />
          <SkeletonNotificationRow />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">{'\u26A0\uFE0F'}</Text>
          <Text className="text-base text-muted dark:text-muted-dark text-center mb-4">{error}</Text>
          <Pressable
            onPress={handleRefresh}
            className="bg-primary rounded-lg px-6 py-3"
          >
            <Text className="text-white font-semibold text-sm">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={
            notifications.length === 0 ? { flex: 1 } : { paddingTop: 8, paddingBottom: 24 }
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={'\uD83D\uDD14'}
              title="No notifications yet"
              message="When something happens — a match, a tournament, or a friend request — you'll see it here."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
