import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { HomeStackParamList } from '../navigation/types';
import {
  formatDateKey,
  formatLongDate,
  formatMonthLabel,
  formatTimeLabel,
  getCalendarDays,
  getHalfHourTimeSlots,
  getTodayDateKey,
  getWeekdayLabels,
  isDateWithinRange,
  parseDateKey,
} from '../lib/dateUtils';

type MatchScheduleScreenProps = NativeStackScreenProps<HomeStackParamList, 'MatchSchedule'>;

export function MatchScheduleScreen({ navigation, route }: MatchScheduleScreenProps) {
  const initialDate = route.params?.scheduledDate ?? getTodayDateKey();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(route.params?.scheduledTime ?? '');
  const [monthDate, setMonthDate] = useState<Date>(() => {
    const parsed = parseDateKey(initialDate);
    return parsed ?? new Date();
  });

  useEffect(() => {
    const parsed = parseDateKey(selectedDate);
    if (parsed) {
      setMonthDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1, 12, 0, 0, 0));
    }
  }, [selectedDate]);

  const calendarDays = useMemo(() => getCalendarDays(monthDate), [monthDate]);
  const weekdayLabels = getWeekdayLabels();
  const timeSlots = useMemo(() => getHalfHourTimeSlots(), []);

  function goToMonth(offset: number) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0, 0));
  }

  function handleSave() {
    navigation.navigate('HostMatch', {
      scheduledDate: selectedDate,
      scheduledTime: selectedTime,
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="border-b border-[#e6edf3] px-5 pb-4 pt-2">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-3xl font-bold text-[#102a43]">Pick match schedule</Text>
            <Text className="mt-2 text-base leading-6 text-[#6b7c93]">
              Choose the date and a 30-minute slot so the host post feels definite.
            </Text>
          </View>
          <Pressable onPress={() => navigation.goBack()} className="rounded-full bg-[#f5f7fa] px-3 py-2">
            <Text className="font-semibold text-[#102a43]">Back</Text>
          </Pressable>
        </View>

        <View className="mt-4 rounded-[28px] bg-[#102a43] px-4 py-4">
          <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-[#d9e2ec]">
            Selected
          </Text>
          <Text className="mt-2 text-2xl font-bold text-white">
            {selectedDate ? formatLongDate(selectedDate) : 'Choose a date'}
          </Text>
          <Text className="mt-1 text-base text-[#d9e2ec]">
            {selectedTime ? formatTimeLabel(selectedTime) : 'Choose a time slot'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="rounded-[28px] border border-[#d9e2ec] bg-[#f8fbff] px-4 py-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable onPress={() => goToMonth(-1)} className="rounded-full bg-white px-4 py-2">
              <Text className="font-semibold text-[#102a43]">Prev</Text>
            </Pressable>
            <Text className="text-lg font-bold text-[#102a43]">{formatMonthLabel(monthDate)}</Text>
            <Pressable onPress={() => goToMonth(1)} className="rounded-full bg-white px-4 py-2">
              <Text className="font-semibold text-[#102a43]">Next</Text>
            </Pressable>
          </View>

          <View className="mb-3 flex-row">
            {weekdayLabels.map((label) => (
              <View key={label} className="flex-1 items-center">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-[#829ab1]">
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <View className="gap-2">
            {[0, 1, 2, 3, 4, 5].map((weekIndex) => (
              <View key={weekIndex} className="flex-row">
                {calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
                  const dateKey = formatDateKey(day);
                  const inCurrentMonth = day.getMonth() === monthDate.getMonth();
                  const isSelected = selectedDate === dateKey;
                  const enabled = isDateWithinRange(day, getTodayDateKey(), null);

                  return (
                    <Pressable
                      key={dateKey}
                      onPress={() => enabled && setSelectedDate(dateKey)}
                      disabled={!enabled}
                      className={`mx-1 h-12 flex-1 items-center justify-center rounded-2xl border ${
                        isSelected
                          ? 'border-[#102a43] bg-[#102a43]'
                          : 'border-transparent bg-white'
                      }`}
                    >
                      <Text
                        className={`text-base font-semibold ${
                          !inCurrentMonth || !enabled
                            ? 'text-[#cbd2d9]'
                            : isSelected
                              ? 'text-white'
                              : 'text-[#102a43]'
                        }`}
                      >
                        {day.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View className="mt-6">
          <Text className="mb-3 text-lg font-bold text-[#102a43]">Time slots</Text>
          <View className="flex-row flex-wrap justify-between">
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot;
              return (
                <Pressable
                  key={slot}
                  onPress={() => setSelectedTime(slot)}
                  className={`mb-3 w-[48%] rounded-3xl border px-4 py-4 ${
                    isSelected ? 'border-[#102a43] bg-[#102a43]' : 'border-[#d9e2ec] bg-white'
                  }`}
                >
                  <Text
                    className={`text-lg font-semibold ${
                      isSelected ? 'text-white' : 'text-[#102a43]'
                    }`}
                  >
                    {formatTimeLabel(slot)}
                  </Text>
                  <Text
                    className={`mt-1 text-sm ${
                      isSelected ? 'text-[#d9e2ec]' : 'text-[#829ab1]'
                    }`}
                  >
                    {slot}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-[#e6edf3] bg-white px-5 pb-4 pt-3">
        <Pressable
          onPress={handleSave}
          disabled={!selectedDate || !selectedTime}
          className={`items-center rounded-2xl px-4 py-4 ${
            selectedDate && selectedTime ? 'bg-[#102a43]' : 'bg-[#bcccdc]'
          }`}
        >
          <Text className="text-base font-semibold text-white">Use this schedule</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
