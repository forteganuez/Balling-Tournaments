import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { updateProfile } from './api';
import type { NotificationType } from './types';

// ── Types ────────────────────────────────────────────────────────────

interface NotificationData {
  type?: NotificationType;
  tournamentId?: string;
  matchId?: string;
  userId?: string;
  notificationId?: string;
  [key: string]: unknown;
}

interface NavigationRef {
  isReady(): boolean;
  navigate(screen: string, params?: Record<string, unknown>): void;
}

// ── Foreground handler ───────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Register for push notifications ──────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
      });
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,
    });
    const token = tokenResponse.data;

    await updateProfile({ expoPushToken: token });

    return token;
  } catch {
    return null;
  }
}

// ── Navigation helpers ───────────────────────────────────────────────

const TOURNAMENT_DETAIL_TYPES: ReadonlySet<NotificationType> = new Set([
  'MATCH_READY',
  'RESULT_CONFIRMED',
  'RESULT_DISPUTED',
  'TOURNAMENT_STARTING',
  'TOURNAMENT_ANNOUNCEMENT',
  'TOURNAMENT_INVITE',
]);

const FRIENDS_TYPES: ReadonlySet<NotificationType> = new Set([
  'FRIEND_REQUEST',
  'FRIEND_ACCEPTED',
]);

function handleNotificationNavigation(
  data: NotificationData,
  navigationRef: NavigationRef,
): void {
  if (!navigationRef.isReady() || !data.type) {
    return;
  }

  if (TOURNAMENT_DETAIL_TYPES.has(data.type) && data.tournamentId) {
    navigationRef.navigate('App', {
      screen: 'Tournaments',
      params: {
        screen: 'TournamentDetail',
        params: { id: data.tournamentId },
      },
    });
    return;
  }

  if (FRIENDS_TYPES.has(data.type)) {
    navigationRef.navigate('App', {
      screen: 'Friends',
    });
    return;
  }

  if (data.type === 'FOLLOWED') {
    navigationRef.navigate('App', {
      screen: 'Profile',
      params: { screen: 'MyProfile' },
    });
  }
}

// ── Setup notification listeners ─────────────────────────────────────

export function setupNotificationListeners(
  navigationRef: NavigationRef,
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (_notification) => {
      // Foreground notification received — display is handled by the
      // notification handler set above; no additional action needed.
    },
  );

  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data =
        (response.notification.request.content.data as NotificationData) ?? {};

      try {
        handleNotificationNavigation(data, navigationRef);
      } catch {
        // Best-effort navigation — swallow errors silently
      }
    });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
