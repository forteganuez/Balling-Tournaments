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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="px-5 pt-6 pb-2">
      <Text className="text-xs font-semibold uppercase tracking-wider text-muted dark:text-muted-dark">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-sm text-muted dark:text-muted-dark mt-1">{subtitle}</Text>
      ) : null}
    </View>
  );
}

function SettingsCard({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <View
      className={`mx-4 rounded-2xl overflow-hidden border ${
        danger ? 'border-red-200 bg-red-50/40' : 'border-border dark:border-border-dark bg-white dark:bg-card-dark'
      }`}
    >
      {children}
    </View>
  );
}

function SettingsRow({
  label,
  detail,
  onPress,
  danger,
  isLast,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between px-4 py-4 ${
        isLast ? '' : danger ? 'border-b border-red-100' : 'border-b border-border dark:border-border-dark'
      }`}
    >
      <View className="flex-1 pr-4">
        <Text
          className={`text-base ${danger ? 'text-red-500 dark:text-red-300 font-semibold' : 'text-secondary dark:text-secondary-dark'}`}
        >
          {label}
        </Text>
        {detail ? (
          <Text className="text-sm text-muted dark:text-muted-dark mt-1">{detail}</Text>
        ) : null}
      </View>
      <View className="flex-row items-center">
        <Text className="text-muted dark:text-muted-dark text-sm">{'\u2192'}</Text>
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
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      })
    : null;

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
    Linking.openURL('mailto:support@patatbroodje.com');
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
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-4 pt-4 pb-1">
          <Text className="text-3xl font-bold text-secondary dark:text-secondary-dark">Settings</Text>
          <Text className="text-sm text-muted dark:text-muted-dark mt-1">
            Keep your account, appearance, and support preferences in one place.
          </Text>
        </View>

        <View className="mx-4 mt-4 rounded-3xl bg-secondary px-5 py-5">
          <Text className="text-white text-lg font-semibold">{user?.name ?? 'Your account'}</Text>
          <Text className="text-white/80 text-sm mt-1">{user?.email}</Text>
          <View className="flex-row flex-wrap gap-2 mt-4">
            <View className="rounded-full bg-white/10 px-3 py-1.5">
              <Text className="text-white text-xs font-medium">Signed in with {providerLabel}</Text>
            </View>
            {memberSince ? (
              <View className="rounded-full bg-white/10 px-3 py-1.5">
                <Text className="text-white text-xs font-medium">Member since {memberSince}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <SectionHeader
          title="Account"
          subtitle="Update your personal info and sign-in details."
        />
        <SettingsCard>
          <SettingsRow
            label="Edit profile"
            detail="Photo, bio, city, birth date, sports, and skill level"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <SettingsRow
            label="Change password"
            detail="Send yourself a reset link"
            onPress={handleChangePassword}
          />
          <SettingsRow
            label="Connected account"
            detail={providerLabel}
            onPress={() =>
              Alert.alert('Connected Accounts', `Signed in with ${providerLabel}`)
            }
            isLast
          />
        </SettingsCard>

        {user?.role === 'ADMIN' ? (
          <>
            <SectionHeader
              title="Admin"
              subtitle="Manage who can organize tournaments."
            />
            <SettingsCard>
              <SettingsRow
                label="Manage user roles"
                detail="Promote players into organizers or admins"
                onPress={() => navigation.navigate('AdminUsers')}
                isLast
              />
            </SettingsCard>
          </>
        ) : null}

        <SectionHeader
          title="Appearance"
          subtitle="Choose how Balling should look on your device."
        />
        <SettingsCard>
          <View className="px-4 py-4">
            <Text className="text-base text-secondary dark:text-secondary-dark mb-3">Theme</Text>
            <View className="flex-row bg-surface dark:bg-surface-dark rounded-xl p-1">
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
                      isActive ? 'text-white' : 'text-muted dark:text-muted-dark'
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
            detail="Manage your alerts"
            onPress={() => navigation.navigate('NotificationPreferences')}
            isLast
          />
        </SettingsCard>

        <SectionHeader
          title="Support"
          subtitle="Get help or review our policies."
        />
        <SettingsCard>
          <SettingsRow label="Help & FAQ" detail="Quick answers for common questions" onPress={handleHelp} />
          <SettingsRow label="Contact support" detail="support@patatbroodje.com" onPress={handleContactSupport} />
          <SettingsRow label="Privacy policy" onPress={handlePrivacyPolicy} />
          <SettingsRow label="Terms of service" onPress={handleTerms} isLast />
        </SettingsCard>

        <SectionHeader
          title="Danger Zone"
          subtitle="These actions affect your account access."
        />
        <SettingsCard danger>
          <SettingsRow
            label="Delete account"
            detail="Permanently remove your account"
            onPress={handleDeleteAccount}
            danger
          />
          <SettingsRow
            label="Log out"
            detail="Sign out on this device"
            onPress={handleLogout}
            danger
            isLast
          />
        </SettingsCard>
      </ScrollView>
    </SafeAreaView>
  );
}
