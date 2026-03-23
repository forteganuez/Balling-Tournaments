import React, { useEffect, useState, useCallback } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuthContext } from '../context/AuthContext';
import { CalendarPickerModal } from '../components/CalendarPickerModal';
import * as api from '../lib/api';
import { formatLongDate, getTodayDateKey } from '../lib/dateUtils';
import { uploadImage } from '../lib/uploadImage';
import type { Sport, Tournament, TournamentFormat } from '../lib/types';
import type { TournamentsStackParamList } from '../navigation/types';

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

function getDateKey(value: string): string {
  return value.slice(0, 10);
}

function isRemoteImage(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function mapTournamentToForm(tournament: Tournament): FormState {
  return {
    name: tournament.name,
    sport: tournament.sport,
    format: tournament.format,
    allowDoubles: tournament.allowDoubles ?? false,
    date: getDateKey(tournament.date),
    location: tournament.location,
    venue: tournament.venue ?? '',
    maxPlayers: tournament.maxPlayers,
    entryFeeDisplay: tournament.entryFee > 0 ? centsToEuros(tournament.entryFee) : '',
    skillMin: tournament.skillMin ?? null,
    skillMax: tournament.skillMax ?? null,
    coverImageUri: tournament.coverImageUrl ?? null,
    description: tournament.description ?? '',
    rules: tournament.rules ?? '',
    chatEnabled: tournament.chatEnabled ?? true,
  };
}

// ── Component ────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<TournamentsStackParamList, 'CreateTournament'>;

export function CreateTournamentScreen({ navigation, route }: Props) {
  const { user } = useAuthContext();
  const tournamentId = route.params?.id;
  const isEditing = Boolean(tournamentId);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    const editTournamentId = tournamentId;

    if (!editTournamentId) {
      setInitializing(false);
      return;
    }

    let isMounted = true;

    async function loadTournament() {
      setInitializing(true);
      setError(null);

      try {
        const tournament = await api.getTournament(editTournamentId!);
        if (!isMounted) {
          return;
        }
        setForm(mapTournamentToForm(tournament));
      } catch (err: unknown) {
        if (!isMounted) {
          return;
        }
        const message = err instanceof Error ? err.message : 'Failed to load tournament';
        setError(message);
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    }

    loadTournament();

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

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

  const handleSubmit = useCallback(async () => {
    if (!user) {
      setError(`You must be logged in to ${isEditing ? 'edit' : 'create'} a tournament`);
      return;
    }
    if (!form.name.trim() || !form.sport || !form.format || !form.date.trim() || !form.location.trim() || !form.maxPlayers) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let coverImageUrl: string | null | undefined;

      if (form.coverImageUri) {
        if (isRemoteImage(form.coverImageUri)) {
          coverImageUrl = form.coverImageUri;
        } else {
          setUploadingImage(true);
          coverImageUrl = await uploadImage(form.coverImageUri, 'covers');
          setUploadingImage(false);
        }
      } else if (isEditing) {
        coverImageUrl = null;
      }

      const payload = {
        name: form.name.trim(),
        sport: form.sport,
        format: form.format,
        date: form.date.trim(),
        location: form.location.trim(),
        venue: form.venue.trim() || null,
        maxPlayers: form.maxPlayers,
        entryFee: eurosToCents(form.entryFeeDisplay),
        description: form.description.trim() || null,
        coverImageUrl,
        rules: form.rules.trim() || null,
        allowDoubles: form.sport === 'TENNIS' ? form.allowDoubles : undefined,
        skillMin: form.skillMin ?? null,
        skillMax: form.skillMax ?? null,
        chatEnabled: form.chatEnabled,
      };

      if (tournamentId) {
        await api.updateTournament(tournamentId, payload);
      } else {
        await api.createTournament(payload);
      }

      Alert.alert('Success', `Tournament ${isEditing ? 'updated' : 'created'} successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : `Failed to ${isEditing ? 'update' : 'create'} tournament`;
      setError(message);
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  }, [form, isEditing, navigation, tournamentId, user]);

  const confirmDelete = useCallback(() => {
    if (!tournamentId) {
      return;
    }

    Alert.alert(
      'Delete tournament?',
      'This will permanently remove the tournament, registrations, matches, chat, and announcements.',
      [
        { text: 'Keep tournament', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            setError(null);

            try {
              await api.deleteTournament(tournamentId);
              Alert.alert('Deleted', 'Tournament deleted successfully.', [
                {
                  text: 'OK',
                  onPress: () => navigation.popToTop(),
                },
              ]);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to delete tournament';
              setError(message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [navigation, tournamentId]);

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
                    isActive || isCompleted ? 'text-white' : 'text-muted dark:text-muted-dark'
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
                isSelected ? 'bg-primary border-primary' : 'bg-white dark:bg-card-dark border-border dark:border-border-dark'
              }`}
            >
              <Text
                className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-secondary dark:text-secondary-dark'}`}
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
      <Text className="text-sm font-semibold text-secondary dark:text-secondary-dark">{text}</Text>
      {optional && <Text className="text-xs text-muted dark:text-muted-dark ml-1">(optional)</Text>}
    </View>
  );

  // ── Step 1: Basic Info ───────────────────────────────────────────

  const renderStep1 = () => (
    <View>
      <Text className="text-xl font-bold text-secondary dark:text-secondary-dark mb-1">Basic Info</Text>
      <Text className="text-sm text-muted dark:text-muted-dark mb-4">Set up the fundamentals for your tournament</Text>

      <SectionLabel text="Tournament Name" />
      <TextInput
        value={form.name}
        onChangeText={(v) => updateField('name', v)}
        placeholder="e.g. Summer Padel Open 2026"
        placeholderTextColor="#9CA3AF"
        className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3.5 text-secondary dark:text-secondary-dark text-base"
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
                isSelected ? 'bg-primary border-primary' : 'bg-white dark:bg-card-dark border-border dark:border-border-dark'
              }`}
            >
              <Text
                className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-secondary dark:text-secondary-dark'}`}
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
        <View className="flex-row items-center justify-between mt-5 bg-surface dark:bg-surface-dark rounded-xl px-4 py-3">
          <Text className="text-sm font-medium text-secondary dark:text-secondary-dark">Allow Doubles</Text>
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
      <Text className="text-xl font-bold text-secondary dark:text-secondary-dark mb-1">Date & Location</Text>
      <Text className="text-sm text-muted dark:text-muted-dark mb-4">When and where will the tournament take place?</Text>

      <SectionLabel text="Date" />
      <Pressable
        onPress={() => setDatePickerVisible(true)}
        className="rounded-2xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark px-4 py-4"
      >
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-muted dark:text-muted-dark">
          Tournament day
        </Text>
        <Text className="mt-1 text-base font-semibold text-secondary dark:text-secondary-dark">
          {form.date ? formatLongDate(form.date) : 'Choose a tournament date'}
        </Text>
      </Pressable>

      <SectionLabel text="Location" />
      <TextInput
        value={form.location}
        onChangeText={(v) => updateField('location', v)}
        placeholder="e.g. Madrid, Spain"
        placeholderTextColor="#9CA3AF"
        className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3.5 text-secondary dark:text-secondary-dark text-base"
      />

      <SectionLabel text="Venue" optional />
      <TextInput
        value={form.venue}
        onChangeText={(v) => updateField('venue', v)}
        placeholder="e.g. Club de Padel Madrid"
        placeholderTextColor="#9CA3AF"
        className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3.5 text-secondary dark:text-secondary-dark text-base"
      />
    </View>
  );

  // ── Step 3: Players & Fees ───────────────────────────────────────

  const renderStep3 = () => (
    <View>
      <Text className="text-xl font-bold text-secondary dark:text-secondary-dark mb-1">Players & Fees</Text>
      <Text className="text-sm text-muted dark:text-muted-dark mb-4">Configure capacity, pricing, and skill requirements</Text>

      <SectionLabel text="Max Players" />
      <PillSelector
        options={MAX_PLAYER_OPTIONS}
        selected={form.maxPlayers}
        onSelect={(v) => updateField('maxPlayers', v)}
        renderLabel={(v) => String(v)}
      />

      <SectionLabel text="Entry Fee" />
      <View className="flex-row items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4">
        <Text className="text-base text-muted dark:text-muted-dark mr-2">{'\u20AC'}</Text>
        <TextInput
          value={form.entryFeeDisplay}
          onChangeText={(v) => updateField('entryFeeDisplay', v)}
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
          keyboardType="decimal-pad"
          className="flex-1 py-3.5 text-secondary dark:text-secondary-dark text-base"
        />
      </View>

      <SectionLabel text="Skill Level Range" optional />
      <Text className="text-xs text-muted dark:text-muted-dark mb-2">Minimum</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {SKILL_LEVELS.map((level) => {
            const isSelected = form.skillMin === level;
            return (
              <Pressable
                key={`min-${level}`}
                onPress={() => updateField('skillMin', isSelected ? null : level)}
                className={`w-9 h-9 rounded-full items-center justify-center border ${
                  isSelected ? 'bg-primary border-primary' : 'bg-white dark:bg-card-dark border-border dark:border-border-dark'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-secondary dark:text-secondary-dark'}`}
                >
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Text className="text-xs text-muted dark:text-muted-dark mb-2 mt-3">Maximum</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {SKILL_LEVELS.map((level) => {
            const isSelected = form.skillMax === level;
            return (
              <Pressable
                key={`max-${level}`}
                onPress={() => updateField('skillMax', isSelected ? null : level)}
                className={`w-9 h-9 rounded-full items-center justify-center border ${
                  isSelected ? 'bg-primary border-primary' : 'bg-white dark:bg-card-dark border-border dark:border-border-dark'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-secondary dark:text-secondary-dark'}`}
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
      <Text className="text-xl font-bold text-secondary dark:text-secondary-dark mb-1">Details</Text>
      <Text className="text-sm text-muted dark:text-muted-dark mb-4">Add extra information and media</Text>

      <SectionLabel text="Cover Image" optional />
      <Pressable
        onPress={pickImage}
        className="bg-surface dark:bg-surface-dark border border-dashed border-border dark:border-border-dark rounded-xl h-40 items-center justify-center overflow-hidden"
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
            <Text className="text-sm text-muted dark:text-muted-dark">Tap to select a cover image</Text>
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
        className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-secondary dark:text-secondary-dark text-base min-h-[100px]"
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
        className="bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl px-4 py-3 text-secondary dark:text-secondary-dark text-base min-h-[80px]"
      />

      <View className="flex-row items-center justify-between mt-5 bg-surface dark:bg-surface-dark rounded-xl px-4 py-3">
        <View className="flex-1 mr-3">
          <Text className="text-sm font-medium text-secondary dark:text-secondary-dark">Enable Chat</Text>
          <Text className="text-xs text-muted dark:text-muted-dark">Allow participants to chat with each other</Text>
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
      <Text className="text-xl font-bold text-secondary dark:text-secondary-dark mb-1">Review</Text>
      <Text className="text-sm text-muted dark:text-muted-dark mb-4">
        Confirm your tournament details before {isEditing ? 'saving' : 'creating'}
      </Text>

        {form.coverImageUri && (
          <Image
            source={{ uri: form.coverImageUri }}
            className="w-full h-40 rounded-xl mb-4"
            resizeMode="cover"
          />
        )}

        <View className="bg-surface dark:bg-surface-dark rounded-xl p-4">
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
            <Text className="text-sm font-semibold text-secondary dark:text-secondary-dark mb-1">Description</Text>
            <Text className="text-sm text-muted dark:text-muted-dark">{form.description}</Text>
          </View>
        )}

        {form.rules.trim() !== '' && (
          <View className="mt-3">
            <Text className="text-sm font-semibold text-secondary dark:text-secondary-dark mb-1">Rules</Text>
            <Text className="text-sm text-muted dark:text-muted-dark">{form.rules}</Text>
          </View>
        )}
      </View>
    );
  };

  // ── Review row helper ────────────────────────────────────────────

  const ReviewRow = ({ label, value }: { label: string; value: string }) => (
    <View className="flex-row justify-between py-2 border-b border-border dark:border-border-dark">
      <Text className="text-sm text-muted dark:text-muted-dark">{label}</Text>
      <Text className="text-sm font-medium text-secondary dark:text-secondary-dark">{value}</Text>
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
  const isBusy = loading || deleting;
  const screenTitle = isEditing ? 'Edit Tournament' : 'Create Tournament';

  if (initializing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-background-dark">
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text className="mt-4 text-sm text-muted dark:text-muted-dark">Loading tournament details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2 border-b border-border dark:border-border-dark">
          <Pressable
            onPress={() => navigation.goBack()}
            disabled={isBusy}
            className="py-2 pr-4"
          >
            <Text className="text-primary font-medium text-base">Cancel</Text>
          </Pressable>
          <Text className="text-base font-semibold text-secondary dark:text-secondary-dark">
            {screenTitle}
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
            <View className="bg-red-50 dark:bg-red-500/15 rounded-xl p-3 mt-4">
              <Text className="text-red-600 dark:text-red-300 text-sm text-center">{error}</Text>
            </View>
          )}

          {isEditing && isLastStep && (
            <Pressable
              onPress={confirmDelete}
              disabled={isBusy}
              className={`mt-5 rounded-2xl border px-4 py-4 ${
                deleting ? 'border-red-200 bg-red-50/60' : 'border-red-200 bg-red-50 dark:bg-red-500/15'
              }`}
            >
              <Text className="text-sm font-semibold text-red-600 dark:text-red-300">
                {deleting ? 'Deleting tournament...' : 'Delete tournament'}
              </Text>
              <Text className="mt-1 text-sm leading-5 text-red-500 dark:text-red-300">
                Remove this tournament and all related registrations, matches, and chat.
              </Text>
            </Pressable>
          )}

          {/* Spacer for bottom buttons */}
          <View className="h-24" />
        </ScrollView>

        {/* Bottom navigation buttons */}
        <View className="px-4 pb-2 pt-3 border-t border-border dark:border-border-dark bg-white dark:bg-card-dark">
          {uploadingImage && (
            <View className="flex-row items-center justify-center mb-2">
              <ActivityIndicator size="small" color="#6C63FF" />
              <Text className="text-sm text-muted dark:text-muted-dark ml-2">Uploading image...</Text>
            </View>
          )}

          <View className="flex-row gap-3">
            {!isFirstStep && (
              <Pressable
                onPress={goBack}
                disabled={isBusy}
                className="flex-1 border border-border dark:border-border-dark rounded-xl py-3.5 items-center"
              >
                <Text className="text-secondary dark:text-secondary-dark font-semibold text-base">Back</Text>
              </Pressable>
            )}

            {isLastStep ? (
              <Pressable
                onPress={handleSubmit}
                disabled={isBusy}
                className={`flex-1 rounded-xl py-3.5 items-center ${
                  loading ? 'bg-primary/60' : 'bg-primary'
                }`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold text-base">
                    {isEditing ? 'Save Changes' : 'Create Tournament'}
                  </Text>
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
