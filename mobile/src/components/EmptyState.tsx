import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-5xl mb-4">{icon}</Text>
      <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 text-center mb-2">
        {title}
      </Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400 text-center leading-5">
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="mt-5 rounded-xl bg-primary px-6 py-3"
        >
          <Text className="text-white font-semibold text-sm">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
