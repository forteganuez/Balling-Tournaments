import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingCity'>;

export function OnboardingCityScreen({ navigation, route }: Props) {
  const { sports, skillLevel } = route.params;
  const [city, setCity] = useState('');

  function handleContinue() {
    navigation.navigate('OnboardingAvatar', {
      sports,
      skillLevel,
      city: city.trim() || undefined,
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-12">
          <Text className="text-2xl font-bold text-secondary text-center mb-2">
            Where are you based?
          </Text>
          <Text className="text-base text-muted text-center mb-8">
            We'll find tournaments near you
          </Text>

          <TextInput
            className="border border-border rounded-xl px-4 py-3 text-base text-secondary"
            placeholder="Enter your city"
            placeholderTextColor="#9CA3AF"
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>

        <View className="px-6 pb-8">
          <Pressable
            onPress={handleContinue}
            className="bg-primary rounded-xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-base">
              {city.trim() ? 'Continue' : 'Skip'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
