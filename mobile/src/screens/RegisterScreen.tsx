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

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', phone: '' },
  });

  async function onSubmit(data: RegisterFormData) {
    setApiError(null);
    setSubmitting(true);
    try {
      await register(data.name, data.email, data.password, data.phone || undefined);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
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
        <Text className="text-3xl font-bold text-secondary text-center mb-2">
          Create Account
        </Text>
        <Text className="text-muted text-center mb-8">
          Join Balling and start competing
        </Text>

        {apiError && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Text className="text-red-600 text-sm text-center">{apiError}</Text>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-sm font-medium text-secondary mb-1">Name</Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-border rounded-lg px-4 py-3 text-base text-secondary"
                placeholder="Your name"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                autoComplete="name"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.name && (
            <Text className="text-red-500 text-xs mt-1">{errors.name.message}</Text>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-secondary mb-1">Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-border rounded-lg px-4 py-3 text-base text-secondary"
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
            <Text className="text-red-500 text-xs mt-1">{errors.email.message}</Text>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-sm font-medium text-secondary mb-1">Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-border rounded-lg px-4 py-3 text-base text-secondary"
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoComplete="password-new"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.password && (
            <Text className="text-red-500 text-xs mt-1">{errors.password.message}</Text>
          )}
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-secondary mb-1">Phone (optional)</Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-border rounded-lg px-4 py-3 text-base text-secondary"
                placeholder="+34 600 000 000"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                autoComplete="tel"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          className={`rounded-lg py-3.5 items-center ${submitting ? 'bg-primary/60' : 'bg-primary'}`}
        >
          <Text className="text-white font-semibold text-base">
            {submitting ? 'Creating account...' : 'Create Account'}
          </Text>
        </Pressable>

        <SocialAuthButtons />

        <Pressable
          onPress={() => navigation.navigate('Login')}
          className="mt-4 items-center"
        >
          <Text className="text-muted text-sm">
            Already have an account?{' '}
            <Text className="text-primary font-semibold">Sign In</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
