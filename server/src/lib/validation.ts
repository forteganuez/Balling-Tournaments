import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createTournamentSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  sport: z.enum(['PADEL', 'TENNIS', 'SQUASH']),
  format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']),
  description: z.string().optional(),
  date: z.coerce.date(),
  location: z.string().min(2, 'Location must be at least 2 characters'),
  venue: z.string().optional(),
  maxPlayers: z.number().int().min(2, 'Must have at least 2 players'),
  entryFee: z.number().int().min(0, 'Entry fee cannot be negative'),
});

export const updateTournamentSchema = createTournamentSchema.partial();

export const matchResultSchema = z.object({
  score: z.string().min(1, 'Score is required'),
  winnerId: z.string(),
});
