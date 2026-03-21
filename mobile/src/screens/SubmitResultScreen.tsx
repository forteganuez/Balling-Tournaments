import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { playerSubmitResult, getMatchResults } from '../lib/api';
import type { MatchResult } from '../lib/types';
import { colors } from '../constants/theme';

export type SubmitResultParams = {
  matchId: string;
  player1: { id: string; name: string; avatarUrl?: string | null };
  player2: { id: string; name: string; avatarUrl?: string | null };
  round?: number;
  position?: number;
};

type SubmissionState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'waiting' }
  | { kind: 'confirmed'; winnerId: string }
  | { kind: 'disputed' }
  | { kind: 'error'; message: string };

interface PlayerCardProps {
  player: { id: string; name: string; avatarUrl?: string | null };
  selected: boolean;
  confirmed: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function PlayerCard({ player, selected, confirmed, onSelect, disabled }: PlayerCardProps) {
  const initial = player.name.charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={onSelect}
      disabled={disabled}
      className={`flex-1 items-center rounded-xl p-4 border-2 ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-surface'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      {player.avatarUrl ? (
        <Image
          source={{ uri: player.avatarUrl }}
          className="w-16 h-16 rounded-full mb-3"
          accessibilityLabel={`${player.name} avatar`}
        />
      ) : (
        <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-3">
          <Text className="text-primary text-2xl font-bold">{initial}</Text>
        </View>
      )}

      <Text
        className="text-sm font-semibold text-secondary text-center"
        numberOfLines={2}
      >
        {player.name}
      </Text>

      {selected && !confirmed && (
        <View className="mt-2 w-6 h-6 rounded-full bg-primary items-center justify-center">
          <Text className="text-white text-xs font-bold">✓</Text>
        </View>
      )}

      {confirmed && (
        <View className="mt-2 w-6 h-6 rounded-full bg-green-500 items-center justify-center">
          <Text className="text-white text-xs font-bold">✓</Text>
        </View>
      )}
    </Pressable>
  );
}

interface SubmitResultScreenProps {
  route: {
    params: SubmitResultParams;
  };
}

export function SubmitResultScreen({ route }: SubmitResultScreenProps) {
  const { matchId, player1, player2, round, position } = route.params;
  const { user } = useAuth();
  const navigation = useNavigation();

  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [score, setScore] = useState('');
  const [state, setState] = useState<SubmissionState>({ kind: 'idle' });

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const evaluateResults = useCallback(
    (results: MatchResult[]) => {
      if (!user) return;

      const myResult = results.find((r) => r.submittedBy === user.id);
      const opponentResult = results.find((r) => r.submittedBy !== user.id);

      if (!myResult) return;

      if (!opponentResult) {
        setState({ kind: 'waiting' });
        return;
      }

      if (myResult.winnerId === opponentResult.winnerId) {
        stopPolling();
        setState({ kind: 'confirmed', winnerId: myResult.winnerId });
      } else {
        stopPolling();
        setState({ kind: 'disputed' });
      }
    },
    [user, stopPolling],
  );

  const pollResults = useCallback(async () => {
    try {
      const results = await getMatchResults(matchId);
      evaluateResults(results);
    } catch {
      // Silently retry on next poll interval
    }
  }, [matchId, evaluateResults]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollIntervalRef.current = setInterval(() => {
      void pollResults();
    }, 5000);
  }, [stopPolling, pollResults]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const handleSubmit = useCallback(async () => {
    if (!selectedWinnerId || !user) return;

    setState({ kind: 'submitting' });

    try {
      await playerSubmitResult(
        matchId,
        selectedWinnerId,
        score.trim() || undefined,
      );

      setState({ kind: 'waiting' });

      // Check results immediately, then start polling
      try {
        const results = await getMatchResults(matchId);
        evaluateResults(results);

        // If still waiting after immediate check, start polling
        setState((current) => {
          if (current.kind === 'waiting') {
            startPolling();
          }
          return current;
        });
      } catch {
        startPolling();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit result';
      setState({ kind: 'error', message });
    }
  }, [selectedWinnerId, user, matchId, score, evaluateResults, startPolling]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const headerText =
    round != null && position != null
      ? `Round ${round}, Match ${position}`
      : 'Submit Match Result';

  const isPostSubmission =
    state.kind === 'waiting' ||
    state.kind === 'confirmed' ||
    state.kind === 'disputed';

  const confirmedWinnerId =
    state.kind === 'confirmed' ? state.winnerId : null;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <Pressable
            onPress={handleGoBack}
            className="w-10 h-10 items-center justify-center rounded-full bg-surface mr-3"
          >
            <Text className="text-secondary text-lg font-bold">←</Text>
          </Pressable>
          <Text className="text-xl font-bold text-secondary flex-1">
            {headerText}
          </Text>
        </View>

        {/* Who won? heading */}
        <Text className="text-lg font-semibold text-secondary text-center mb-4">
          Who won?
        </Text>

        {/* Player cards */}
        <View className="flex-row gap-3 mb-6">
          <PlayerCard
            player={player1}
            selected={selectedWinnerId === player1.id}
            confirmed={confirmedWinnerId === player1.id}
            onSelect={() => setSelectedWinnerId(player1.id)}
            disabled={isPostSubmission || state.kind === 'submitting'}
          />
          <View className="w-4 items-center justify-center">
            <Text className="text-muted font-bold text-base">vs</Text>
          </View>
          <PlayerCard
            player={player2}
            selected={selectedWinnerId === player2.id}
            confirmed={confirmedWinnerId === player2.id}
            onSelect={() => setSelectedWinnerId(player2.id)}
            disabled={isPostSubmission || state.kind === 'submitting'}
          />
        </View>

        {/* Score input */}
        {!isPostSubmission && (
          <View className="mb-6">
            <Text className="text-sm font-medium text-secondary mb-2">
              Score (optional)
            </Text>
            <TextInput
              value={score}
              onChangeText={setScore}
              placeholder="e.g. 6-4, 7-5"
              placeholderTextColor={colors.muted}
              editable={state.kind !== 'submitting'}
              className="border border-border rounded-lg px-4 py-3 text-secondary text-base bg-surface"
            />
          </View>
        )}

        {/* Submit button */}
        {state.kind === 'idle' && (
          <Pressable
            onPress={handleSubmit}
            disabled={!selectedWinnerId}
            className={`rounded-lg py-3.5 items-center ${
              selectedWinnerId ? 'bg-primary' : 'bg-primary/40'
            }`}
          >
            <Text className="text-white font-semibold text-base">
              Submit Result
            </Text>
          </Pressable>
        )}

        {/* Submitting state */}
        {state.kind === 'submitting' && (
          <View className="rounded-lg py-3.5 items-center bg-primary/60">
            <ActivityIndicator size="small" color={colors.white} />
          </View>
        )}

        {/* Error state */}
        {state.kind === 'error' && (
          <View className="mb-4">
            <View className="bg-red-50 rounded-lg p-4 mb-3">
              <Text className="text-red-600 text-center">{state.message}</Text>
            </View>
            <Pressable
              onPress={handleSubmit}
              disabled={!selectedWinnerId}
              className={`rounded-lg py-3.5 items-center ${
                selectedWinnerId ? 'bg-primary' : 'bg-primary/40'
              }`}
            >
              <Text className="text-white font-semibold text-base">
                Retry
              </Text>
            </Pressable>
          </View>
        )}

        {/* Waiting for opponent */}
        {state.kind === 'waiting' && (
          <View className="bg-surface rounded-xl p-6 items-center">
            <ActivityIndicator
              size="large"
              color={colors.primary}
              className="mb-3"
            />
            <Text className="text-base font-semibold text-secondary text-center mb-1">
              Waiting for opponent to confirm
            </Text>
            <Text className="text-sm text-muted text-center">
              We'll update automatically when they submit their result.
            </Text>
          </View>
        )}

        {/* Confirmed state */}
        {state.kind === 'confirmed' && (
          <View className="bg-green-50 rounded-xl p-6 items-center">
            <View className="w-14 h-14 rounded-full bg-green-500 items-center justify-center mb-3">
              <Text className="text-white text-2xl font-bold">✓</Text>
            </View>
            <Text className="text-base font-semibold text-green-700 text-center mb-1">
              Result Confirmed
            </Text>
            <Text className="text-sm text-green-600 text-center mb-4">
              Both players agreed on the result.
            </Text>
            <Pressable
              onPress={handleGoBack}
              className="bg-green-500 rounded-lg px-8 py-3 items-center"
            >
              <Text className="text-white font-semibold text-base">Done</Text>
            </Pressable>
          </View>
        )}

        {/* Disputed state */}
        {state.kind === 'disputed' && (
          <View className="bg-orange-50 rounded-xl p-6 items-center">
            <View className="w-14 h-14 rounded-full bg-orange-400 items-center justify-center mb-3">
              <Text className="text-white text-2xl font-bold">!</Text>
            </View>
            <Text className="text-base font-semibold text-orange-700 text-center mb-1">
              Result Disputed
            </Text>
            <Text className="text-sm text-orange-600 text-center mb-4">
              Players selected different winners — the organizer will review.
            </Text>
            <Pressable
              onPress={handleGoBack}
              className="bg-orange-400 rounded-lg px-8 py-3 items-center"
            >
              <Text className="text-white font-semibold text-base">
                Go Back
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
