export type Sport = 'PADEL' | 'TENNIS' | 'SQUASH';

export type TournamentFormat =
  | 'SINGLE_ELIMINATION'
  | 'DOUBLE_ELIMINATION'
  | 'ROUND_ROBIN';

export type TournamentStatus =
  | 'REGISTRATION_OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type UserRole = 'PLAYER' | 'ORGANIZER' | 'ADMIN';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isBaller: boolean;
  matchesPlayed: number;
  wins: number;
  losses: number;
  credits: number;
  ballerExpiresAt: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  sport: Sport;
  format: TournamentFormat;
  status: TournamentStatus;
  description?: string;
  date: string;
  location: string;
  venue?: string;
  maxPlayers: number;
  entryFee: number;
  organizerId: string;
  organizer?: { id: string; name: string };
  _count?: { registrations: number };
  registrations?: Registration[];
  matches?: Match[];
  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  id: string;
  userId: string;
  tournamentId: string;
  paidAt?: string;
  user?: { id: string; name: string };
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  player1Id?: string;
  player2Id?: string;
  winnerId?: string;
  score?: string;
  scheduledAt?: string;
  completedAt?: string;
}

export interface BalanceResponse {
  credits: {
    total: number;
    packs: Array<{
      id: string;
      packSize: number;
      remaining: number;
      purchasedAt: string;
    }>;
  };
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  isBaller: boolean;
  competitiveMatchesThisMonth: number;
  nudge: {
    type: string;
    message: string;
  } | null;
}
