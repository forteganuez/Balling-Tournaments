import type {
  User,
  Tournament,
  Registration,
  Match,
  MatchResult,
  Sport,
  TournamentFormat,
  TournamentStatus,
  ProfileUpdate,
  UserPublic,
  AdminManagedUser,
  UserStats,
  Friendship,
  Follow,
  Notification,
  TournamentAnnouncement,
  TournamentChatMessage,
  OpenMatch,
  OpenMatchesFeed,
  UserSportRating,
  LeaderboardEntry,
  RatingHistoryEntry,
  CompetitiveMatch,
  MonetizationBalance,
  PaymentRecord,
} from './types';
import {
  getApiBaseCandidates,
  joinApiUrl,
  rememberWorkingApiBaseUrl,
} from './apiConfig';
import { supabase } from './supabase';

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

const DEFAULT_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string>),
    },
  };

  let networkError: unknown = null;

  for (const baseUrl of getApiBaseCandidates()) {
    let res: Response;

    try {
      res = await fetchWithTimeout(joinApiUrl(baseUrl, path), requestOptions);
    } catch (error) {
      if (__DEV__) console.warn(`API fetch failed for ${baseUrl}${path}:`, error);
      networkError = error;
      continue;
    }

    rememberWorkingApiBaseUrl(baseUrl);

    if (!res.ok) {
      if (res.status === 401) {
        await supabase.auth.signOut();
        onUnauthorized?.();
      }

      let message = res.statusText || `Request failed (${res.status})`;
      try {
        const data = await res.json();
        message = data.error || message;
      } catch {
        try {
          const text = await res.text();
          if (text.trim()) {
            message = text.trim();
          }
        } catch {
          // ignore body parse errors
        }
      }
      throw new ApiError(message, res.status);
    }

    return res.json() as Promise<T>;
  }

  if (networkError instanceof Error) {
    throw networkError;
  }

  throw new Error('Network request failed');
}

// ── Auth ──────────────────────────────────────────────────────────────

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

