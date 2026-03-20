import React from 'react';
import { Text } from 'react-native';
import type { Sport } from '../lib/types';

const sportEmojis: Record<Sport, string> = {
  PADEL: '🏓',
  TENNIS: '🎾',
  SQUASH: '🏸',
};

interface SportIconProps {
  sport: Sport;
  size?: number;
}

export function SportIcon({ sport, size = 24 }: SportIconProps) {
  return (
    <Text style={{ fontSize: size }}>
      {sportEmojis[sport]}
    </Text>
  );
}
