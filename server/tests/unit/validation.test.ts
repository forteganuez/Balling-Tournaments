import { describe, it, expect } from '@jest/globals';
import {
  registerSchema,
  loginSchema,
  createTournamentSchema,
  profileUpdateSchema,
  chatMessageSchema,
  announcementSchema,
  playerSubmitResultSchema,
  createOpenMatchSchema,
  matchResultSchema,
  updateUserRoleSchema,
} from '../../src/lib/validation.js';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid registration', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        password: 'secret123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short name', () => {
      const result = registerSchema.safeParse({
        name: 'J',
        email: 'john@example.com',
        password: 'secret123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        email: 'not-an-email',
        password: 'secret123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        password: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional phone', () => {
      const result = registerSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        password: 'secret123',
        phone: '+1234567890',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login', () => {
      const result = loginSchema.safeParse({
        email: 'john@example.com',
        password: 'secret123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing email', () => {
      const result = loginSchema.safeParse({ password: 'secret123' });
      expect(result.success).toBe(false);
    });
  });

  describe('createTournamentSchema', () => {
    const validTournament = {
      name: 'Padel Open',
      sport: 'PADEL',
      format: 'SINGLE_ELIMINATION',
      date: '2026-06-01T10:00:00Z',
      location: 'Madrid',
      maxPlayers: 16,
      entryFee: 1000,
    };

    it('accepts valid tournament', () => {
      const result = createTournamentSchema.safeParse(validTournament);
      expect(result.success).toBe(true);
    });

    it('rejects invalid sport', () => {
      const result = createTournamentSchema.safeParse({
        ...validTournament,
        sport: 'BASKETBALL',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative entry fee', () => {
      const result = createTournamentSchema.safeParse({
        ...validTournament,
        entryFee: -100,
      });
      expect(result.success).toBe(false);
    });

    it('rejects fewer than 2 max players', () => {
      const result = createTournamentSchema.safeParse({
        ...validTournament,
        maxPlayers: 1,
      });
      expect(result.success).toBe(false);
    });

    it('accepts all format types', () => {
      for (const format of ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']) {
        const result = createTournamentSchema.safeParse({
          ...validTournament,
          format,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('profileUpdateSchema', () => {
    it('accepts valid profile update', () => {
      const result = profileUpdateSchema.safeParse({
        name: 'John Doe',
        bio: 'I love padel',
        skillLevel: 5,
        sports: ['PADEL', 'TENNIS'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects bio over 500 chars', () => {
      const result = profileUpdateSchema.safeParse({
        bio: 'x'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid skill level', () => {
      const result = profileUpdateSchema.safeParse({
        skillLevel: 15,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid sport in sports array', () => {
      const result = profileUpdateSchema.safeParse({
        sports: ['PADEL', 'BASKETBALL'],
      });
      expect(result.success).toBe(false);
    });

    it('accepts nullable fields', () => {
      const result = profileUpdateSchema.safeParse({
        bio: null,
        city: null,
        skillLevel: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('chatMessageSchema', () => {
    it('accepts valid message', () => {
      const result = chatMessageSchema.safeParse({ message: 'Hello!' });
      expect(result.success).toBe(true);
    });

    it('rejects empty message', () => {
      const result = chatMessageSchema.safeParse({ message: '' });
      expect(result.success).toBe(false);
    });

    it('rejects message over 1000 chars', () => {
      const result = chatMessageSchema.safeParse({ message: 'x'.repeat(1001) });
      expect(result.success).toBe(false);
    });
  });

  describe('announcementSchema', () => {
    it('rejects announcement over 2000 chars', () => {
      const result = announcementSchema.safeParse({ message: 'x'.repeat(2001) });
      expect(result.success).toBe(false);
    });
  });

  describe('playerSubmitResultSchema', () => {
    it('accepts valid result', () => {
      const result = playerSubmitResultSchema.safeParse({
        winnerId: 'player-123',
        score: '6-4 7-5',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing winnerId', () => {
      const result = playerSubmitResultSchema.safeParse({ score: '6-4' });
      expect(result.success).toBe(false);
    });

    it('accepts result without score', () => {
      const result = playerSubmitResultSchema.safeParse({
        winnerId: 'player-123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('matchResultSchema', () => {
    it('requires both score and winnerId', () => {
      const valid = matchResultSchema.safeParse({
        score: '6-4',
        winnerId: 'p1',
      });
      expect(valid.success).toBe(true);

      const missingScore = matchResultSchema.safeParse({ winnerId: 'p1' });
      expect(missingScore.success).toBe(false);
    });
  });

  describe('updateUserRoleSchema', () => {
    it('accepts valid roles', () => {
      for (const role of ['PLAYER', 'ORGANIZER', 'ADMIN']) {
        const result = updateUserRoleSchema.safeParse({ role });
        expect(result.success).toBe(true);
      }
    });

    it('rejects invalid role', () => {
      const result = updateUserRoleSchema.safeParse({ role: 'SUPERADMIN' });
      expect(result.success).toBe(false);
    });
  });

  describe('createOpenMatchSchema', () => {
    it('accepts valid open match', () => {
      const result = createOpenMatchSchema.safeParse({
        sport: 'TENNIS',
        location: 'Central Park',
        scheduledFor: '2026-06-01T14:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short location', () => {
      const result = createOpenMatchSchema.safeParse({
        sport: 'TENNIS',
        location: 'A',
        scheduledFor: '2026-06-01T14:00:00Z',
      });
      expect(result.success).toBe(false);
    });
  });
});
