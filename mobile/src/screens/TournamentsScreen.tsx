import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, RefreshControl } from 'react-native';
import { useTournaments } from '../hooks/useTournaments';
import { TournamentCard } from '../components/TournamentCard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TournamentsStackParamList } from '../navigation/types';
import type { Sport, TournamentStatus } from '../lib/types';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<TournamentsStackParamList, 'TournamentList'>;

const sports: Array<{ label: string; value: Sport | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Padel', value: 'PADEL' },
  { label: 'Tennis', value: 'TENNIS' },
  { label: 'Squash', value: 'SQUASH' },
];

const statuses: Array<{ label: string; value: TournamentStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'REGISTRATION_OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
];

function SkeletonCard() {
  return (
    <View className="bg-surface rounded-xl p-4 mb-3 border border-border">
      <View className="flex-row items-center mb-3">
        <View className="w-8 h-8 bg-gray-200 rounded-full" />
        <View className="ml-3 flex-1">
          <View className="w-3/4 h-4 bg-gray-200 rounded mb-1" />
          <View className="w-1/2 h-3 bg-gray-200 rounded" />
        </View>
      </View>
      <View className="w-full h-3 bg-gray-200 rounded mb-2" />
      <View className="w-2/3 h-2 bg-gray-200 rounded" />
    </View>
  );
}

export function TournamentsScreen({ navigation }: Props) {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSport, setSelectedSport] = useState<Sport | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<TournamentStatus | undefined>();

  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(text), 300);
  }, []);

  const filters = useMemo(() => ({
    sport: selectedSport,
    status: selectedStatus,
    search: debouncedSearch || undefined,
  }), [selectedSport, selectedStatus, debouncedSearch]);

  const { tournaments, loading, error, refetch } = useTournaments(filters);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={[]}>
      <View className="px-4 pt-3">
        <TextInput
          className="border border-border rounded-lg px-4 py-2.5 text-base text-secondary mb-3"
          placeholder="Search tournaments..."
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
        />

        <FlatList
          data={sports}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.label}
          className="mb-2"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedSport(item.value)}
              className={`px-4 py-1.5 rounded-full mr-2 ${
                selectedSport === item.value ? 'bg-primary' : 'bg-surface'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedSport === item.value ? 'text-white' : 'text-muted'
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />

        <FlatList
          data={statuses}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.label}
          className="mb-3"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedStatus(item.value)}
              className={`px-4 py-1.5 rounded-full mr-2 ${
                selectedStatus === item.value ? 'bg-primary' : 'bg-surface'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedStatus === item.value ? 'text-white' : 'text-muted'
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {loading && tournaments.length === 0 ? (
        <View className="px-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-red-600 text-center mb-4">{error}</Text>
          <Pressable onPress={refetch} className="bg-primary px-6 py-2 rounded-lg">
            <Text className="text-white font-medium">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 16,
          }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <TournamentCard
              tournament={item}
              onPress={() => navigation.navigate('TournamentDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <Text className="text-muted text-center">
                No tournaments found. Try adjusting your filters.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
