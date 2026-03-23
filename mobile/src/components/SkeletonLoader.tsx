import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

function usePulse() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return opacity;
}

function SkeletonBox({ className }: { className: string }) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={{ opacity }}
      className={`bg-gray-200 dark:bg-slate-700 rounded ${className}`}
    />
  );
}

export function SkeletonTournamentCard() {
  return (
    <View className="bg-white dark:bg-card-dark rounded-xl p-4 mb-3 border border-border dark:border-border-dark">
      <View className="flex-row items-center mb-3">
        <SkeletonBox className="w-10 h-10 rounded-full" />
        <View className="ml-3 flex-1">
          <SkeletonBox className="w-3/4 h-4 mb-1.5" />
          <SkeletonBox className="w-1/2 h-3" />
        </View>
      </View>
      <SkeletonBox className="w-full h-3 mb-2" />
      <SkeletonBox className="w-2/3 h-3 mb-3" />
      <View className="flex-row justify-between">
        <SkeletonBox className="w-20 h-6 rounded-full" />
        <SkeletonBox className="w-16 h-6 rounded-full" />
      </View>
    </View>
  );
}

export function SkeletonMatchCard() {
  return (
    <View className="bg-white dark:bg-card-dark rounded-[28px] border border-border dark:border-border-dark p-4 mb-3">
      <View className="flex-row items-center mb-3">
        <SkeletonBox className="w-8 h-8 rounded-full" />
        <View className="ml-3 flex-1">
          <SkeletonBox className="w-1/2 h-4 mb-1.5" />
          <SkeletonBox className="w-1/3 h-3" />
        </View>
        <SkeletonBox className="w-20 h-8 rounded-xl" />
      </View>
      <SkeletonBox className="w-3/4 h-3" />
    </View>
  );
}

export function SkeletonProfileCard() {
  return (
    <View className="items-center px-6 py-8">
      <SkeletonBox className="w-24 h-24 rounded-full mb-4" />
      <SkeletonBox className="w-40 h-6 mb-2" />
      <SkeletonBox className="w-24 h-4 mb-4" />
      <View className="flex-row gap-6">
        <View className="items-center">
          <SkeletonBox className="w-10 h-5 mb-1" />
          <SkeletonBox className="w-12 h-3" />
        </View>
        <View className="items-center">
          <SkeletonBox className="w-10 h-5 mb-1" />
          <SkeletonBox className="w-12 h-3" />
        </View>
        <View className="items-center">
          <SkeletonBox className="w-10 h-5 mb-1" />
          <SkeletonBox className="w-12 h-3" />
        </View>
      </View>
    </View>
  );
}

export function SkeletonNotificationRow() {
  return (
    <View className="flex-row items-start px-4 py-3 mb-2 mx-4 rounded-lg bg-white dark:bg-card-dark">
      <SkeletonBox className="w-8 h-8 rounded-full mr-3" />
      <View className="flex-1">
        <SkeletonBox className="w-3/4 h-4 mb-1.5" />
        <SkeletonBox className="w-full h-3 mb-1" />
        <SkeletonBox className="w-16 h-3" />
      </View>
    </View>
  );
}

export function SkeletonFriendRow() {
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-border dark:border-border-dark">
      <SkeletonBox className="w-12 h-12 rounded-full" />
      <View className="flex-1 ml-3">
        <SkeletonBox className="w-32 h-4 mb-1.5" />
        <SkeletonBox className="w-20 h-3" />
      </View>
      <SkeletonBox className="w-20 h-8 rounded-full" />
    </View>
  );
}
