import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthContext } from '../context/AuthContext';
import { CalendarPickerModal } from '../components/CalendarPickerModal';
import { createTournament } from '../lib/api';
import { formatLongDate, getTodayDateKey } from '../lib/dateUtils';
import { uploadImage } from '../lib/uploadImage';
import type { Sport, TournamentFormat } from '../lib/types';

// ── Constants ────────────────────────────────────────────────────────

const STEPS = ['Basic Info', 'Date & Location', 'Players & Fees', 'Details', 'Review'] as const;
const TOTAL_STEPS = STEPS.length;

const SPORTS: { value: Sport; label: string; emoji: string }[] = [
  { value: 'PADEL', label: 'Padel', emoji: '\u{1F3D3}' },
  { value: 'TENNIS', label: 'Tennis', emoji: '\u{1F3BE}' },
  { value: 'SQUASH', label: 'Squash', emoji: '\u{1F3F8}' },
];

const FORMATS: { value: TournamentFormat; label: string }[] = [
  { value: 'SINGLE_ELIMINATION', label: 'Single Elimination' },
  { value: 'ROUND_ROBIN', label: 'Round Robin' },
];

const MAX_PLAYER_OPTIONS = [8, 16, 32, 64] as const;
const SKILL_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// ── Form State ───────────────────────────────────────────────────────

interface FormState {
  name: string;
  sport: Sport | null;
  format: TournamentFormat | null;
  allowDoubles: boolean;
  date: string;
  location: string;
  venue: string;
  maxPlayers: number | null;
  entryFeeDisplay: string;
  skillMin: number | null;
  skillMax: number | null;
  coverImageUri: string | null;
  description: string;
  rules: string;
  chatEnabled: boolean;
}

