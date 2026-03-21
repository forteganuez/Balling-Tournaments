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
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <View className="border-b border-[#e6edf3] px-5 pb-4 pt-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-3xl font-bold text-[#102a43]">{title}</Text>
              <Text className="mt-2 text-base leading-6 text-[#6b7c93]">
                {subtitle ?? 'Choose from 30-minute match slots.'}
              </Text>
            </View>
            <Pressable onPress={onClose} className="rounded-full bg-[#f5f7fa] px-3 py-2">
              <Text className="font-semibold text-[#102a43]">Close</Text>
            </Pressable>
          </View>

          <View className="mt-4 rounded-3xl bg-[#f8fbff] px-4 py-4">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-[#829ab1]">
              Selected time
            </Text>
            <Text className="mt-2 text-2xl font-bold text-[#102a43]">
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
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
