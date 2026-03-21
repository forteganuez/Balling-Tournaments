import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import type { HomeStackParamList } from '../navigation/types';
import type { Sport } from '../lib/types';
import * as api from '../lib/api';
import { combineDateAndTime, formatLongDate, formatTimeLabel } from '../lib/dateUtils';

type HostMatchScreenProps = NativeStackScreenProps<HomeStackParamList, 'HostMatch'>;

const SPORTS: Sport[] = ['PADEL', 'TENNIS', 'SQUASH'];

export function HostMatchScreen({ navigation, route }: HostMatchScreenProps) {
  const { user } = useAuth();
  const [sport, setSport] = useState<Sport>(user?.preferredSport ?? 'PADEL');
  const [location, setLocation] = useState(user?.city ?? '');
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState(route.params?.scheduledDate ?? '');
  const [scheduledTime, setScheduledTime] = useState(route.params?.scheduledTime ?? '');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (route.params?.scheduledDate) {
      setScheduledDate(route.params.scheduledDate);
    }
    if (route.params?.scheduledTime) {
      setScheduledTime(route.params.scheduledTime);
    }
  }, [route.params?.scheduledDate, route.params?.scheduledTime]);

  async function handleCreate() {
    if (!location.trim()) {
      Alert.alert('Missing location', 'Add a city or club so people know where to meet.');
      return;
    }

    const scheduledFor = combineDateAndTime(scheduledDate, scheduledTime);
    if (!scheduledFor) {
      Alert.alert('Choose a schedule', 'Pick both a match date and a time slot before posting.');
      return;
    }

    if (scheduledFor.getTime() <= Date.now()) {
      Alert.alert('Pick a future time', 'Your match post needs to be scheduled in the future.');
      return;
    }

    setCreating(true);
    try {
      await api.createOpenMatch({
        sport,
        location: location.trim(),
        venue: venue.trim() || undefined,
        notes: notes.trim() || undefined,
        scheduledFor: scheduledFor.toISOString(),
      });

      navigation.navigate('HomeMain');
    } catch (err) {
      Alert.alert('Could not create match', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 36 }}>
          <View className="rounded-[32px] bg-[#102a43] px-5 py-6">
            <Text className="text-sm font-semibold uppercase tracking-[2px] text-[#d9e2ec]">
              Host a Match
            </Text>
            <Text className="mt-3 text-3xl font-bold leading-10 text-white">
              Put a match on the board with a little more presence.
            </Text>
            <Text className="mt-3 text-base leading-6 text-[#bcccdc]">
              Strong details up front so people immediately know when and where to join.
            </Text>
          </View>

          <View className="mt-6 rounded-[30px] border border-[#d9e2ec] bg-[#f8fbff] px-4 py-4">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-[#829ab1]">
              Schedule
            </Text>
            <Text className="mt-2 text-xl font-bold text-[#102a43]">
              {scheduledDate ? formatLongDate(scheduledDate) : 'No date selected'}
            </Text>
            <Text className="mt-1 text-base text-[#486581]">
              {scheduledTime ? formatTimeLabel(scheduledTime) : 'No time slot selected'}
            </Text>
            <Pressable
              onPress={() =>
                navigation.navigate('MatchSchedule', {
                  scheduledDate,
                  scheduledTime,
                })
              }
              className="mt-4 items-center rounded-2xl bg-[#102a43] px-4 py-3"
            >
              <Text className="text-base font-semibold text-white">Choose date and time</Text>
            </Pressable>
          </View>

          <View className="mt-6">
            <Text className="mb-2 text-sm font-semibold text-[#102a43]">Sport</Text>
            <View className="mb-4 flex-row">
              {SPORTS.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setSport(value)}
                  className={`mr-2 rounded-full px-4 py-2.5 ${
                    sport === value ? 'bg-[#102a43]' : 'bg-[#f5f7fa]'
                  }`}
                >
                  <Text className={`font-semibold ${sport === value ? 'text-white' : 'text-[#102a43]'}`}>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="mb-2 text-sm font-semibold text-[#102a43]">Location</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Amsterdam, Noord"
              placeholderTextColor="#9aa5b1"
              className="mb-4 rounded-2xl border border-[#d9e2ec] bg-white px-4 py-3 text-base text-[#102a43]"
            />

            <Text className="mb-2 text-sm font-semibold text-[#102a43]">Venue</Text>
            <TextInput
              value={venue}
              onChangeText={setVenue}
              placeholder="Optional club or court"
              placeholderTextColor="#9aa5b1"
              className="mb-4 rounded-2xl border border-[#d9e2ec] bg-white px-4 py-3 text-base text-[#102a43]"
            />

            <Text className="mb-2 text-sm font-semibold text-[#102a43]">Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional: level, format, or anything players should know"
              placeholderTextColor="#9aa5b1"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              className="mb-6 rounded-2xl border border-[#d9e2ec] bg-white px-4 py-3 text-base text-[#102a43]"
            />
          </View>
        </ScrollView>

        <View className="border-t border-[#e6edf3] bg-white px-5 pb-4 pt-3">
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => navigation.goBack()}
              className="flex-1 items-center rounded-2xl border border-[#d9e2ec] px-4 py-4"
            >
              <Text className="text-base font-semibold text-[#486581]">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleCreate}
              disabled={creating}
              className={`flex-1 items-center rounded-2xl px-4 py-4 ${
                creating ? 'bg-[#9fb3c8]' : 'bg-[#102a43]'
              }`}
            >
              <Text className="text-base font-semibold text-white">
                {creating ? 'Posting...' : 'Post match'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
