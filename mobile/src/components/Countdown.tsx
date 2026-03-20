import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';

interface CountdownProps {
  targetDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(target: string): TimeLeft | null {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <View className="items-center mx-1">
      <View className="bg-secondary rounded-lg px-3 py-2 min-w-[48px] items-center">
        <Text className="text-white text-lg font-bold">
          {String(value).padStart(2, '0')}
        </Text>
      </View>
      <Text className="text-muted text-xs mt-1">{label}</Text>
    </View>
  );
}

export function Countdown({ targetDate }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    calculateTimeLeft(targetDate)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <Text className="text-muted text-sm">Tournament has started</Text>
    );
  }

  return (
    <View className="flex-row justify-center">
      <TimeBox value={timeLeft.days} label="Days" />
      <TimeBox value={timeLeft.hours} label="Hrs" />
      <TimeBox value={timeLeft.minutes} label="Min" />
      <TimeBox value={timeLeft.seconds} label="Sec" />
    </View>
  );
}
