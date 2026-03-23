import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import * as api from '../lib/api';
import type {
  TournamentAnnouncement,
  TournamentChatMessage,
} from '../lib/types';

// ── Route params ────────────────────────────────────────────────────────

interface TournamentChatScreenParams {
  tournamentId: string;
  organizerId: string;
}

interface Props {
  route: { params: TournamentChatScreenParams };
}

// ── Tabs ────────────────────────────────────────────────────────────────

type Tab = 'announcements' | 'chat';

// ── Relative time helper ────────────────────────────────────────────────

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return 'just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ── Avatar ──────────────────────────────────────────────────────────────

function Avatar({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = name.charAt(0).toUpperCase() || '?';
  return (
    <View
      className="bg-primary/10 rounded-full items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Text className="text-primary font-semibold text-sm">{initial}</Text>
    </View>
  );
}

// ── Organizer badge ─────────────────────────────────────────────────────

function OrganizerBadge() {
  return (
    <View className="bg-primary/15 rounded px-1.5 py-0.5 ml-1.5">
      <Text className="text-primary text-xs font-semibold">Organizer</Text>
    </View>
  );
}

// ── Main component ──────────────────────────────────────────────────────

export function TournamentChatScreen({ route }: Props) {
  const { tournamentId, organizerId } = route.params;
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('announcements');

  // Announcements state
  const [announcements, setAnnouncements] = useState<TournamentAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<TournamentChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const chatPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOrganizer = user?.id === organizerId;

  // ── Fetch announcements ─────────────────────────────────────────────

  const fetchAnnouncements = useCallback(async () => {
    setAnnouncementsError(null);
    try {
      const data = await api.getAnnouncements(tournamentId);
      setAnnouncements(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load announcements';
      setAnnouncementsError(message);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, [tournamentId]);

  // ── Fetch chat messages ─────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    setChatError(null);
    try {
      const data = await api.getChatMessages(tournamentId);
      setMessages(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load messages';
      setChatError(message);
    } finally {
      setChatLoading(false);
    }
  }, [tournamentId]);

  // ── Initial data loading ────────────────────────────────────────────

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ── Poll chat every 10 seconds ──────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'chat') {
      chatPollingRef.current = setInterval(() => {
        void fetchMessages();
      }, 10_000);
    }

    return () => {
      if (chatPollingRef.current) {
        clearInterval(chatPollingRef.current);
        chatPollingRef.current = null;
      }
    };
  }, [activeTab, fetchMessages]);

  // ── Post announcement ───────────────────────────────────────────────

  const handlePostAnnouncement = useCallback(async () => {
    const trimmed = announcementText.trim();
    if (!trimmed || postingAnnouncement) return;

    setPostingAnnouncement(true);
    try {
      const created = await api.postAnnouncement(tournamentId, trimmed);
      setAnnouncements((prev) => [created, ...prev]);
      setAnnouncementText('');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to post announcement';
      setAnnouncementsError(message);
    } finally {
      setPostingAnnouncement(false);
    }
  }, [announcementText, postingAnnouncement, tournamentId]);

  // ── Send chat message ───────────────────────────────────────────────

  const handleSendChat = useCallback(async () => {
    const trimmed = chatText.trim();
    if (!trimmed || sendingChat) return;

    setSendingChat(true);
    try {
      const created = await api.sendChatMessage(tournamentId, trimmed);
      setMessages((prev) => [created, ...prev]);
      setChatText('');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send message';
      setChatError(message);
    } finally {
      setSendingChat(false);
    }
  }, [chatText, sendingChat, tournamentId]);

  // ── Render announcement item ────────────────────────────────────────

  const renderAnnouncementItem = useCallback(
    ({ item }: { item: TournamentAnnouncement }) => {
      const name = item.organizer?.name ?? 'Organizer';
      const avatarUrl = item.organizer?.avatarUrl ?? null;

      return (
        <View className="bg-surface dark:bg-surface-dark rounded-xl p-4 mb-3 mx-4">
          <View className="flex-row items-center mb-2">
            <Avatar name={name} avatarUrl={avatarUrl} size={32} />
            <View className="ml-2.5 flex-row items-center flex-1">
              <Text className="text-sm font-semibold text-secondary dark:text-secondary-dark">
                {name}
              </Text>
              <OrganizerBadge />
            </View>
            <Text className="text-xs text-muted dark:text-muted-dark">
              {relativeTime(item.createdAt)}
            </Text>
          </View>
          <Text className="text-sm text-secondary dark:text-secondary-dark leading-5">
            {item.message}
          </Text>
        </View>
      );
    },
    [],
  );

  // ── Render chat message item ────────────────────────────────────────

  const renderChatItem = useCallback(
    ({ item }: { item: TournamentChatMessage }) => {
      const isOwn = item.userId === user?.id;
      const isOrganizerMsg = item.userId === organizerId;
      const senderName = item.user?.name ?? 'Player';
      const avatarUrl = item.user?.avatarUrl ?? null;

      return (
        <View
          className={`flex-row mb-3 mx-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
        >
          {!isOwn && (
            <View className="mr-2 self-end">
              <Avatar name={senderName} avatarUrl={avatarUrl} size={28} />
            </View>
          )}
          <View
            className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
              isOwn ? 'bg-primary rounded-br-sm' : 'bg-surface dark:bg-surface-dark rounded-bl-sm'
            }`}
          >
            {!isOwn && (
              <View className="flex-row items-center mb-1">
                <Text
                  className={`text-xs font-semibold ${
                    isOwn ? 'text-white/80' : 'text-secondary dark:text-secondary-dark'
                  }`}
                >
                  {senderName}
                </Text>
                {isOrganizerMsg && <OrganizerBadge />}
              </View>
            )}
            <Text
              className={`text-sm leading-5 ${
                isOwn ? 'text-white' : 'text-secondary dark:text-secondary-dark'
              }`}
            >
              {item.message}
            </Text>
            <Text
              className={`text-xs mt-1 ${
                isOwn ? 'text-white/60 text-right' : 'text-muted dark:text-muted-dark'
              }`}
            >
              {relativeTime(item.createdAt)}
            </Text>
          </View>
          {isOwn && (
            <View className="ml-2 self-end">
              <Avatar name={senderName} avatarUrl={avatarUrl} size={28} />
            </View>
          )}
        </View>
      );
    },
    [user?.id, organizerId],
  );

  // ── Key extractors ──────────────────────────────────────────────────

  const announcementKeyExtractor = useCallback(
    (item: TournamentAnnouncement) => item.id,
    [],
  );

  const chatKeyExtractor = useCallback(
    (item: TournamentChatMessage) => item.id,
    [],
  );

  // ── Empty states ────────────────────────────────────────────────────

  const AnnouncementsEmpty = useCallback(() => {
    if (announcementsLoading) return null;
    return (
      <View className="flex-1 items-center justify-center px-6 pt-20">
        <Text className="text-muted dark:text-muted-dark text-center text-base">
          No announcements yet
        </Text>
        {isOrganizer && (
          <Text className="text-muted dark:text-muted-dark text-center text-sm mt-1">
            Post the first announcement below
          </Text>
        )}
      </View>
    );
  }, [announcementsLoading, isOrganizer]);

  const ChatEmpty = useCallback(() => {
    if (chatLoading) return null;
    return (
      <View className="flex-1 items-center justify-center px-6 pt-20">
        <Text className="text-muted dark:text-muted-dark text-center text-base">
          No messages yet
        </Text>
        <Text className="text-muted dark:text-muted-dark text-center text-sm mt-1">
          Start the conversation!
        </Text>
      </View>
    );
  }, [chatLoading]);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-background-dark" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Tab bar */}
        <View className="flex-row border-b border-border dark:border-border-dark">
          <Pressable
            onPress={() => setActiveTab('announcements')}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === 'announcements'
                ? 'border-primary'
                : 'border-transparent'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                activeTab === 'announcements' ? 'text-primary' : 'text-muted dark:text-muted-dark'
              }`}
            >
              Announcements
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('chat')}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === 'chat' ? 'border-primary' : 'border-transparent'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                activeTab === 'chat' ? 'text-primary' : 'text-muted dark:text-muted-dark'
              }`}
            >
              Chat
            </Text>
          </Pressable>
        </View>

        {/* ── Announcements tab ──────────────────────────────────────── */}
        {activeTab === 'announcements' && (
          <View className="flex-1">
            {announcementsLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#6C63FF" />
              </View>
            ) : announcementsError ? (
              <View className="flex-1 items-center justify-center px-6">
                <Text className="text-red-600 dark:text-red-300 text-center mb-4">
                  {announcementsError}
                </Text>
                <Pressable
                  onPress={fetchAnnouncements}
                  className="bg-primary px-6 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">Retry</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={announcements}
                renderItem={renderAnnouncementItem}
                keyExtractor={announcementKeyExtractor}
                ListEmptyComponent={AnnouncementsEmpty}
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Organizer input */}
            {isOrganizer && (
              <View className="flex-row items-end px-4 py-3 border-t border-border dark:border-border-dark bg-white dark:bg-card-dark">
                <TextInput
                  className="flex-1 bg-surface dark:bg-surface-dark rounded-xl px-4 py-2.5 text-sm text-secondary dark:text-secondary-dark mr-2 max-h-24"
                  placeholder="Post an announcement..."
                  placeholderTextColor="#6B7280"
                  value={announcementText}
                  onChangeText={setAnnouncementText}
                  multiline
                  editable={!postingAnnouncement}
                />
                <Pressable
                  onPress={handlePostAnnouncement}
                  disabled={
                    postingAnnouncement || announcementText.trim().length === 0
                  }
                  className={`rounded-xl px-5 py-2.5 items-center justify-center ${
                    postingAnnouncement || announcementText.trim().length === 0
                      ? 'bg-primary/40'
                      : 'bg-primary'
                  }`}
                >
                  {postingAnnouncement ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-semibold text-sm">
                      Send
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ── Chat tab ───────────────────────────────────────────────── */}
        {activeTab === 'chat' && (
          <View className="flex-1">
            {chatLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#6C63FF" />
              </View>
            ) : chatError ? (
              <View className="flex-1 items-center justify-center px-6">
                <Text className="text-red-600 dark:text-red-300 text-center mb-4">
                  {chatError}
                </Text>
                <Pressable
                  onPress={fetchMessages}
                  className="bg-primary px-6 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">Retry</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={messages}
                renderItem={renderChatItem}
                keyExtractor={chatKeyExtractor}
                ListEmptyComponent={ChatEmpty}
                inverted
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Chat input bar */}
            <View className="flex-row items-end px-4 py-3 border-t border-border dark:border-border-dark bg-white dark:bg-card-dark">
              <TextInput
                className="flex-1 bg-surface dark:bg-surface-dark rounded-xl px-4 py-2.5 text-sm text-secondary dark:text-secondary-dark mr-2 max-h-24"
                placeholder="Type a message..."
                placeholderTextColor="#6B7280"
                value={chatText}
                onChangeText={setChatText}
                multiline
                editable={!sendingChat}
              />
              <Pressable
                onPress={handleSendChat}
                disabled={sendingChat || chatText.trim().length === 0}
                className={`rounded-xl px-5 py-2.5 items-center justify-center ${
                  sendingChat || chatText.trim().length === 0
                    ? 'bg-primary/40'
                    : 'bg-primary'
                }`}
              >
                {sendingChat ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold text-sm">Send</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
