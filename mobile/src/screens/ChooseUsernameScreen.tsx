import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '../context/AuthContext';
import * as api from '../lib/api';

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function ChooseUsernameScreen() {
  const { updateProfile } = useAuthContext();
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<AvailabilityStatus>('idle');
  const [statusReason, setStatusReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAvailability = useCallback(async (value: string) => {
    if (!USERNAME_REGEX.test(value)) {
      setStatus('invalid');
      setStatusReason(
        value.length < 3
          ? 'Too short — minimum 3 characters'
          : value.length > 20
          ? 'Too long — maximum 20 characters'
          : 'Only letters, numbers, and underscores',
      );
      return;
    }

    setStatus('checking');
    setStatusReason(null);

    try {
      const result = await api.checkUsername(value);
      if (result.available) {
        setStatus('available');
      } else {
        setStatus('taken');
        setStatusReason(result.reason ?? 'Username already taken');
      }
    } catch {
      setStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (!username) {
      setStatus('idle');
      setStatusReason(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkAvailability(username), 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, checkAvailability]);

  async function handleContinue() {
    if (status !== 'available') return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await updateProfile({ username });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  const statusInfo = (() => {
    switch (status) {
      case 'checking':
        return { color: '#64748b', text: 'Checking availability…' };
      case 'available':
        return { color: '#16a34a', text: `@${username} is available` };
      case 'taken':
        return { color: '#dc2626', text: statusReason ?? 'Username taken' };
      case 'invalid':
        return { color: '#dc2626', text: statusReason ?? 'Invalid username' };
      default:
        return null;
    }
  })();

  const canSubmit = status === 'available' && !submitting;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-4xl mb-3 text-center">🏷️</Text>
          <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50 text-center mb-2">
            Choose your username
          </Text>
          <Text className="text-base text-slate-500 dark:text-slate-400 text-center mb-8 leading-6">
            This is how other players will find you. You can change it later, but only once every 90 days.
          </Text>

          <View className="mb-2">
            <View className="flex-row items-center border border-slate-200 dark:border-slate-700 rounded-xl px-4 bg-white dark:bg-card-dark">
              <Text className="text-slate-400 text-base mr-1">@</Text>
              <TextInput
                className="flex-1 py-4 text-base text-slate-900 dark:text-slate-50"
                placeholder="your_username"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                value={username}
                onChangeText={setUsername}
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />
              {status === 'checking' && (
                <ActivityIndicator size="small" color="#64748b" />
              )}
              {status === 'available' && (
                <Text className="text-green-600 text-lg">✓</Text>
              )}
              {(status === 'taken' || status === 'invalid') && (
                <Text className="text-red-600 text-lg">✕</Text>
              )}
            </View>

            {statusInfo && (
              <Text style={{ color: statusInfo.color }} className="text-sm mt-2 ml-1">
                {statusInfo.text}
              </Text>
            )}

            {submitError && (
              <Text className="text-sm text-red-600 mt-2 ml-1">{submitError}</Text>
            )}
          </View>

          <Text className="text-xs text-slate-400 dark:text-slate-500 mb-8 ml-1">
            3–20 characters. Letters, numbers, and underscores only.
          </Text>

          <Pressable
            onPress={handleContinue}
            disabled={!canSubmit}
            className={`rounded-xl py-4 items-center ${canSubmit ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`font-semibold text-base ${canSubmit ? 'text-white' : 'text-slate-400'}`}
              >
                Continue
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