export async function deleteTournament(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/tournaments/${id}`, {
    method: 'DELETE',
  });
}

export async function getMyTournaments(): Promise<Registration[]> {
  return apiFetch<Registration[]>('/api/tournaments/my');
}

// ── Open Matches ──────────────────────────────────────────────────────

export interface CreateOpenMatchInput {
  sport: Sport;
  location: string;
  venue?: string;
  notes?: string;
  scheduledFor: string;
}

export async function getOpenMatchesFeed(): Promise<OpenMatchesFeed> {
  return apiFetch<OpenMatchesFeed>('/api/open-matches/feed');
}

export async function createOpenMatch(
  data: CreateOpenMatchInput
): Promise<OpenMatch> {
  return apiFetch<OpenMatch>('/api/open-matches', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function joinOpenMatch(id: string): Promise<OpenMatch> {
  return apiFetch<OpenMatch>(`/api/open-matches/${id}/join`, {
    method: 'POST',
  });
}

export async function cancelOpenMatch(id: string): Promise<OpenMatch> {
  return apiFetch<OpenMatch>(`/api/open-matches/${id}/cancel`, {
    method: 'POST',
  });
}

export async function leaveOpenMatch(id: string): Promise<OpenMatch> {
  return apiFetch<OpenMatch>(`/api/open-matches/${id}/leave`, {
    method: 'POST',
  });
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

export async function adminSearchUsers(q = ''): Promise<AdminManagedUser[]> {
  return apiFetch<AdminManagedUser[]>(`/api/users/admin/search?q=${encodeURIComponent(q)}`);
}

export async function adminUpdateUserRole(
  id: string,
  role: 'PLAYER' | 'ORGANIZER' | 'ADMIN'
): Promise<AdminManagedUser> {
  return apiFetch<AdminManagedUser>(`/api/users/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
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

export interface TournamentMutationInput {
  name: string;
  sport: Sport;
  format: TournamentFormat;
  date: string;
  location: string;
  venue?: string | null;
  maxPlayers: number;
  entryFee: number;
  description?: string | null;
  coverImageUrl?: string | null;
  rules?: string | null;
  allowDoubles?: boolean;
  skillMin?: number | null;
  skillMax?: number | null;
  chatEnabled?: boolean;
}

export async function createTournament(data: TournamentMutationInput): Promise<Tournament> {
  return apiFetch<Tournament>('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTournament(
  id: string,
  data: Partial<TournamentMutationInput>
): Promise<Tournament> {
  return apiFetch<Tournament>(`/api/tournaments/${id}`, {
    method: 'PUT',
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

// ── Payments ────────────────────────────────────────────────────────

export async function getPaymentHistory(): Promise<PaymentRecord[]> {
  return apiFetch<PaymentRecord[]>('/api/users/me/payments');
}

// ── Ranking ──────────────────────────────────────────────────────────

export async function getMyRatings(): Promise<UserSportRating[]> {
  return apiFetch<UserSportRating[]>('/api/ranking/my-ratings');
}

export async function getLeaderboard(
  sport: string,
  filter = 'global',
  limit = 20,
): Promise<{
  leaderboard: LeaderboardEntry[];
  total: number;
  myPosition: { rank: number; rating: number } | null;
}> {
  return apiFetch(`/api/ranking/leaderboard/${sport}?filter=${filter}&limit=${limit}`);
}

export async function getRatingHistory(
  sport: string,
  limit = 10,
): Promise<RatingHistoryEntry[]> {
  return apiFetch<RatingHistoryEntry[]>(
    `/api/ranking/history/${sport}?limit=${limit}`,
  );
}

// ── Social ───────────────────────────────────────────────────────────

export async function getLookingForMatch(): Promise<UserPublic[]> {
  return apiFetch<UserPublic[]>('/api/social/looking-for-match');
}

export async function blockUser(
  userId: string,
  reason?: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/social/block/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function unblockUser(
  userId: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/social/block/${userId}`, {
    method: 'DELETE',
  });
}

export async function reportUser(
  userId: string,
  reason: string,
  description?: string,
): Promise<{ message: string; id: string }> {
  return apiFetch<{ message: string; id: string }>(
    `/api/social/report/${userId}`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, description }),
    },
  );
}

export async function getHeadToHead(
  userId: string,
): Promise<{
  total: { wins: number; losses: number; matches: number };
  bySport: Record<string, { wins: number; losses: number; matches: number }>;
}> {
  return apiFetch(`/api/social/head-to-head/${userId}`);
}

export async function checkUsername(
  username: string,
): Promise<{ available: boolean; reason?: string }> {
  return apiFetch(`/api/auth/check-username/${username}`);
}

// ── Monetization ─────────────────────────────────────────────────────

export async function getMonetizationBalance(): Promise<MonetizationBalance> {
  return apiFetch<MonetizationBalance>('/api/monetization/balance');
}

export async function getPricing(): Promise<{
  matchPrice: number;
  creditPacks: Array<{
    size: number;
    price: number;
    perMatch: number;
    discount: string;
  }>;
  ballerSubscription: { price: number; period: string; includes: string[] };
}> {
  return apiFetch('/api/monetization/pricing');
}

export async function buyCredits(
  packSize: number,
): Promise<{ checkoutUrl: string; sessionId: string }> {
  return apiFetch('/api/monetization/buy-credits', {
    method: 'POST',
    body: JSON.stringify({ packSize: String(packSize) }),
  });
}

export async function subscribeBaller(): Promise<{
  checkoutUrl: string;
  sessionId: string;
}> {
  return apiFetch('/api/monetization/subscribe', { method: 'POST' });
}

export async function cancelBallerSubscription(): Promise<{
  message: string;
  periodEnd: string;
}> {
  return apiFetch('/api/monetization/cancel-subscription', {
    method: 'POST',
  });
}

// ── Competitive Matches ──────────────────────────────────────────────

export async function createCompetitiveMatch(data: {
  type: 'CASUAL' | 'COMPETITIVE';
  sport: Sport;
  format?: 'SINGLES' | 'DOUBLES';
  opponentId?: string;
}): Promise<CompetitiveMatch> {
  return apiFetch<CompetitiveMatch>('/api/competitive-matches', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function acceptCompetitiveMatch(
  matchId: string,
): Promise<CompetitiveMatch> {
  return apiFetch<CompetitiveMatch>(
    `/api/competitive-matches/${matchId}/accept`,
    { method: 'POST' },
  );
}

export async function submitCompetitiveResult(
  matchId: string,
  winnerId: string,
  score?: string,
): Promise<CompetitiveMatch> {
  return apiFetch<CompetitiveMatch>(
    `/api/competitive-matches/${matchId}/submit-result`,
    {
      method: 'POST',
      body: JSON.stringify({ winnerId, score }),
    },
  );
}

export async function getMyCompetitiveMatches(
  status?: string,
  page = 1,
): Promise<{ matches: CompetitiveMatch[]; total: number }> {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set('status', status);
  return apiFetch(`/api/competitive-matches/my?${params}`);
}
