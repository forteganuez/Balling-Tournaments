import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getStoredValue, setStoredValue } from '../lib/storage';

const PREFS_KEY = 'notification_preferences';

interface NotificationPrefs {
  matchReady: boolean;
  resultUpdates: boolean;
  tournamentStarting: boolean;
  tournamentAnnouncements: boolean;
  spotsFilling: boolean;
  newTournaments: boolean;
  friendRequests: boolean;
  follows: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  matchReady: true,
  resultUpdates: true,
  tournamentStarting: true,
  tournamentAnnouncements: true,
  spotsFilling: true,
  newTournaments: true,
  friendRequests: true,
  follows: true,
};

const SECTIONS: {
  title: string;
  items: { key: keyof NotificationPrefs; label: string; detail: string }[];
}[] = [
  {
    title: 'Matches',
    items: [
      { key: 'matchReady', label: 'Match ready', detail: 'When your match is scheduled to start' },
      { key: 'resultUpdates', label: 'Result updates', detail: 'Confirmations and disputes on results' },
    ],
  },
  {
    title: 'Tournaments',
    items: [
      { key: 'tournamentStarting', label: 'Tournament starting', detail: 'Reminders before a tournament begins' },
      { key: 'tournamentAnnouncements', label: 'Announcements', detail: 'Messages from tournament organizers' },
      { key: 'spotsFilling', label: 'Spots filling up', detail: 'When tournaments you follow are almost full' },
      { key: 'newTournaments', label: 'New tournaments', detail: 'When a new tournament is created in your sport' },
    ],
  },
  {
    title: 'Social',
    items: [
      { key: 'friendRequests', label: 'Friend requests', detail: 'When someone sends you a friend request' },
      { key: 'follows', label: 'New followers', detail: 'When someone starts following you' },
    ],
  },
];

export function NotificationPreferencesScreen() {
  const { theme } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await getStoredValue(PREFS_KEY);
      if (stored) {
        try {
          setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
        } catch {
          // ignore corrupted data
        }
      }
      setLoading(false);
    })();
  }, []);

  const toggle = useCallback(
    (key: keyof NotificationPrefs) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        void setStoredValue(PREFS_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-background-dark items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-5 pt-2 pb-4">
          <Text className="text-sm text-slate-500 dark:text-slate-400 leading-5">
            Choose which notifications you want to receive. You can change these anytime.
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} className="mb-2">
            <View className="px-5 py-2">
              <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {section.title}
              </Text>
            </View>
            <View className="mx-4 rounded-2xl border border-border dark:border-border-dark bg-white dark:bg-card-dark overflow-hidden">
              {section.items.map((item, i) => (
                <View
                  key={item.key}
                  className={`flex-row items-center justify-between px-4 py-3.5 ${
                    i < section.items.length - 1 ? 'border-b border-border dark:border-border-dark' : ''
                  }`}
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-base text-slate-900 dark:text-slate-50">{item.label}</Text>
                    <Text className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.detail}</Text>
                  </View>
                  <Switch
                    value={prefs[item.key]}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
