import React from 'react';
import { View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useSocialAuth } from '../hooks/useSocialAuth';

export function SocialAuthButtons() {
  const { handleGoogle, handleApple, handleMicrosoft, loading, error, clearError } = useSocialAuth();

  return (
    <View className="mt-6">
      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="mx-4 text-muted text-sm">or continue with</Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>

      {error ? (
        <View className="bg-red-50 p-3 rounded-lg mb-4">
          <Text className="text-red-600 text-sm text-center">{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={handleGoogle}
        disabled={loading !== null}
        className="flex-row items-center justify-center border border-gray-300 rounded-xl py-3.5 mb-3 bg-white"
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

      {Platform.OS === 'ios' ? (
        <Pressable
          onPress={handleApple}
          disabled={loading !== null}
          className="flex-row items-center justify-center rounded-xl py-3.5 mb-3 bg-black"
        >
          {loading === 'apple' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text className="text-lg mr-3 text-white">{'\uF8FF'}</Text>
              <Text className="text-base font-semibold text-white">Continue with Apple</Text>
            </>
          )}
        </Pressable>
      ) : null}

      <Pressable
        onPress={handleMicrosoft}
        disabled={loading !== null}
        className="flex-row items-center justify-center border border-gray-300 rounded-xl py-3.5 mb-3 bg-white"
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
