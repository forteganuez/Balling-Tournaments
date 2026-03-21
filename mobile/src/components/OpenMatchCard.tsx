import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { OpenMatch } from '../lib/types';
import { SportIcon } from './SportIcon';

interface OpenMatchCardProps {
  match: OpenMatch;
  actionLabel?: string;
  onActionPress?: () => void;
  actionDisabled?: boolean;
  statusLabel?: string;
  participantLabel?: string;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  };
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function OpenMatchCard({
  match,
  actionLabel,
  onActionPress,
  actionDisabled = false,
  statusLabel,
  participantLabel,
}: OpenMatchCardProps) {
  const { day, time } = formatDateTime(match.scheduledFor);
  const joinedLabel = participantLabel ?? (match.opponent ? `${match.opponent.name} joined` : null);

  return (
    <View className="rounded-[28px] border border-[#e6edf3] bg-white p-4 shadow-sm">
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="mb-2 flex-row items-center">
            <View className="mr-2 rounded-full bg-[#eef2f6] px-3 py-1">
              <Text className="text-xs font-semibold tracking-wide text-[#7a5c2e]">
                {match.sport}
              </Text>
            </View>
            {statusLabel ? (
              <View className="rounded-full bg-[#102a43] px-3 py-1">
                <Text className="text-[11px] font-semibold uppercase tracking-wide text-white">
                  {statusLabel}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-xl font-bold text-[#102a43]">
            {day}
          </Text>
          <Text className="mt-1 text-base text-[#486581]">
            {time} at {match.venue?.trim() ? match.venue : match.location}
          </Text>
        </View>
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#eef2f6]">
          <SportIcon sport={match.sport} size={26} />
        </View>
      </View>

      <View className="mb-4 rounded-2xl bg-white px-4 py-3">
        <Text className="text-xs uppercase tracking-[1px] text-[#9aa5b1]">
          Host
        </Text>
        <View className="mt-2 flex-row items-center">
          {match.creator.avatarUrl ? (
            <Image
              source={{ uri: match.creator.avatarUrl }}
              className="h-11 w-11 rounded-full bg-[#d9e2ec]"
            />
          ) : (
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#102a43]">
              <Text className="text-sm font-semibold text-white">
                {initials(match.creator.name)}
              </Text>
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-[#102a43]">
              {match.creator.name}
            </Text>
            <Text className="text-sm text-[#7b8794]">
              {match.location}
            </Text>
          </View>
          {joinedLabel ? (
            <View className="rounded-full bg-[#e3fcec] px-3 py-1">
              <Text className="text-xs font-semibold text-[#127a43]">
                {joinedLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {match.notes ? (
        <Text className="mb-4 text-sm leading-5 text-[#52606d]">
          {match.notes}
        </Text>
      ) : (
        <Text className="mb-4 text-sm leading-5 text-[#7b8794]">
          Casual game, open spot ready to claim.
        </Text>
      )}

      {actionLabel && onActionPress ? (
        <Pressable
          disabled={actionDisabled}
          onPress={onActionPress}
          className={`items-center rounded-2xl px-4 py-3 ${actionDisabled ? 'bg-[#9fb3c8]' : 'bg-[#102a43]'}`}
        >
          <Text className="text-base font-semibold text-white">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
