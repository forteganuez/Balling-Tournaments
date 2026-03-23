import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  formatDateKey,
  formatLongDate,
  formatMonthLabel,
  getCalendarDays,
  getTodayDateKey,
  getWeekdayLabels,
  isDateWithinRange,
  parseDateKey,
} from '../lib/dateUtils';

interface CalendarPickerModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  value?: string | null;
  minDate?: string | null;
  maxDate?: string | null;
  allowClear?: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  onClear?: () => void;
}

export function CalendarPickerModal({
  visible,
  title,
  subtitle,
  value,
  minDate,
  maxDate,
  allowClear = false,
  onClose,
  onConfirm,
  onClear,
}: CalendarPickerModalProps) {
  const [monthDate, setMonthDate] = useState<Date>(() => parseDateKey(value) ?? new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(value ?? null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const initial = parseDateKey(value) ?? parseDateKey(minDate) ?? new Date();
    setMonthDate(new Date(initial.getFullYear(), initial.getMonth(), 1, 12, 0, 0, 0));
    setSelectedDate(value ?? null);
  }, [visible, value, minDate]);

  const calendarDays = useMemo(() => getCalendarDays(monthDate), [monthDate]);
  const weekdayLabels = getWeekdayLabels();
  const todayKey = getTodayDateKey();
  const selectedLabel = selectedDate ? formatLongDate(selectedDate) : 'No date selected';

  function goToMonth(offset: number) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0, 0));
  }

  function handleSelect(date: Date) {
    if (!isDateWithinRange(date, minDate, maxDate)) {
      return;
    }

    setSelectedDate(formatDateKey(date));
  }

  function handleConfirm() {
    if (!selectedDate) {
      return;
    }

    onConfirm(selectedDate);
    onClose();
  }

  function handleClear() {
    onClear?.();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/25 dark:bg-black/60">
        <SafeAreaView edges={['bottom']} className="rounded-t-[32px] bg-white dark:bg-card-dark px-5 pb-6 pt-5">
          <View className="mb-5 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-2xl font-bold text-slate-900 dark:text-slate-50">{title}</Text>
              {subtitle ? (
                <Text className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{subtitle}</Text>
              ) : null}
            </View>
            <Pressable onPress={onClose} className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-2">
              <Text className="font-semibold text-slate-900 dark:text-slate-100">Close</Text>
            </Pressable>
          </View>

          <View className="mb-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 px-4 py-4">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-slate-400 dark:text-slate-500">
              Selected date
            </Text>
            <Text className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-50">
              {selectedLabel}
            </Text>
          </View>

          <View className="mb-4 flex-row items-center justify-between">
            <Pressable onPress={() => goToMonth(-1)} className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2">
              <Text className="font-semibold text-slate-900 dark:text-slate-100">Prev</Text>
            </Pressable>
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">{formatMonthLabel(monthDate)}</Text>
            <Pressable onPress={() => goToMonth(1)} className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2">
              <Text className="font-semibold text-slate-900 dark:text-slate-100">Next</Text>
            </Pressable>
          </View>

          <View className="mb-3 flex-row">
            {weekdayLabels.map((label) => (
              <View key={label} className="flex-1 items-center">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-slate-400 dark:text-slate-500">
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
                  const isToday = todayKey === dateKey;
                  const isEnabled = isDateWithinRange(day, minDate, maxDate);

                  return (
                    <Pressable
                      key={dateKey}
                      onPress={() => handleSelect(day)}
                      disabled={!isEnabled}
                      className={`mx-1 h-12 flex-1 items-center justify-center rounded-2xl border ${
                        isSelected
                          ? 'border-slate-900 dark:border-primary-dark bg-slate-900 dark:bg-primary-dark'
                          : isToday
                            ? 'border-border dark:border-border-dark bg-slate-100 dark:bg-slate-800'
                            : 'border-transparent bg-transparent'
                      }`}
                    >
                      <Text
                        className={`text-base font-semibold ${
                          !inCurrentMonth
                            ? 'text-slate-300 dark:text-slate-600'
                            : !isEnabled
                              ? 'text-slate-300 dark:text-slate-600'
                              : isSelected
                                ? 'text-white'
                                : 'text-slate-900 dark:text-slate-50'
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

          <View className="mt-6 flex-row gap-3">
            {allowClear ? (
              <Pressable
                onPress={handleClear}
                className="flex-1 items-center rounded-2xl border border-border dark:border-border-dark px-4 py-4"
              >
                <Text className="text-base font-semibold text-slate-600 dark:text-slate-300">Clear</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleConfirm}
              disabled={!selectedDate}
              className={`items-center rounded-2xl px-4 py-4 ${allowClear ? 'flex-1' : ''} ${
                selectedDate ? 'bg-slate-900 dark:bg-primary-dark' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <Text className="text-base font-semibold text-white">Use date</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
