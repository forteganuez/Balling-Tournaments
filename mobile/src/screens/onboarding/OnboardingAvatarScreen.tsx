import React, { useState } from 'react';
import { View, Text, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { useAuthContext } from '../../context/AuthContext';
import { uploadImage } from '../../lib/uploadImage';
import type { Sport } from '../../lib/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingAvatar'>;

export function OnboardingAvatarScreen({ route }: Props) {
  const { sports, skillLevel, city } = route.params;
  const { updateProfile, user } = useAuthContext();

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleComplete() {
    setSubmitting(true);
    try {
      let avatarUrl: string | undefined;

      if (avatarUri) {
        try {
          avatarUrl = await uploadImage(avatarUri, 'avatars');
        } catch (uploadError) {
          Alert.alert(
            'Upload Error',
            uploadError instanceof Error
              ? uploadError.message
              : 'Failed to upload photo. Your profile will be saved without a photo.',
          );
        }
      }

      await updateProfile({
        sports: sports as Sport[],
        skillLevel,
        city: city ?? null,
        ...(avatarUrl && { avatarUrl }),
        onboardingDone: true,
      });
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to complete setup'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 items-center px-6 pt-12">
        <Text className="text-2xl font-bold text-secondary text-center mb-8">
          Add a profile photo
        </Text>

        <Pressable onPress={pickImage} className="mb-6">
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              className="w-32 h-32 rounded-full"
            />
          ) : (
            <View className="w-32 h-32 rounded-full bg-surface border-2 border-dashed border-border items-center justify-center">
              <Text className="text-4xl mb-1">📷</Text>
              <Text className="text-xs text-muted">Tap to add</Text>
            </View>
          )}
        </Pressable>

        <Pressable onPress={pickImage}>
          <Text className="text-primary font-medium text-sm">
            {avatarUri ? 'Change photo' : 'Choose from library'}
          </Text>
        </Pressable>
      </View>

      <View className="px-6 pb-8">
        {!avatarUri && (
          <Pressable
            onPress={handleComplete}
            disabled={submitting}
            className="items-center mb-4"
          >
            <Text className="text-muted font-medium text-sm">
              Skip for now
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleComplete}
          disabled={submitting}
          className={`rounded-xl py-4 items-center ${
            submitting ? 'bg-primary/60' : 'bg-primary'
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">
              Complete Setup
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
