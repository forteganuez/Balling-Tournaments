import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ProfileStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Settings'>;

type ThemeMode = 'system' | 'light' | 'dark';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const PROVIDER_LABELS: Record<string, string> = {
  LOCAL: 'Email & Password',
  GOOGLE: 'Google',
  APPLE: 'Apple',
  MICROSOFT: 'Microsoft',
};

function SectionHeader({ title, danger }: { title: string; danger?: boolean }) {
  return (
    <Text
      className={`text-xs font-semibold uppercase tracking-wider px-4 pt-6 pb-2 ${
        danger ? 'text-red-500' : 'text-muted'
      }`}
    >
      {title}
    </Text>
  );
}

function SettingsRow({
  label,
  detail,
  onPress,
  danger,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3.5 border-b border-border bg-white"
    >
      <Text
        className={`text-base ${danger ? 'text-red-500 font-semibold' : 'text-secondary'}`}
      >
        {label}
      </Text>
      <View className="flex-row items-center">
        {detail ? (
          <Text className="text-sm text-muted mr-2">{detail}</Text>
        ) : null}
        <Text className="text-muted text-sm">{'\u2192'}</Text>
      </View>
    </Pressable>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuthContext();
  const { mode, setMode } = useTheme();

  const providerLabel =
    user?.authProvider ? PROVIDER_LABELS[user.authProvider] ?? user.authProvider : 'Email & Password';

  function handleChangePassword() {
    Alert.alert(
      'Password Reset',
      'A password reset email has been sent to your email address.',
      [{ text: 'OK' }],
    );
  }

  function handleHelp() {
    Alert.alert('Help & FAQ', 'Help center coming soon.', [{ text: 'OK' }]);
  }

  function handleContactSupport() {
    Linking.openURL('mailto:support@balling.app');
  }

  function handlePrivacyPolicy() {
    Alert.alert('Privacy Policy', 'Privacy policy coming soon.', [{ text: 'OK' }]);
  }

  function handleTerms() {
    Alert.alert('Terms of Service', 'Terms of service coming soon.', [{ text: 'OK' }]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deletion', 'Account deletion request submitted.');
          },
        },
      ],
    );
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => void logout() },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Screen Title */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-secondary">Settings</Text>
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <SettingsRow
          label="Edit profile"
          onPress={() => navigation.navigate('EditProfile')}
        />
        <SettingsRow
          label="Change password"
          onPress={handleChangePassword}
        />
        <SettingsRow
          label="Connected accounts"
          detail={providerLabel}
          onPress={() =>
            Alert.alert('Connected Accounts', `Signed in with ${providerLabel}`)
          }
        />

        {/* Preferences */}
        <SectionHeader title="Preferences" />

        {/* Dark Mode Selector */}
        <View className="px-4 py-3.5 border-b border-border bg-white">
          <Text className="text-base text-secondary mb-2.5">Dark mode</Text>
          <View className="flex-row bg-surface rounded-lg p-1">
            {THEME_OPTIONS.map((option) => {
              const isActive = mode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMode(option.value)}
                  className={`flex-1 items-center py-2 rounded-md ${
                    isActive ? 'bg-primary' : ''
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isActive ? 'text-white' : 'text-muted'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <SettingsRow
          label="Notification preferences"
          detail="All enabled"
          onPress={() =>
            Alert.alert(
              'Notification Preferences',
              'Notification settings coming soon.',
            )
          }
        />

        {/* Support */}
        <SectionHeader title="Support" />
        <SettingsRow label="Help & FAQ" onPress={handleHelp} />
        <SettingsRow label="Contact support" onPress={handleContactSupport} />
        <SettingsRow label="Privacy policy" onPress={handlePrivacyPolicy} />
        <SettingsRow label="Terms of service" onPress={handleTerms} />

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" danger />
        <SettingsRow
          label="Delete account"
          onPress={handleDeleteAccount}
          danger
        />
        <SettingsRow label="Log out" onPress={handleLogout} danger />
      </ScrollView>
    </SafeAreaView>
  );
}
