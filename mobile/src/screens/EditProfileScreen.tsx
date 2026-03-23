import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Image, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { CalendarPickerModal } from '../components/CalendarPickerModal';
import { useAuthContext } from '../context/AuthContext';
import { formatDateKey, formatLongDate, getTodayDateKey } from '../lib/dateUtils';
import { uploadImage } from '../lib/uploadImage';
import type { Sport } from '../lib/types';

const SPORTS: { value: Sport; label: string; icon: string }[] = [
  { value: 'PADEL', label: 'Padel', icon: '🏓' },
  { value: 'TENNIS', label: 'Tennis', icon: '🎾' },
  { value: 'SQUASH', label: 'Squash', icon: '🏸' },
];

const SKILL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function getSkillColor(level: number): { text: string; bg: string } {
  if (level <= 3) return { text: 'text-green-600', bg: 'bg-green-500' };
  if (level <= 6) return { text: 'text-blue-600', bg: 'bg-blue-500' };
  return { text: 'text-purple-600', bg: 'bg-purple-500' };
}

function getSkillLabel(level: number): string {
  if (level <= 3) return 'Beginner';
  if (level <= 6) return 'Intermediate';
  return 'Advanced';
}

function formatDateOfBirth(value?: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return formatDateKey(new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12,
    0,
    0,
    0,
  ));
}

export function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuthContext();

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(formatDateOfBirth(user?.dateOfBirth));
  const [skillLevel, setSkillLevel] = useState(user?.skillLevel ?? 5);
  const [sports, setSports] = useState<Sport[]>(user?.sports ?? []);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  if (!user) return null;

  function toggleSport(sport: Sport) {
    setSports((prev) =>
      prev.includes(sport)
        ? prev.filter((s) => s !== sport)
        : [...prev, sport]
    );
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    const trimmedDateOfBirth = dateOfBirth.trim();

    setSaving(true);
    try {
      let avatarUrl: string | undefined;

      if (avatarUri && user) {
        try {
          avatarUrl = await uploadImage(avatarUri, 'avatars');
        } catch (uploadError) {
          Alert.alert(
            'Upload Error',
            uploadError instanceof Error
              ? uploadError.message
              : 'Failed to upload photo. Other changes will be saved.',
          );
        }
      }

      await updateProfile({
        name: name.trim() || undefined,
        bio: bio.trim() || null,
        city: city.trim() || null,
        dateOfBirth: trimmedDateOfBirth || null,
        skillLevel,
        sports,
        ...(avatarUrl && { avatarUrl }),
      });

      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const currentAvatar = avatarUri ?? user.avatarUrl;
  const { text: skillTextColor, bg: skillBgColor } = getSkillColor(skillLevel);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View className="items-center pt-6 pb-4">
            <Pressable onPress={pickImage} className="mb-3">
              {currentAvatar ? (
                <Image
                  source={{ uri: currentAvatar }}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center">
                  <Text className="text-4xl font-bold text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={pickImage}>
              <Text className="text-primary font-medium text-sm">Change Photo</Text>
            </Pressable>
          </View>

          <View className="px-6">
            {/* Name */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-secondary dark:text-secondary-dark mb-1">Name</Text>
              <TextInput
                className="border border-border dark:border-border-dark rounded-xl px-4 py-3 text-base text-secondary dark:text-secondary-dark"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            {/* Bio */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-secondary dark:text-secondary-dark mb-1">About me</Text>
              <TextInput
                className="border border-border dark:border-border-dark rounded-xl px-4 py-3 text-base text-secondary dark:text-secondary-dark"
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
            </View>

            {/* City */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-secondary dark:text-secondary-dark mb-1">City</Text>
              <TextInput
                className="border border-border dark:border-border-dark rounded-xl px-4 py-3 text-base text-secondary dark:text-secondary-dark"
                value={city}
                onChangeText={setCity}
                placeholder="Where are you based?"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-secondary dark:text-secondary-dark mb-1">
                Date of Birth
              </Text>
              <Pressable
                onPress={() => setDatePickerVisible(true)}
                className="rounded-xl border border-border dark:border-border-dark px-4 py-3"
              >
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-muted dark:text-muted-dark">
                  Birthday
                </Text>
                <Text className="mt-1 text-base font-semibold text-secondary dark:text-secondary-dark">
                  {dateOfBirth ? formatLongDate(dateOfBirth) : 'Choose your date of birth'}
                </Text>
              </Pressable>
              <Text className="text-xs text-muted dark:text-muted-dark mt-1.5">
                Optional. Tap to open the calendar.
              </Text>
            </View>

            {/* Skill Level */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-secondary dark:text-secondary-dark mb-2">
                Skill Level
              </Text>
              <View className="items-center mb-3">
                <Text className={`text-3xl font-bold ${skillTextColor}`}>
                  {skillLevel}
                </Text>
                <Text className={`text-sm font-medium ${skillTextColor}`}>
                  {getSkillLabel(skillLevel)}
                </Text>
              </View>
              <View className="flex-row justify-between px-1">
                {SKILL_LEVELS.map((level) => {
                  const isSelected = level === skillLevel;
                  return (
                    <Pressable
                      key={level}
                      onPress={() => setSkillLevel(level)}
                      className={`w-8 h-8 rounded-full items-center justify-center ${
                        isSelected ? skillBgColor : 'bg-surface dark:bg-surface-dark'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          isSelected ? 'text-white' : 'text-muted dark:text-muted-dark'
                        }`}
                      >
                        {level}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Sports */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-secondary dark:text-secondary-dark mb-2">
                Preferred Sports
              </Text>
              <View className="flex-row gap-3">
                {SPORTS.map((s) => {
                  const isSelected = sports.includes(s.value);
                  return (
                    <Pressable
                      key={s.value}
                      onPress={() => toggleSport(s.value)}
                      className={`flex-1 items-center py-3 rounded-xl border ${
                        isSelected
                          ? 'bg-primary/10 border-primary'
                          : 'bg-white dark:bg-card-dark border-border dark:border-border-dark'
                      }`}
                    >
                      <Text className="text-2xl mb-1">{s.icon}</Text>
                      <Text
                        className={`text-xs font-medium ${
                          isSelected ? 'text-primary' : 'text-muted dark:text-muted-dark'
                        }`}
                      >
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              className={`rounded-xl py-3.5 items-center ${
                saving ? 'bg-primary/60' : 'bg-primary'
              }`}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Save Changes
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CalendarPickerModal
        visible={datePickerVisible}
        title="Pick your date of birth"
        subtitle="This stays on your profile and helps personalize your experience."
        value={dateOfBirth || null}
        maxDate={getTodayDateKey()}
        allowClear
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(date) => setDateOfBirth(date)}
        onClear={() => setDateOfBirth('')}
      />
    </SafeAreaView>
  );
}
