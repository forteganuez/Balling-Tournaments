import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { SocialAuthButtons } from '../components/SocialAuthButtons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginFormData) {
    setApiError(null);
    setSubmitting(true);
    try {
      await login(data.email, data.password);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top']}>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-secondary dark:text-secondary-dark text-center mb-2">
          Balling
        </Text>
        <Text className="text-muted dark:text-muted-dark text-center mb-8">
          Sign in to your account
        </Text>

        {apiError && (
          <View className="bg-red-50 dark:bg-red-500/15 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-600 dark:text-red-300 text-sm text-center">{apiError}</Text>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-sm font-medium text-secondary dark:text-secondary-dark mb-1">Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-border dark:border-border-dark rounded-lg px-4 py-3 text-base text-secondary dark:text-secondary-dark"
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.email && (
            <Text className="text-red-500 dark:text-red-300 text-xs mt-1">{errors.email.message}</Text>
          )}
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-secondary dark:text-secondary-dark mb-1">Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-border dark:border-border-dark rounded-lg px-4 py-3 text-base text-secondary dark:text-secondary-dark"
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoComplete="password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.password && (
            <Text className="text-red-500 dark:text-red-300 text-xs mt-1">{errors.password.message}</Text>
          )}
        </View>

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          className={`rounded-lg py-3.5 items-center ${submitting ? 'bg-primary/60' : 'bg-primary'}`}
        >
          <Text className="text-white font-semibold text-base">
            {submitting ? 'Signing in...' : 'Sign In'}
          </Text>
        </Pressable>

        <SocialAuthButtons />

        <Pressable
          onPress={() => navigation.navigate('Register')}
          className="mt-4 items-center"
        >
          <Text className="text-muted dark:text-muted-dark text-sm">
            Don't have an account?{' '}
            <Text className="text-primary font-semibold">Sign Up</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
