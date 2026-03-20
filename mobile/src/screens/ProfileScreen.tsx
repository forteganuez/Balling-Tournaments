import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../context/AuthContext';
import type { Sport, PlayLevel } from '../lib/types';

const LEVELS: { value: PlayLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'PRO', label: 'Pro' },
];

const SPORTS: { value: Sport; label: string; icon: string }[] = [
  { value: 'PADEL', label: 'Padel', icon: '🏓' },
  { value: 'TENNIS', label: 'Tennis', icon: '🎾' },
  { value: 'SQUASH', label: 'Squash', icon: '🏸' },
];

export function ProfileScreen() {
  const { user, updateProfile, logout } = useAuthContext();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [level, setLevel] = useState<PlayLevel | null>(user?.level ?? null);
  const [preferredSport, setPreferredSport] = useState<Sport | null>(user?.preferredSport ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
        level,
        preferredSport,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="items-center pt-8 pb-6 bg-primary/5">
          <View className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center mb-3">
            <Text className="text-3xl">
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-xl font-bold text-secondary">{user.name}</Text>
          <Text className="text-muted text-sm">{user.email}</Text>
          {user.authProvider && user.authProvider !== 'LOCAL' && (
            <View className="mt-2 bg-gray-100 rounded-full px-3 py-1">
              <Text className="text-xs text-muted">
                Signed in with {user.authProvider.charAt(0) + user.authProvider.slice(1).toLowerCase()}
              </Text>
            </View>
          )}
        </View>

        <View className="px-6 pt-6">
          {/* Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-secondary mb-1">Name</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-secondary"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
            />
          </View>

          {/* Phone */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-secondary mb-1">Phone</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-secondary"
              value={phone}
              onChangeText={setPhone}
              placeholder="+34 600 000 000"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

          {/* City */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-secondary mb-1">City</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-secondary"
              value={city}
              onChangeText={setCity}
              placeholder="Where are you based?"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Bio */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-secondary mb-1">About me</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base text-secondary"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <Text className="text-xs text-muted mt-1 text-right">{bio.length}/500</Text>
          </View>

          {/* Playing Level */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-secondary mb-2">Playing Level</Text>
            <View className="flex-row flex-wrap gap-2">
              {LEVELS.map((l) => (
                <Pressable
                  key={l.value}
                  onPress={() => setLevel(level === l.value ? null : l.value)}
                  className={`px-4 py-2 rounded-full border ${
                    level === l.value
                      ? 'bg-primary border-primary'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      level === l.value ? 'text-white' : 'text-secondary'
                    }`}
                  >
                    {l.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Preferred Sport */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-secondary mb-2">Preferred Sport</Text>
            <View className="flex-row gap-3">
              {SPORTS.map((s) => (
                <Pressable
                  key={s.value}
                  onPress={() => setPreferredSport(preferredSport === s.value ? null : s.value)}
                  className={`flex-1 items-center py-3 rounded-xl border ${
                    preferredSport === s.value
                      ? 'bg-primary/10 border-primary'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text className="text-2xl mb-1">{s.icon}</Text>
                  <Text
                    className={`text-xs font-medium ${
                      preferredSport === s.value ? 'text-primary' : 'text-muted'
                    }`}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className={`rounded-xl py-3.5 items-center mb-3 ${
              saved ? 'bg-green-500' : saving ? 'bg-primary/60' : 'bg-primary'
            }`}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {saved ? 'Saved!' : 'Save Changes'}
              </Text>
            )}
          </Pressable>

          {/* Logout */}
          <Pressable
            onPress={handleLogout}
            className="rounded-xl py-3.5 items-center border border-red-300 mb-4"
          >
            <Text className="text-red-500 font-semibold text-base">Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
