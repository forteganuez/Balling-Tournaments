import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingProgress } from '../../components/OnboardingProgress';

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
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top']}>
      <OnboardingProgress current={4} total={5} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-8">
          <Text className="text-2xl font-bold text-secondary dark:text-secondary-dark text-center mb-2">
            Where are you based?
          </Text>
          <Text className="text-base text-muted dark:text-muted-dark text-center mb-8">
            We'll find tournaments near you
          </Text>

          <TextInput
            className="border border-border dark:border-border-dark rounded-xl px-4 py-3 text-base text-secondary dark:text-secondary-dark"
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
