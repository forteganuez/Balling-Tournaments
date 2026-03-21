import type {
  User,
  Tournament,
  Registration,
  Match,
  MatchResult,
  Sport,
  TournamentStatus,
  ProfileUpdate,
  UserPublic,
  UserStats,
  Friendship,
  Follow,
  Notification,
  TournamentAnnouncement,
  TournamentChatMessage,
} from './types';
import { getToken, clearToken } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void): void {
  onUnauthorized = callback;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      await clearToken();
      onUnauthorized?.();
    }

    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<{ user: User; token: string }> {
  return apiFetch<{ user: User; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  name: string,
  email: string,
  password: string,
  phone?: string
): Promise<{ user: User; token: string }> {
  return apiFetch<{ user: User; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone }),
  });
}

export async function logout(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getMe(): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/api/auth/me');
}

export async function updateProfile(
  data: ProfileUpdate
): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function socialAuth(
  provider: 'google' | 'apple' | 'microsoft',
  payload: Record<string, string>
): Promise<{ user: User; token: string }> {
  return apiFetch<{ user: User; token: string }>(`/api/auth/${provider}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Tournaments ───────────────────────────────────────────────────────

export interface TournamentFilters {
  sport?: Sport;
  status?: TournamentStatus;
  search?: string;
}

export async function getTournaments(
  filters?: TournamentFilters
): Promise<Tournament[]> {
  const params = new URLSearchParams();
  if (filters?.sport) params.set('sport', filters.sport);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return apiFetch<Tournament[]>(`/api/tournaments${qs ? `?${qs}` : ''}`);
}

export async function getTournament(id: string): Promise<Tournament> {
  return apiFetch<Tournament>(`/api/tournaments/${id}`);
}

export async function joinTournament(
  id: string
): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(`/api/tournaments/${id}/join`, {
    method: 'POST',
  });
}

export async function closeRegistration(id: string): Promise<Tournament> {
  return apiFetch<Tournament>(`/api/tournaments/${id}/close-registration`, {
    method: 'POST',
  });
}

export async function cancelTournament(id: string): Promise<Tournament> {
  return apiFetch<Tournament>(`/api/tournaments/${id}/cancel`, {
    method: 'POST',
  });
}

export async function getMyTournaments(): Promise<Registration[]> {
  return apiFetch<Registration[]>('/api/tournaments/my');
}

// ── Matches ───────────────────────────────────────────────────────────

export async function submitMatchResult(
  matchId: string,
  score: string,
  winnerId: string
): Promise<Match> {
  return apiFetch<Match>(`/api/matches/${matchId}/result`, {
    method: 'PUT',
    body: JSON.stringify({ score, winnerId }),
  });
}

export async function playerSubmitResult(
  matchId: string,
  winnerId: string,
  score?: string
): Promise<MatchResult> {
  return apiFetch<MatchResult>(`/api/matches/${matchId}/submit-result`, {
    method: 'POST',
    body: JSON.stringify({ winnerId, score }),
  });
}

export async function getMatchResults(matchId: string): Promise<MatchResult[]> {
  return apiFetch<MatchResult[]>(`/api/matches/${matchId}/results`);
}

// ── Users ────────────────────────────────────────────────────────────

export async function searchUsers(q: string): Promise<UserPublic[]> {
  return apiFetch<UserPublic[]>(`/api/users/search?q=${encodeURIComponent(q)}`);
}

export async function getUserProfile(id: string): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`);
}

export async function getUserStats(id: string): Promise<UserStats> {
  return apiFetch<UserStats>(`/api/users/${id}/stats`);
}

export async function getUserTournaments(id: string): Promise<Registration[]> {
  return apiFetch<Registration[]>(`/api/users/${id}/tournaments`);
}

// ── Friends ──────────────────────────────────────────────────────────

export async function sendFriendRequest(userId: string): Promise<Friendship> {
  return apiFetch<Friendship>(`/api/friends/request/${userId}`, {
    method: 'POST',
  });
}

export async function acceptFriendRequest(userId: string): Promise<Friendship> {
  return apiFetch<Friendship>(`/api/friends/accept/${userId}`, {
    method: 'POST',
  });
}

export async function declineFriendRequest(userId: string): Promise<Friendship> {
  return apiFetch<Friendship>(`/api/friends/decline/${userId}`, {
    method: 'POST',
  });
}

export async function removeFriend(userId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/friends/${userId}`, {
    method: 'DELETE',
  });
}

export async function getFriends(): Promise<User[]> {
  return apiFetch<User[]>('/api/friends');
}

export async function getFriendRequests(): Promise<Friendship[]> {
  return apiFetch<Friendship[]>('/api/friends/requests');
}

// ── Follows ──────────────────────────────────────────────────────────

export async function followUser(userId: string): Promise<Follow> {
  return apiFetch<Follow>(`/api/follows/${userId}`, {
    method: 'POST',
  });
}

export async function unfollowUser(userId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/follows/${userId}`, {
    method: 'DELETE',
  });
}

export async function getFollowing(): Promise<Follow[]> {
  return apiFetch<Follow[]>('/api/follows/following');
}

export async function getFollowers(): Promise<Follow[]> {
  return apiFetch<Follow[]>('/api/follows/followers');
}

// ── Notifications ────────────────────────────────────────────────────

export async function getNotifications(): Promise<Notification[]> {
  return apiFetch<Notification[]>('/api/notifications');
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return apiFetch<Notification>(`/api/notifications/${id}/read`, {
    method: 'PUT',
  });
}

export async function markAllNotificationsRead(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/api/notifications/read-all', {
    method: 'PUT',
  });
}

export async function deleteNotification(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/notifications/${id}`, {
    method: 'DELETE',
  });
}

// ── Tournament Social ────────────────────────────────────────────────

export async function postAnnouncement(
  tournamentId: string,
  message: string
): Promise<TournamentAnnouncement> {
  return apiFetch<TournamentAnnouncement>(`/api/tournaments/${tournamentId}/announce`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function getAnnouncements(
  tournamentId: string
): Promise<TournamentAnnouncement[]> {
  return apiFetch<TournamentAnnouncement[]>(`/api/tournaments/${tournamentId}/announcements`);
}

export async function sendChatMessage(
  tournamentId: string,
  message: string
): Promise<TournamentChatMessage> {
  return apiFetch<TournamentChatMessage>(`/api/tournaments/${tournamentId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function getChatMessages(
  tournamentId: string
): Promise<TournamentChatMessage[]> {
  return apiFetch<TournamentChatMessage[]>(`/api/tournaments/${tournamentId}/chat`);
}

export async function inviteToTournament(
  tournamentId: string,
  userId: string
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/tournaments/${tournamentId}/invite/${userId}`, {
    method: 'POST',
  });
}

export async function createTournament(data: {
  name: string;
  sport: Sport;
  format: string;
  date: string;
  location: string;
  venue?: string;
  maxPlayers: number;
  entryFee: number;
  description?: string;
  coverImageUrl?: string;
  rules?: string;
  allowDoubles?: boolean;
  skillMin?: number;
  skillMax?: number;
  chatEnabled?: boolean;
}): Promise<Tournament> {
  return apiFetch<Tournament>('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function registerDoubles(
  tournamentId: string,
  partnerId: string
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/api/tournaments/${tournamentId}/doubles`, {
    method: 'POST',
    body: JSON.stringify({ partnerId }),
  });
}
