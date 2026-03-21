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

export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';
export type OpenMatchStatus = 'OPEN' | 'BOOKED' | 'CANCELLED';

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
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
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
  createdAt?: string;
}

export interface ProfileUpdate {
  name?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  dateOfBirth?: string | null;
  level?: PlayLevel | null;
  preferredSport?: Sport | null;
  skillLevel?: number | null;
  sports?: Sport[];
  onboardingDone?: boolean;
  expoPushToken?: string | null;
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
  name: string;
  avatarUrl?: string | null;
  city?: string | null;
  skillLevel?: number | null;
  sports?: Sport[];
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
