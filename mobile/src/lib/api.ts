import type {
  User,
  Tournament,
  Registration,
  Match,
  Sport,
  TournamentStatus,
  ProfileUpdate,
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
