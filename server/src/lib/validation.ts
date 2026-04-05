import { z } from 'zod';

const RESERVED_USERNAMES = [
  'admin', 'balling', 'ballingapp', 'support', 'help', 'null', 'undefined',
  'system', 'moderator', 'mod', 'root', 'api', 'www', 'mail', 'ftp',
];

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .refine(
    (val) => !RESERVED_USERNAMES.includes(val.toLowerCase()),
    'This username is reserved'
  );

export { RESERVED_USERNAMES };

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  username: usernameSchema.optional(),
  selfAssessment: z.enum(['never_played', 'played_few_times', 'play_regularly', 'play_competitions', 'semi_professional']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createTournamentSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  sport: z.enum(['PADEL', 'TENNIS', 'SQUASH']),
  format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']),
  description: z.string().nullable().optional(),
  date: z.coerce.date(),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  venue: z.string().nullable().optional(),
  maxPlayers: z.number().int().min(2, 'Must have at least 2 players'),
  entryFee: z.number().int().min(0, 'Entry fee cannot be negative'),
  coverImageUrl: z.string().url().nullable().optional(),
  rules: z.string().nullable().optional(),
  allowDoubles: z.boolean().optional(),
  skillMin: z.number().int().min(1).max(10).nullable().optional(),
  skillMax: z.number().int().min(1).max(10).nullable().optional(),
  chatEnabled: z.boolean().optional(),
});

export const updateTournamentSchema = createTournamentSchema.partial();

export const matchResultSchema = z.object({
  score: z.string().min(1, 'Score is required').max(50, 'Score too long'),
  winnerId: z.string().min(1, 'Winner ID is required'),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  username: usernameSchema.optional(),
  displayName: z.string().max(100).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().max(160).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO']).nullable().optional(),
  preferredSport: z.enum(['PADEL', 'TENNIS', 'SQUASH']).nullable().optional(),
  skillLevel: z.number().int().min(1).max(10).nullable().optional(),
  sports: z.array(z.enum(['PADEL', 'TENNIS', 'SQUASH'])).optional(),
  onboardingDone: z.boolean().optional(),
  expoPushToken: z.string().max(200).nullable().optional(),
  lookingForMatch: z.boolean().optional(),
  lookingForMatchSport: z.enum(['PADEL', 'TENNIS', 'SQUASH']).nullable().optional(),
  profileVisible: z.boolean().optional(),
  showRating: z.boolean().optional(),
  showMatchHistory: z.boolean().optional(),
});

export const socialAuthSchema = z.object({
  idToken: z.string().min(1, 'Token is required'),
});

export const createOpenMatchSchema = z.object({
  sport: z.enum(['PADEL', 'TENNIS', 'SQUASH']),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  venue: z.string().max(120).optional(),
  notes: z.string().max(240).optional(),
  scheduledFor: z.coerce.date(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['PLAYER', 'ORGANIZER', 'ADMIN']),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
});

export const announcementSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Announcement too long'),
});

export const playerSubmitResultSchema = z.object({
  winnerId: z.string().min(1, 'Winner ID is required'),
  score: z.string().max(50).optional(),
});

export const tournamentQuerySchema = z.object({
  sport: z.enum(['PADEL', 'TENNIS', 'SQUASH']).optional(),
  status: z.enum(['REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const doublesRegistrationSchema = z.object({
  partnerId: z.string().min(1, 'Partner ID is required'),
});

// Competitive match
export const createCompetitiveMatchSchema = z.object({
  type: z.enum(['CASUAL', 'COMPETITIVE']),
  sport: z.enum(['PADEL', 'TENNIS', 'SQUASH']),
  format: z.enum(['SINGLES', 'DOUBLES']).optional(),
  opponentId: z.string().optional(),
});

export const submitMatchResultSchema = z.object({
  winnerId: z.string(),
  score: z.string().max(50).optional(),
});

// Credit packs
export const purchaseCreditPackSchema = z.object({
  packSize: z.enum(['10', '25', '50']).transform(Number),
});

// Reports
export const createReportSchema = z.object({
  reason: z.enum(['SPAM', 'OFFENSIVE_BEHAVIOR', 'FAKE_ACCOUNT', 'MATCH_MANIPULATION']),
  description: z.string().max(500).optional(),
});

// Block
export const blockUserSchema = z.object({
  reason: z.string().max(200).optional(),
});
