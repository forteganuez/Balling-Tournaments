import React from 'react';
import { View, Text, ScrollView, Pressable, FlatList } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useTournaments } from '../hooks/useTournaments';
import { TournamentCard } from '../components/TournamentCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TournamentsStackParamList } from '../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';

const steps = [
  { emoji: '🔍', title: 'Find', description: 'Browse tournaments for your sport' },
  { emoji: '✍️', title: 'Join', description: 'Register and pay securely via Stripe' },
  { emoji: '🏆', title: 'Compete', description: 'Play matches and climb the bracket' },
];

export function HomeScreen() {
  const { user } = useAuth();
  const { tournaments, loading, error } = useTournaments({ status: 'REGISTRATION_OPEN' });
  const navigation = useNavigation<NativeStackNavigationProp<TournamentsStackParamList>>();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-secondary mb-1">
          Welcome{user ? `, ${user.name}` : ''}
        </Text>
        <Text className="text-muted mb-6">Ready to compete?</Text>

        <Text className="text-lg font-semibold text-secondary mb-3">
          Open Tournaments
        </Text>

        {loading ? (
          <View className="h-40">
            <LoadingSpinner />
          </View>
        ) : error ? (
          <View className="bg-red-50 rounded-lg p-4 mb-4">
            <Text className="text-red-600 text-center">{error}</Text>
          </View>
        ) : tournaments.length === 0 ? (
          <View className="bg-surface rounded-lg p-6 mb-4 items-center">
            <Text className="text-muted text-center">
              No open tournaments right now. Check back soon!
            </Text>
          </View>
        ) : (
          <FlatList
            data={tournaments.slice(0, 5)}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="w-72 mr-3">
                <TournamentCard
                  tournament={item}
                  onPress={() => navigation.navigate('TournamentDetail', { id: item.id })}
                />
              </View>
            )}
            scrollEnabled
          />
        )}

        <Text className="text-lg font-semibold text-secondary mt-6 mb-3">
          How it Works
        </Text>

        <View className="mb-6">
          {steps.map((step, index) => (
            <View key={index} className="flex-row items-center bg-surface rounded-lg p-4 mb-2">
              <Text className="text-2xl mr-3">{step.emoji}</Text>
              <View className="flex-1">
                <Text className="text-base font-semibold text-secondary">{step.title}</Text>
                <Text className="text-sm text-muted">{step.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => navigation.navigate('TournamentList')}
          className="bg-primary rounded-lg py-3.5 items-center mb-8"
        >
          <Text className="text-white font-semibold text-base">
            Browse All Tournaments
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