const INITIAL_FORM: FormState = {
  name: '',
  sport: null,
  format: null,
  allowDoubles: false,
  date: '',
  location: '',
  venue: '',
  maxPlayers: null,
  entryFeeDisplay: '',
  skillMin: null,
  skillMax: null,
  coverImageUri: null,
  description: '',
  rules: '',
  chatEnabled: true,
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function eurosToCents(euros: string): number {
  const parsed = parseFloat(euros);
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

// ── Component ────────────────────────────────────────────────────────

export function CreateTournamentScreen() {
  const navigation = useNavigation();
  const { user } = useAuthContext();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // ── Field updaters ───────────────────────────────────────────────

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    [],
  );

  // ── Step validation ──────────────────────────────────────────────

  const validateStep = useCallback((): string | null => {
    switch (step) {
      case 0:
        if (!form.name.trim()) return 'Tournament name is required';
        if (!form.sport) return 'Please select a sport';
        if (!form.format) return 'Please select a format';
        return null;
      case 1:
        if (!form.date.trim()) return 'Date is required';
        if (!form.location.trim()) return 'Location is required';
        return null;
      case 2:
        if (!form.maxPlayers) return 'Please select max players';
        if (form.skillMin !== null && form.skillMax !== null && form.skillMin > form.skillMax)
          return 'Skill min cannot exceed skill max';
        return null;
      case 3:
        return null;
      default:
        return null;
    }
  }, [step, form]);

  // ── Navigation ───────────────────────────────────────────────────

  const goNext = useCallback(() => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, [validateStep]);

  const goBack = useCallback(() => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  // ── Image picker ─────────────────────────────────────────────────

  const pickImage = useCallback(async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateField('coverImageUri', result.assets[0].uri);
    }
  }, [updateField]);

  // ── Submit ───────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!user) {
      setError('You must be logged in to create a tournament');
      return;
    }
    if (!form.name.trim() || !form.sport || !form.format || !form.date.trim() || !form.location.trim() || !form.maxPlayers) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let coverImageUrl: string | undefined;

      if (form.coverImageUri) {
        setUploadingImage(true);
        coverImageUrl = await uploadImage(form.coverImageUri, 'covers');
        setUploadingImage(false);
      }

      await createTournament({
        name: form.name.trim(),
        sport: form.sport,
        format: form.format,
        date: form.date.trim(),
        location: form.location.trim(),
        venue: form.venue.trim() || undefined,
        maxPlayers: form.maxPlayers,
        entryFee: eurosToCents(form.entryFeeDisplay),
        description: form.description.trim() || undefined,
        coverImageUrl,
        rules: form.rules.trim() || undefined,
        allowDoubles: form.sport === 'TENNIS' ? form.allowDoubles : undefined,
        skillMin: form.skillMin ?? undefined,
        skillMax: form.skillMax ?? undefined,
        chatEnabled: form.chatEnabled,
      });

      Alert.alert('Success', 'Tournament created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tournament';
      setError(message);
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  }, [form, user, navigation]);

  // ── Step Indicator ───────────────────────────────────────────────

  const renderStepIndicator = () => (
    <View className="flex-row items-center justify-center px-4 py-3">
      {STEPS.map((label, i) => {
        const isActive = i === step;
        const isCompleted = i < step;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <View
                className={`h-0.5 flex-1 mx-1 ${isCompleted ? 'bg-primary' : 'bg-gray-200'}`}
              />
            )}
            <Pressable onPress={() => i < step && setStep(i)}>
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  isActive ? 'bg-primary' : isCompleted ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive || isCompleted ? 'text-white' : 'text-muted'
                  }`}
                >
                  {isCompleted ? '\u2713' : i + 1}
                </Text>
              </View>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );

  // ── Pill selector helper ─────────────────────────────────────────

  function PillSelector<T extends string | number>({
    options,
    selected,
    onSelect,
    renderLabel,
  }: {
    options: readonly T[];
    selected: T | null;
    onSelect: (value: T) => void;
    renderLabel: (value: T) => string;
  }) {
    return (
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option === selected;
          return (
            <Pressable
              key={String(option)}
              onPress={() => onSelect(option)}
              className={`px-4 py-2.5 rounded-full border ${
                isSelected ? 'bg-primary border-primary' : 'bg-white border-gray-300'
              }`}
            >
              <Text
                className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-secondary'}`}
              >
                {renderLabel(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  // ── Section label helper ─────────────────────────────────────────

  const SectionLabel = ({ text, optional }: { text: string; optional?: boolean }) => (
    <View className="flex-row items-center mb-2 mt-4">
      <Text className="text-sm font-semibold text-secondary">{text}</Text>
      {optional && <Text className="text-xs text-muted ml-1">(optional)</Text>}
    </View>
  );

  // ── Step 1: Basic Info ───────────────────────────────────────────

  const renderStep1 = () => (
    <View>
      <Text className="text-xl font-bold text-secondary mb-1">Basic Info</Text>
      <Text className="text-sm text-muted mb-4">Set up the fundamentals for your tournament</Text>

      <SectionLabel text="Tournament Name" />
      <TextInput
        value={form.name}
        onChangeText={(v) => updateField('name', v)}
        placeholder="e.g. Summer Padel Open 2026"
        placeholderTextColor="#9CA3AF"
        className="bg-surface border border-gray-200 rounded-xl px-4 py-3.5 text-secondary text-base"
        maxLength={80}
      />

      <SectionLabel text="Sport" />
      <View className="flex-row flex-wrap gap-2">
        {SPORTS.map(({ value, label, emoji }) => {
          const isSelected = form.sport === value;
          return (
            <Pressable
              key={value}
              onPress={() => {
                updateField('sport', value);
                if (value !== 'TENNIS') {
                  updateField('allowDoubles', false);
                }
              }}
              className={`px-4 py-2.5 rounded-full border ${
                isSelected ? 'bg-primary border-primary' : 'bg-white border-gray-300'
              }`}
            >
              <Text
                className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-secondary'}`}
              >
                {emoji} {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel text="Format" />
      <PillSelector
        options={FORMATS.map((f) => f.value)}
        selected={form.format}
        onSelect={(v) => updateField('format', v)}
        renderLabel={(v) => FORMATS.find((f) => f.value === v)?.label ?? v}
      />

      {form.sport === 'TENNIS' && (
        <View className="flex-row items-center justify-between mt-5 bg-surface rounded-xl px-4 py-3">
          <Text className="text-sm font-medium text-secondary">Allow Doubles</Text>
          <Switch
            value={form.allowDoubles}
            onValueChange={(v) => updateField('allowDoubles', v)}
            trackColor={{ false: '#D1D5DB', true: '#6C63FF' }}
            thumbColor="#FFFFFF"
          />
        </View>
      )}
    </View>
  );

  // ── Step 2: Date & Location ──────────────────────────────────────

  const renderStep2 = () => (
    <View>
      <Text className="text-xl font-bold text-secondary mb-1">Date & Location</Text>
      <Text className="text-sm text-muted mb-4">When and where will the tournament take place?</Text>

      <SectionLabel text="Date" />
      <Pressable
        onPress={() => setDatePickerVisible(true)}
        className="rounded-2xl border border-gray-200 bg-surface px-4 py-4"
      >
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-muted">
          Tournament day
        </Text>
        <Text className="mt-1 text-base font-semibold text-secondary">
          {form.date ? formatLongDate(form.date) : 'Choose a tournament date'}
        </Text>
      </Pressable>

      <SectionLabel text="Location" />
      <TextInput
        value={form.location}
        onChangeText={(v) => updateField('location', v)}
        placeholder="e.g. Madrid, Spain"
        placeholderTextColor="#9CA3AF"
        className="bg-surface border border-gray-200 rounded-xl px-4 py-3.5 text-secondary text-base"
      />

      <SectionLabel text="Venue" optional />
      <TextInput
        value={form.venue}
        onChangeText={(v) => updateField('venue', v)}
        placeholder="e.g. Club de Padel Madrid"
        placeholderTextColor="#9CA3AF"
        className="bg-surface border border-gray-200 rounded-xl px-4 py-3.5 text-secondary text-base"
      />
    </View>
  );

  // ── Step 3: Players & Fees ───────────────────────────────────────

  const renderStep3 = () => (
    <View>
      <Text className="text-xl font-bold text-secondary mb-1">Players & Fees</Text>
      <Text className="text-sm text-muted mb-4">Configure capacity, pricing, and skill requirements</Text>

      <SectionLabel text="Max Players" />
      <PillSelector
        options={MAX_PLAYER_OPTIONS}
        selected={form.maxPlayers}
        onSelect={(v) => updateField('maxPlayers', v)}
        renderLabel={(v) => String(v)}
      />

      <SectionLabel text="Entry Fee" />
      <View className="flex-row items-center bg-surface border border-gray-200 rounded-xl px-4">
        <Text className="text-base text-muted mr-2">{'\u20AC'}</Text>
        <TextInput
          value={form.entryFeeDisplay}
          onChangeText={(v) => updateField('entryFeeDisplay', v)}
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
          keyboardType="decimal-pad"
          className="flex-1 py-3.5 text-secondary text-base"
        />
      </View>

      <SectionLabel text="Skill Level Range" optional />
      <Text className="text-xs text-muted mb-2">Minimum</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {SKILL_LEVELS.map((level) => {
            const isSelected = form.skillMin === level;
            return (
              <Pressable
                key={`min-${level}`}
                onPress={() => updateField('skillMin', isSelected ? null : level)}
                className={`w-9 h-9 rounded-full items-center justify-center border ${
                  isSelected ? 'bg-primary border-primary' : 'bg-white border-gray-300'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-secondary'}`}
                >
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Text className="text-xs text-muted mb-2 mt-3">Maximum</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {SKILL_LEVELS.map((level) => {
            const isSelected = form.skillMax === level;
            return (
              <Pressable
                key={`max-${level}`}
                onPress={() => updateField('skillMax', isSelected ? null : level)}
                className={`w-9 h-9 rounded-full items-center justify-center border ${
                  isSelected ? 'bg-primary border-primary' : 'bg-white border-gray-300'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-secondary'}`}
                >
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  // ── Step 4: Details ──────────────────────────────────────────────

  const renderStep4 = () => (
    <View>
      <Text className="text-xl font-bold text-secondary mb-1">Details</Text>
      <Text className="text-sm text-muted mb-4">Add extra information and media</Text>

      <SectionLabel text="Cover Image" optional />
      <Pressable
        onPress={pickImage}
        className="bg-surface border border-dashed border-gray-300 rounded-xl h-40 items-center justify-center overflow-hidden"
      >
        {form.coverImageUri ? (
          <Image
            source={{ uri: form.coverImageUri }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="items-center">
            <Text className="text-3xl mb-1">{'\u{1F4F7}'}</Text>
            <Text className="text-sm text-muted">Tap to select a cover image</Text>
          </View>
        )}
      </Pressable>
      {form.coverImageUri && (
        <Pressable onPress={() => updateField('coverImageUri', null)} className="mt-2 self-end">
          <Text className="text-sm text-accent font-medium">Remove Image</Text>
        </Pressable>
      )}

      <SectionLabel text="Description" />
      <TextInput
        value={form.description}
        onChangeText={(v) => updateField('description', v)}
        placeholder="Describe your tournament..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        className="bg-surface border border-gray-200 rounded-xl px-4 py-3 text-secondary text-base min-h-[100px]"
      />

      <SectionLabel text="Rules" optional />
      <TextInput
        value={form.rules}
        onChangeText={(v) => updateField('rules', v)}
        placeholder="Add tournament rules..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        className="bg-surface border border-gray-200 rounded-xl px-4 py-3 text-secondary text-base min-h-[80px]"
      />

      <View className="flex-row items-center justify-between mt-5 bg-surface rounded-xl px-4 py-3">
        <View className="flex-1 mr-3">
          <Text className="text-sm font-medium text-secondary">Enable Chat</Text>
          <Text className="text-xs text-muted">Allow participants to chat with each other</Text>
        </View>
        <Switch
          value={form.chatEnabled}
          onValueChange={(v) => updateField('chatEnabled', v)}
          trackColor={{ false: '#D1D5DB', true: '#6C63FF' }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );

  // ── Step 5: Review ───────────────────────────────────────────────

  const renderStep5 = () => {
    const sportEntry = SPORTS.find((s) => s.value === form.sport);
    const entryFeeCents = eurosToCents(form.entryFeeDisplay);

    return (
      <View>
        <Text className="text-xl font-bold text-secondary mb-1">Review</Text>
        <Text className="text-sm text-muted mb-4">Confirm your tournament details before creating</Text>

        {form.coverImageUri && (
          <Image
            source={{ uri: form.coverImageUri }}
            className="w-full h-40 rounded-xl mb-4"
            resizeMode="cover"
          />
        )}

        <View className="bg-surface rounded-xl p-4">
          <ReviewRow label="Name" value={form.name} />
          <ReviewRow
            label="Sport"
            value={sportEntry ? `${sportEntry.emoji} ${sportEntry.label}` : ''}
          />
          <ReviewRow label="Format" value={form.format ? formatLabel(form.format) : ''} />
          {form.sport === 'TENNIS' && (
            <ReviewRow label="Doubles" value={form.allowDoubles ? 'Yes' : 'No'} />
          )}
          <ReviewRow label="Date" value={form.date ? formatLongDate(form.date) : ''} />
          <ReviewRow label="Location" value={form.location} />
          {form.venue.trim() !== '' && <ReviewRow label="Venue" value={form.venue} />}
          <ReviewRow label="Max Players" value={form.maxPlayers ? String(form.maxPlayers) : ''} />
          <ReviewRow
            label="Entry Fee"
            value={entryFeeCents > 0 ? `\u20AC${centsToEuros(entryFeeCents)}` : 'Free'}
          />
          {form.skillMin !== null && <ReviewRow label="Skill Min" value={String(form.skillMin)} />}
          {form.skillMax !== null && <ReviewRow label="Skill Max" value={String(form.skillMax)} />}
          <ReviewRow label="Chat" value={form.chatEnabled ? 'Enabled' : 'Disabled'} />
        </View>

        {form.description.trim() !== '' && (
          <View className="mt-4">
            <Text className="text-sm font-semibold text-secondary mb-1">Description</Text>
            <Text className="text-sm text-muted">{form.description}</Text>
          </View>
        )}

        {form.rules.trim() !== '' && (
          <View className="mt-3">
            <Text className="text-sm font-semibold text-secondary mb-1">Rules</Text>
            <Text className="text-sm text-muted">{form.rules}</Text>
          </View>
        )}
      </View>
    );
  };

  // ── Review row helper ────────────────────────────────────────────

  const ReviewRow = ({ label, value }: { label: string; value: string }) => (
    <View className="flex-row justify-between py-2 border-b border-gray-100">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-sm font-medium text-secondary">{value}</Text>
    </View>
  );

  // ── Render current step ──────────────────────────────────────────

  const renderCurrentStep = () => {
    switch (step) {
      case 0:
        return renderStep1();
      case 1:
        return renderStep2();
      case 2:
        return renderStep3();
      case 3:
        return renderStep4();
      case 4:
        return renderStep5();
      default:
        return null;
    }
  };

  // ── Main render ──────────────────────────────────────────────────

  const isFirstStep = step === 0;
  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-gray-100">
          <Pressable onPress={() => navigation.goBack()} className="py-2 pr-4">
            <Text className="text-primary font-medium text-base">Cancel</Text>
          </Pressable>
          <Text className="text-base font-semibold text-secondary">
            {STEPS[step]}
          </Text>
          <View className="w-16" />
        </View>

        {/* Step indicator */}
        {renderStepIndicator()}

        {/* Step content */}
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}

          {/* Error message */}
          {error && (
            <View className="bg-red-50 rounded-xl p-3 mt-4">
              <Text className="text-red-600 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Spacer for bottom buttons */}
          <View className="h-24" />
        </ScrollView>

        {/* Bottom navigation buttons */}
        <View className="px-4 pb-2 pt-3 border-t border-gray-100 bg-white">
          {uploadingImage && (
            <View className="flex-row items-center justify-center mb-2">
              <ActivityIndicator size="small" color="#6C63FF" />
              <Text className="text-sm text-muted ml-2">Uploading image...</Text>
            </View>
          )}

          <View className="flex-row gap-3">
            {!isFirstStep && (
              <Pressable
                onPress={goBack}
                disabled={loading}
                className="flex-1 border border-gray-300 rounded-xl py-3.5 items-center"
              >
                <Text className="text-secondary font-semibold text-base">Back</Text>
              </Pressable>
            )}

            {isLastStep ? (
              <Pressable
                onPress={handleCreate}
                disabled={loading}
                className={`flex-1 rounded-xl py-3.5 items-center ${
                  loading ? 'bg-primary/60' : 'bg-primary'
                }`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold text-base">Create Tournament</Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={goNext}
                className="flex-1 bg-primary rounded-xl py-3.5 items-center"
              >
                <Text className="text-white font-semibold text-base">Next</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <CalendarPickerModal
        visible={datePickerVisible}
        title="Pick tournament date"
        subtitle="Choose the day your tournament starts."
        value={form.date}
        minDate={getTodayDateKey()}
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(date) => updateField('date', date)}
      />
    </SafeAreaView>
  );
}
