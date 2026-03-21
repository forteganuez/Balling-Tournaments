import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSkill'>;

function getLevelInfo(level: number): { label: string; colorClass: string; bgClass: string } {
  if (level <= 3) {
    return { label: 'Beginner', colorClass: 'text-green-600', bgClass: 'bg-green-500' };
  }
  if (level <= 6) {
    return { label: 'Intermediate', colorClass: 'text-blue-600', bgClass: 'bg-blue-500' };
  }
  return { label: 'Advanced', colorClass: 'text-purple-600', bgClass: 'bg-purple-500' };
}

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function OnboardingSkillScreen({ navigation, route }: Props) {
  const { sports } = route.params;
  const [skillLevel, setSkillLevel] = useState(5);

  const { label, colorClass, bgClass } = getLevelInfo(skillLevel);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 px-6 pt-12">
        <Text className="text-2xl font-bold text-secondary text-center mb-8">
          What's your level?
        </Text>

        <View className="items-center mb-6">
          <Text className={`text-5xl font-bold ${colorClass} mb-2`}>
            {skillLevel}
          </Text>
          <Text className={`text-lg font-semibold ${colorClass}`}>
            {label}
          </Text>
        </View>

        <View className="flex-row justify-between px-2 mb-4">
          {LEVELS.map((level) => {
            const isSelected = level === skillLevel;
            return (
              <Pressable
                key={level}
                onPress={() => setSkillLevel(level)}
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  isSelected ? bgClass : 'bg-surface'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    isSelected ? 'text-white' : 'text-muted'
                  }`}
                >
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row justify-between px-2">
          <Text className="text-xs text-green-600">Beginner</Text>
          <Text className="text-xs text-blue-600">Intermediate</Text>
          <Text className="text-xs text-purple-600">Advanced</Text>
        </View>
      </View>

      <View className="px-6 pb-8">
        <Pressable
          onPress={() =>
            navigation.navigate('OnboardingCity', {
              sports,
              skillLevel,
            })
          }
          className="bg-primary rounded-xl py-4 items-center"
        >
          <Text className="text-white font-semibold text-base">Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
