import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../context/AuthContext';
import * as api from '../lib/api';
import type { AdminManagedUser, UserRole } from '../lib/types';
import { colors } from '../constants/theme';

const ROLE_OPTIONS: UserRole[] = ['PLAYER', 'ORGANIZER', 'ADMIN'];

const ROLE_LABELS: Record<UserRole, string> = {
  PLAYER: 'Player',
  ORGANIZER: 'Organizer',
  ADMIN: 'Admin',
};

const ROLE_STYLES: Record<UserRole, { bg: string; text: string }> = {
  PLAYER: { bg: 'bg-[#eef2ff]', text: 'text-[#3730a3]' },
  ORGANIZER: { bg: 'bg-[#ecfdf3]', text: 'text-[#027a48]' },
  ADMIN: { bg: 'bg-[#fff4e5]', text: 'text-[#b54708]' },
};

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AdminUsersScreen() {
  const { user } = useAuthContext();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async (search: string) => {
    try {
      const data = await api.adminSearchUsers(search);
      setUsers(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadUsers(query);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, loadUsers]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadUsers(query);
  }, [loadUsers, query]);

  function confirmRoleChange(target: AdminManagedUser, role: UserRole) {
    if (target.role === role) {
      return;
    }

    Alert.alert(
      'Change user role',
      `Make ${target.name} an ${ROLE_LABELS[role]}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update role',
          onPress: () => void handleRoleChange(target.id, role),
        },
      ],
    );
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    setBusyUserId(userId);
    try {
      const updated = await api.adminUpdateUserRole(userId, role);
      setUsers((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch (err) {
      Alert.alert(
        'Could not update role',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setBusyUserId(null);
    }
  }

  if (user?.role !== 'ADMIN') {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-bold text-secondary">Admins only</Text>
          <Text className="mt-2 text-center text-sm text-muted">
            You need admin access to manage organizer permissions.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View className="px-4 pt-4">
          <View className="rounded-[30px] bg-[#102a43] px-5 py-6">
            <Text className="text-sm font-semibold uppercase tracking-[2px] text-[#d9e2ec]">
              Admin Tools
            </Text>
            <Text className="mt-3 text-3xl font-bold leading-10 text-white">
              Promote players into organizers whenever you need.
            </Text>
            <Text className="mt-3 text-base leading-6 text-[#bcccdc]">
              Search for a user, then switch their role instantly from here.
            </Text>
          </View>

          <View className="mt-5 rounded-2xl border border-border bg-white px-4 py-3">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-muted">
              Search users
            </Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Name, email, or city"
              placeholderTextColor="#9CA3AF"
              className="mt-2 text-base text-secondary"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View className="px-4 pt-5">
          {loading ? (
            <View className="py-10">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : users.length === 0 ? (
            <View className="rounded-2xl border border-border bg-surface px-5 py-6">
              <Text className="text-base font-semibold text-secondary">No users found</Text>
              <Text className="mt-2 text-sm text-muted">
                Try a different name, email, or city.
              </Text>
            </View>
          ) : (
            users.map((entry) => (
              <View
                key={entry.id}
                className="mb-4 rounded-2xl border border-border bg-white px-4 py-4"
              >
                <View className="flex-row items-center">
                  {entry.avatarUrl ? (
                    <Image source={{ uri: entry.avatarUrl }} className="h-12 w-12 rounded-full" />
                  ) : (
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Text className="text-sm font-bold text-primary">
                        {initials(entry.name)}
                      </Text>
                    </View>
                  )}
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-secondary">{entry.name}</Text>
                    <Text className="text-sm text-muted">{entry.email}</Text>
                    {entry.city ? (
                      <Text className="mt-1 text-xs text-muted">{entry.city}</Text>
                    ) : null}
                  </View>
                  <View className={`rounded-full px-3 py-1.5 ${ROLE_STYLES[entry.role].bg}`}>
                    <Text className={`text-xs font-semibold ${ROLE_STYLES[entry.role].text}`}>
                      {ROLE_LABELS[entry.role]}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  {ROLE_OPTIONS.map((role) => {
                    const isCurrent = entry.role === role;
                    const isBusy = busyUserId === entry.id;
                    return (
                      <Pressable
                        key={`${entry.id}-${role}`}
                        onPress={() => confirmRoleChange(entry, role)}
                        disabled={isCurrent || isBusy}
                        className={`mr-2 mt-2 rounded-full border px-4 py-2 ${
                          isCurrent
                            ? 'border-[#102a43] bg-[#102a43]'
                            : 'border-border bg-white'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            isCurrent ? 'text-white' : 'text-secondary'
                          }`}
                        >
                          {isBusy && !isCurrent ? 'Updating...' : ROLE_LABELS[role]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
