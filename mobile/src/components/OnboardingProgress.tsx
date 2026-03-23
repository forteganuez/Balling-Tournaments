import React from 'react';
import { View, Pressable, Text } from 'react-native';

interface OnboardingProgressProps {
  current: number;
  total: number;
  onBack?: () => void;
}

export function OnboardingProgress({ current, total, onBack }: OnboardingProgressProps) {
  return (
    <View className="flex-row items-center px-6 pt-4 pb-2">
      {onBack ? (
        <Pressable onPress={onBack} className="mr-3 py-1">
          <Text className="text-base text-slate-500 dark:text-slate-400">{'\u2190'}</Text>
        </Pressable>
      ) : (
        <View className="w-6 mr-3" />
      )}
      <View className="flex-1 flex-row gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            className={`flex-1 h-1 rounded-full ${
              i < current ? 'bg-primary dark:bg-primary-dark' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </View>
      <Text className="ml-3 text-xs text-slate-500 dark:text-slate-400">
        {current}/{total}
      </Text>
    </View>
  );
}
