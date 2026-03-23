import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingProgress } from '../../components/OnboardingProgress';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingWelcome'>;

export function OnboardingWelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top']}>
      <OnboardingProgress current={1} total={5} />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-7xl mb-6">🏆</Text>
        <Text className="text-3xl font-bold text-secondary dark:text-secondary-dark text-center mb-3">
          Welcome to Balling
        </Text>
        <Text className="text-base text-muted dark:text-muted-dark text-center">
          Find tournaments, compete, and connect
        </Text>
      </View>

      <View className="px-6 pb-8">
        <Pressable
          onPress={() => navigation.navigate('OnboardingSport')}
          className="bg-primary rounded-xl py-4 items-center"
        >
          <Text className="text-white font-semibold text-base">
            Let's get started
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
