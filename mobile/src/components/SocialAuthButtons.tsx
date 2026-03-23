import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSocialAuth } from '../hooks/useSocialAuth';

export function SocialAuthButtons() {
  const {
    handleGoogle,
    handleApple,
    handleMicrosoft,
    loading,
    error,
    appleAvailable,
  } = useSocialAuth();

  return (
    <View className="mt-6">
      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="mx-4 text-muted dark:text-muted-dark text-sm">or continue with</Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>

      {error ? (
        <View className="bg-red-50 dark:bg-red-500/15 p-3 rounded-lg mb-4">
          <Text className="text-red-600 dark:text-red-300 text-sm text-center">{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={handleGoogle}
        disabled={loading !== null}
        className="flex-row items-center justify-center border border-border dark:border-border-dark rounded-xl py-3.5 mb-3 bg-white dark:bg-card-dark"
      >
        {loading === 'google' ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <>
            <Text className="text-lg mr-3">G</Text>
            <Text className="text-base font-semibold text-gray-700">Continue with Google</Text>
          </>
        )}
      </Pressable>

      {Platform.OS === 'ios' && appleAvailable ? (
        <View className="mb-3">
          {loading === 'apple' ? (
            <View className="items-center justify-center rounded-xl py-3.5 bg-black">
              <ActivityIndicator size="small" color="#fff" />
            </View>
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={{ width: '100%', height: 50 }}
              onPress={handleApple}
            />
          )}
        </View>
      ) : null}

      <Pressable
        onPress={handleMicrosoft}
        disabled={loading !== null}
        className="flex-row items-center justify-center border border-border dark:border-border-dark rounded-xl py-3.5 mb-3 bg-white dark:bg-card-dark"
      >
        {loading === 'microsoft' ? (
          <ActivityIndicator size="small" color="#00A4EF" />
        ) : (
          <>
            <Text className="text-lg mr-3">M</Text>
            <Text className="text-base font-semibold text-gray-700">Continue with Microsoft</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
