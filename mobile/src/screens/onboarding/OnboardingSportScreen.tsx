import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingProgress } from '../../components/OnboardingProgress';

const SPORTS = [
  { value: 'PADEL', label: 'Padel', icon: '🏓' },
  { value: 'TENNIS', label: 'Tennis', icon: '🎾' },
  { value: 'SQUASH', label: 'Squash', icon: '🏸' },
] as const;

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSport'>;

export function OnboardingSportScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggleSport(sport: string) {
    setSelected((prev) =>
      prev.includes(sport)
        ? prev.filter((s) => s !== sport)
        : [...prev, sport]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top']}>
      <OnboardingProgress current={2} total={5} onBack={() => navigation.goBack()} />
      <View className="flex-1 px-6 pt-8">
        <Text className="text-2xl font-bold text-secondary dark:text-secondary-dark text-center mb-8">
          What do you play?
        </Text>

        <View className="flex-row flex-wrap justify-center gap-3">
          {SPORTS.map((sport) => {
            const isSelected = selected.includes(sport.value);
            return (
              <Pressable
                key={sport.value}
                onPress={() => toggleSport(sport.value)}
                className={`flex-row items-center px-5 py-3 rounded-full border ${
                  isSelected
                    ? 'bg-primary border-primary'
                    : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark'
                }`}
              >
                <Text className="text-lg mr-2">{sport.icon}</Text>
                <Text
                  className={`text-base font-medium ${
                    isSelected ? 'text-white' : 'text-secondary dark:text-secondary-dark'
                  }`}
                >
                  {sport.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="px-6 pb-8">
        <Pressable
          onPress={() =>
            navigation.navigate('OnboardingSkill', { sports: selected })
          }
          disabled={selected.length === 0}
          className={`rounded-xl py-4 items-center ${
            selected.length === 0 ? 'bg-primary/40' : 'bg-primary'
          }`}
        >
          <Text className="text-white font-semibold text-base">Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
