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

export type AuthProvider = 'LOCAL' | 'GOOGLE' | 'APPLE' | 'MICROSOFT';

export type PlayLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';

export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';
export type OpenMatchStatus = 'OPEN' | 'BOOKED' | 'CANCELLED';
export type MatchType = 'CASUAL' | 'COMPETITIVE';
export type CompetitiveMatchStatus = 'CREATED' | 'AWAITING_OPPONENT' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED';
export type PaymentMethod = 'CREDIT' | 'INDIVIDUAL' | 'BALLER_SUBSCRIPTION' | 'NONE';

export type NotificationType =
  | 'MATCH_READY'
  | 'RESULT_CONFIRMED'
  | 'RESULT_DISPUTED'
  | 'TOURNAMENT_STARTING'
  | 'TOURNAMENT_ANNOUNCEMENT'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'FOLLOWED'
  | 'TOURNAMENT_INVITE'
  | 'SPOTS_FILLING'
  | 'NEW_TOURNAMENT';

export interface User {
  id: string;
  username?: string | null;
  displayName?: string | null;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  location?: string | null;
  dateOfBirth?: string | null;
  level?: PlayLevel | null;
  preferredSport?: Sport | null;
  skillLevel?: number | null;
  sports?: Sport[];
  wins?: number;
  losses?: number;
  matchesPlayed?: number;
  authProvider?: AuthProvider;
  onboardingDone?: boolean;
  expoPushToken?: string | null;
  isBaller?: boolean;
  lookingForMatch?: boolean;
  lookingForMatchSport?: Sport | null;
  lastActiveAt?: string;
  profileVisible?: boolean;
  showRating?: boolean;
  showMatchHistory?: boolean;
  createdAt?: string;
}

export interface ProfileUpdate {
  name?: string;
  username?: string;
  displayName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  location?: string | null;
  dateOfBirth?: string | null;
  level?: PlayLevel | null;
  preferredSport?: Sport | null;
  skillLevel?: number | null;
  sports?: Sport[];
  onboardingDone?: boolean;
  expoPushToken?: string | null;
  lookingForMatch?: boolean;
  lookingForMatchSport?: Sport | null;
  profileVisible?: boolean;
  showRating?: boolean;
  showMatchHistory?: boolean;
}

export interface UserSportRating {
  sport: Sport;
  rating: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestRating: number;
  lastMatchDate?: string | null;
  weeklyChange?: number;
  isPublic?: boolean;
}

export interface RatingHistoryEntry {
  date: string;
  opponent: UserPublic | null;
  opponentRating: number;
  result: 'WIN' | 'LOSS';
  delta: number;
  newRating: number;
  matchId: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username?: string | null;
  displayName?: string | null;
  name: string;
  avatarUrl?: string | null;
  isBaller: boolean;
  city?: string | null;
  rating: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winStreak: number;
}

export interface CompetitiveMatch {
  id: string;
  type: MatchType;
  sport: Sport;
  format: 'SINGLES' | 'DOUBLES';
  status: CompetitiveMatchStatus;
  playerA: UserPublic & { isBaller?: boolean };
  playerB?: (UserPublic & { isBaller?: boolean }) | null;
  playerARatingBefore?: number | null;
  playerARatingAfter?: number | null;
  playerBRatingBefore?: number | null;
  playerBRatingAfter?: number | null;
  winnerId?: string | null;
  disputed: boolean;
  score?: string | null;
  resultDeadline?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface CreditBalance {
  total: number;
  packs: Array<{
    id: string;
    packSize: number;
    remaining: number;
    purchasedAt: string;
  }>;
}

export interface MonetizationBalance {
  credits: CreditBalance;
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  isBaller: boolean;
  competitiveMatchesThisMonth: number;
  nudge: { type: string; message: string } | null;
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
  coverImageUrl?: string | null;
  rules?: string | null;
  allowDoubles?: boolean;
  skillMin?: number | null;
  skillMax?: number | null;
  chatEnabled?: boolean;
  organizer?: { id: string; name: string; email: string };
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
  user?: { id: string; name: string; email: string; avatarUrl?: string | null };
  tournament?: Tournament;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  player1Id?: string | null;
  player2Id?: string | null;
  winnerId?: string | null;
  score?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  team1Id?: string | null;
  team2Id?: string | null;
  scheduledTime?: string | null;
  bracket?: string | null; // 'WINNERS', 'LOSERS', 'GRAND_FINAL'
  results?: MatchResult[];
}

export interface MatchResult {
  id: string;
  matchId: string;
  submittedBy: string;
  winnerId: string;
  score?: string | null;
  createdAt: string;
  submitter?: { id: string; name: string };
}

export interface OpenMatchPlayer {
  id: string;
  name: string;
  avatarUrl?: string | null;
  city?: string | null;
  level?: PlayLevel | null;
  preferredSport?: Sport | null;
}

export interface OpenMatch {
  id: string;
  creatorId: string;
  opponentId?: string | null;
  sport: Sport;
  location: string;
  venue?: string | null;
  notes?: string | null;
  scheduledFor: string;
  status: OpenMatchStatus;
  createdAt: string;
  updatedAt: string;
  creator: OpenMatchPlayer;
  opponent?: OpenMatchPlayer | null;
}

export interface OpenMatchesFeed {
  hosting: OpenMatch[];
  playing: OpenMatch[];
  available: OpenMatch[];
}

export interface Friendship {
  id: string;
  requesterId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: string;
  requester?: UserPublic;
  receiver?: UserPublic;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
  follower?: UserPublic;
  following?: UserPublic;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string> | null;
  read: boolean;
  createdAt: string;
}

export interface UserPublic {
  id: string;
  username?: string | null;
  displayName?: string | null;
  name: string;
  avatarUrl?: string | null;
  city?: string | null;
  skillLevel?: number | null;
  sports?: Sport[];
  isBaller?: boolean;
  lookingForMatch?: boolean;
  lookingForMatchSport?: Sport | null;
  profileVisible?: boolean;
}

export interface AdminManagedUser extends UserPublic {
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface UserStats {
  wins: number;
  losses: number;
  matchesPlayed: number;
  tournamentCount: number;
}

export interface TournamentAnnouncement {
  id: string;
  tournamentId: string;
  organizerId: string;
  message: string;
  createdAt: string;
  organizer?: { id: string; name: string; avatarUrl?: string | null };
}

export interface TournamentChatMessage {
  id: string;
  tournamentId: string;
  userId: string;
  message: string;
  createdAt: string;
  user?: { id: string; name: string; avatarUrl?: string | null };
}

export interface PaymentRecord {
  id: string;
  tournamentId: string;
  tournamentName: string;
  sport: Sport;
  entryFee: number;
  tournamentDate: string;
  location: string;
  paidAt: string | null;
  stripeSessionId: string | null;
  stripePaymentId: string | null;
  registeredAt: string;
}
