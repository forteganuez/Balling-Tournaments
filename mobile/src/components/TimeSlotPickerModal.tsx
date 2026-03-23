import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatTimeLabel, getHalfHourTimeSlots } from '../lib/dateUtils';

interface TimeSlotPickerModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  value?: string | null;
  onClose: () => void;
  onSelect: (value: string) => void;
}

export function TimeSlotPickerModal({
  visible,
  title,
  subtitle,
  value,
  onClose,
  onSelect,
}: TimeSlotPickerModalProps) {
  const slots = useMemo(() => getHalfHourTimeSlots(), []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white dark:bg-card-dark" edges={['top', 'bottom']}>
        <View className="border-b border-border dark:border-border-dark px-5 pb-4 pt-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-3xl font-bold text-slate-900 dark:text-slate-50">{title}</Text>
              <Text className="mt-2 text-base leading-6 text-slate-500 dark:text-slate-400">
                {subtitle ?? 'Choose from 30-minute match slots.'}
              </Text>
            </View>
            <Pressable onPress={onClose} className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-2">
              <Text className="font-semibold text-slate-900 dark:text-slate-100">Close</Text>
            </Pressable>
          </View>

          <View className="mt-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 px-4 py-4">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500">
              Selected time
            </Text>
            <Text className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
              {value ? formatTimeLabel(value) : 'No time selected'}
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="flex-row flex-wrap justify-between">
            {slots.map((slot) => {
              const isSelected = value === slot;
              return (
                <Pressable
                  key={slot}
                  onPress={() => {
                    onSelect(slot);
                    onClose();
                  }}
                  className={`mb-3 w-[48%] rounded-3xl border px-4 py-4 ${
                    isSelected
                      ? 'border-slate-900 dark:border-primary-dark bg-slate-900 dark:bg-primary-dark'
                      : 'border-border dark:border-border-dark bg-white dark:bg-card-dark'
                  }`}
                >
                  <Text
                    className={`text-lg font-semibold ${
                      isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-50'
                    }`}
                  >
                    {formatTimeLabel(slot)}
                  </Text>
                  <Text
                    className={`mt-1 text-sm ${
                      isSelected ? 'text-slate-200' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {slot}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
