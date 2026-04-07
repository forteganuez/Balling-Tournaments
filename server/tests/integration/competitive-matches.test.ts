process.env.NODE_ENV = 'test';

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Model mock factory ────────────────────────────────────────────────────────
function createModelMock() {
  return {
    findUnique: jest.fn<any>(),
    findUniqueOrThrow: jest.fn<any>(),
    findFirst: jest.fn<any>(),
    findMany: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
    updateMany: jest.fn<any>(),
    delete: jest.fn<any>(),
    deleteMany: jest.fn<any>(),
    count: jest.fn<any>(),
    aggregate: jest.fn<any>(),
  };
}

const prismaMock = {
  user: createModelMock(),
  competitiveMatch: createModelMock(),
  creditPack: createModelMock(),
  transaction: createModelMock(),
  block: createModelMock(),
  notification: createModelMock(),
  ballerSubscription: createModelMock(),
  userSportRating: createModelMock(),
  ratingHistory: createModelMock(),
  $transaction: jest.fn<any>((fnOrOps: any) => {
    if (typeof fnOrOps === 'function') return fnOrOps(prismaMock);
    return Promise.all(fnOrOps);
  }),
};

jest.unstable_mockModule('../../src/lib/prisma.js', () => ({ default: prismaMock }));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
  authenticate: jest.fn<any>((req: any, _res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      _res.status(401).json({ error: 'Authentication required' });
      return;
    }
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any;
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      next();
    } catch {
      _res.status(401).json({ error: 'Invalid or expired token' });
    }
  }),
  optionalAuth: jest.fn<any>((_req: any, _res: any, next: any) => next()),
}));

jest.unstable_mockModule('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

jest.unstable_mockModule('../../src/services/stripe.js', () => ({
  getStripe: jest.fn<any>().mockResolvedValue({
    webhooks: { constructEvent: jest.fn<any>() },
    checkout: { sessions: { create: jest.fn<any>() } },
    subscriptions: { retrieve: jest.fn<any>(), update: jest.fn<any>() },
    refunds: { create: jest.fn<any>() },
    customers: { create: jest.fn<any>() },
  }),
  createCheckoutSession: jest.fn<any>(),
  isStripeConfigured: jest.fn<any>().mockReturnValue(false),
}));

jest.unstable_mockModule('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: jest.fn(),
    getToken: jest.fn(),
    verifyIdToken: jest.fn(),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

const playerAToken = makeToken({ id: 'player-a', email: 'a@example.com', role: 'PLAYER' });
const playerBToken = makeToken({ id: 'player-b', email: 'b@example.com', role: 'PLAYER' });

const mockMatch = {
  id: 'match-1',
  type: 'COMPETITIVE',
  sport: 'PADEL',
  format: 'SINGLES',
  status: 'AWAITING_OPPONENT',
  playerAId: 'player-a',
  playerBId: null,
  playerAPaymentMethod: 'CREDIT',
  playerBPaymentMethod: null,
  playerACreditId: 'pack-1',
  playerBCreditId: null,
  playerATransactionId: 'tx-a',
  playerBTransactionId: null,
  playerAConfirmed: false,
  playerBConfirmed: false,
  winnerId: null,
  score: null,
  disputed: false,
  completedAt: null,
  resultDeadline: null,
  createdAt: new Date(),
};

const mockCreditPack = {
  id: 'pack-1',
  userId: 'player-a',
  packSize: 10,
  creditsRemaining: 5,
  pricePaid: 450,
  stripeTransactionId: 'pi_123',
  purchasedAt: new Date(),
};

const playerSelect = {
  id: true, username: true, displayName: true, name: true, avatarUrl: true, isBaller: true,
};

const mockPlayerA = {
  id: 'player-a', username: 'playera', displayName: null, name: 'Player A',
  avatarUrl: null, isBaller: false,
};
const mockPlayerB = {
  id: 'player-b', username: 'playerb', displayName: null, name: 'Player B',
  avatarUrl: null, isBaller: false,
};

let app: any;

beforeAll(async () => {
  const module = await import('../../src/index.js');
  app = module.default;
});

beforeEach(() => {
  for (const model of Object.values(prismaMock)) {
    if (model && typeof model === 'object') {
      for (const fn of Object.values(model as Record<string, any>)) {
        if (typeof fn?.mockReset === 'function') fn.mockReset();
      }
    }
  }
  // Restore $transaction default behavior after reset
  prismaMock.$transaction.mockImplementation((fnOrOps: any) => {
    if (typeof fnOrOps === 'function') return fnOrOps(prismaMock);
    return Promise.all(fnOrOps);
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Competitive Match endpoints', () => {

  describe('POST /api/competitive-matches — create match', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/competitive-matches').send({
        type: 'CASUAL', sport: 'PADEL',
      });
      expect(res.status).toBe(401);
    });

    it('creates a casual match without payment check', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ bannedAt: null, suspendedUntil: null });
      prismaMock.competitiveMatch.create.mockResolvedValueOnce({
        ...mockMatch, type: 'CASUAL', playerAPaymentMethod: 'NONE',
        playerA: mockPlayerA, playerB: null,
      });
      // createNotification calls
      prismaMock.notification.create.mockResolvedValueOnce({});
      prismaMock.user.findUnique.mockResolvedValueOnce({ expoPushToken: null });

      const res = await request(app)
        .post('/api/competitive-matches')
        .set('Authorization', `Bearer ${playerAToken}`)
        .send({ type: 'CASUAL', sport: 'PADEL' });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('CASUAL');
    });

    it('returns 402 when competitive and no credits / no subscription', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ bannedAt: null, suspendedUntil: null });
      // verifyCompetitiveAccess
      prismaMock.ballerSubscription.findUnique.mockResolvedValueOnce(null);
      prismaMock.creditPack.findFirst.mockResolvedValueOnce(null);
      prismaMock.creditPack.aggregate.mockResolvedValueOnce({ _sum: { creditsRemaining: 0 } });

      const res = await request(app)
        .post('/api/competitive-matches')
        .set('Authorization', `Bearer ${playerAToken}`)
        .send({ type: 'COMPETITIVE', sport: 'PADEL' });

      expect(res.status).toBe(402);
      expect(res.body.needsPayment).toBe(true);
    });

    it('creates a competitive match and deducts a credit', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ bannedAt: null, suspendedUntil: null });
      // verifyCompetitiveAccess
      prismaMock.ballerSubscription.findUnique.mockResolvedValueOnce(null);
      prismaMock.creditPack.findFirst.mockResolvedValueOnce(mockCreditPack);
      prismaMock.creditPack.aggregate.mockResolvedValueOnce({ _sum: { creditsRemaining: 5 } });
      // deductCredit inside $transaction
      prismaMock.creditPack.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.transaction.create.mockResolvedValueOnce({ id: 'tx-a' });
      // competitiveMatch.create
      prismaMock.competitiveMatch.create.mockResolvedValueOnce({
        ...mockMatch, playerA: mockPlayerA, playerB: null,
      });
      // createNotification (no opponent specified, so no notification)

      const res = await request(app)
        .post('/api/competitive-matches')
        .set('Authorization', `Bearer ${playerAToken}`)
        .send({ type: 'COMPETITIVE', sport: 'PADEL' });

      expect(res.status).toBe(201);
      expect(res.body.playerAPaymentMethod).toBe('CREDIT');
      expect(prismaMock.creditPack.updateMany).toHaveBeenCalledTimes(1);
    });

    it('returns 403 when user is banned', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        bannedAt: new Date('2025-01-01'), suspendedUntil: null,
      });

      const res = await request(app)
        .post('/api/competitive-matches')
        .set('Authorization', `Bearer ${playerAToken}`)
        .send({ type: 'CASUAL', sport: 'PADEL' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/suspended/i);
    });
  });

  describe('POST /api/competitive-matches/:id/accept — accept match', () => {
    it('returns 404 for unknown match', async () => {
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/competitive-matches/nonexistent/accept')
        .set('Authorization', `Bearer ${playerBToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 400 if player tries to accept own match', async () => {
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(mockMatch);

      const res = await request(app)
        .post('/api/competitive-matches/match-1/accept')
        .set('Authorization', `Bearer ${playerAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot accept your own/i);
    });

    it('returns 403 when blocked', async () => {
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(mockMatch);
      prismaMock.block.findFirst.mockResolvedValueOnce({ id: 'block-1' });

      const res = await request(app)
        .post('/api/competitive-matches/match-1/accept')
        .set('Authorization', `Bearer ${playerBToken}`);

      expect(res.status).toBe(403);
    });

    it('accepts a casual match atomically', async () => {
      const casualMatch = { ...mockMatch, type: 'CASUAL', playerAPaymentMethod: 'NONE' };
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(casualMatch);
      prismaMock.block.findFirst.mockResolvedValueOnce(null);
      // $transaction: updateMany → count 1, findUniqueOrThrow → full match
      prismaMock.competitiveMatch.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.competitiveMatch.findUniqueOrThrow.mockResolvedValueOnce({
        ...casualMatch, playerBId: 'player-b', status: 'ACTIVE',
        playerA: mockPlayerA, playerB: mockPlayerB,
      });
      // createNotification for player-a
      prismaMock.notification.create.mockResolvedValueOnce({});
      prismaMock.user.findUnique.mockResolvedValueOnce({ expoPushToken: null });

      const res = await request(app)
        .post('/api/competitive-matches/match-1/accept')
        .set('Authorization', `Bearer ${playerBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACTIVE');
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('returns 409 if match slot is already taken', async () => {
      const casualMatch = { ...mockMatch, type: 'CASUAL', playerAPaymentMethod: 'NONE' };
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(casualMatch);
      prismaMock.block.findFirst.mockResolvedValueOnce(null);
      // $transaction: updateMany returns count 0 → slot taken
      prismaMock.competitiveMatch.updateMany.mockResolvedValueOnce({ count: 0 });

      const res = await request(app)
        .post('/api/competitive-matches/match-1/accept')
        .set('Authorization', `Bearer ${playerBToken}`);

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/competitive-matches/:id/submit-result — result submission', () => {
    const activeMatch = {
      ...mockMatch,
      playerBId: 'player-b',
      status: 'ACTIVE',
      playerAConfirmed: false,
      playerBConfirmed: false,
      winnerId: null,
    };

    it('stores winner on first submission', async () => {
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(activeMatch);
      prismaMock.competitiveMatch.update.mockResolvedValueOnce({
        ...activeMatch, playerAConfirmed: true, winnerId: 'player-a',
        playerA: mockPlayerA, playerB: mockPlayerB,
      });
      // createNotification to player-b
      prismaMock.notification.create.mockResolvedValueOnce({});
      prismaMock.user.findUnique.mockResolvedValueOnce({ expoPushToken: null });

      const res = await request(app)
        .post('/api/competitive-matches/match-1/submit-result')
        .set('Authorization', `Bearer ${playerAToken}`)
        .send({ winnerId: 'player-a' });

      expect(res.status).toBe(200);
      expect(prismaMock.competitiveMatch.update).toHaveBeenCalledTimes(1);
    });

    it('completes match and updates ratings when both players agree', async () => {
      // Player B confirms, player A already confirmed with same winner
      const matchAfterA = {
        ...activeMatch,
        playerAConfirmed: true,
        playerBConfirmed: false,
        winnerId: 'player-a',
      };
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(matchAfterA);

      // updateRatingsAfterMatch calls
      const mockRating = { rating: 5.0, matchesPlayed: 5, wins: 3, losses: 2, winStreak: 1, bestRating: 6.0, lastMatchDate: null, lastDecayDate: null };
      prismaMock.userSportRating.findUnique
        .mockResolvedValueOnce({ ...mockRating, userId: 'player-a' })  // winner rating
        .mockResolvedValueOnce({ ...mockRating, userId: 'player-b' }); // loser rating
      // $transaction for rating update (array form) — resolved by Promise.all
      prismaMock.userSportRating.update.mockResolvedValue({});
      prismaMock.ratingHistory.create.mockResolvedValue({});

      // User stats update via $transaction (array form)
      prismaMock.user.update.mockResolvedValue({});

      // Final match update
      prismaMock.competitiveMatch.update.mockResolvedValueOnce({
        ...matchAfterA,
        playerBConfirmed: true,
        status: 'COMPLETED',
        winnerId: 'player-a',
        playerA: mockPlayerA,
        playerB: mockPlayerB,
      });
      // createNotification
      prismaMock.notification.create.mockResolvedValueOnce({});
      prismaMock.user.findUnique.mockResolvedValueOnce({ expoPushToken: null });

      const res = await request(app)
        .post('/api/competitive-matches/match-1/submit-result')
        .set('Authorization', `Bearer ${playerBToken}`)
        .send({ winnerId: 'player-a' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
    });

    it('disputes match when players disagree on winner', async () => {
      const matchAfterA = {
        ...activeMatch,
        playerAConfirmed: true,
        playerBConfirmed: false,
        winnerId: 'player-a', // A says A won
      };
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(matchAfterA);

      // This is COMPETITIVE so refundMatchPayments is called:
      // It looks up transactions for each player before refunding
      prismaMock.transaction.findUnique.mockResolvedValue(null); // no individual payment

      prismaMock.competitiveMatch.update.mockResolvedValueOnce({
        ...matchAfterA,
        playerBConfirmed: true,
        status: 'DISPUTED',
        winnerId: null,
        disputed: true,
        playerA: mockPlayerA,
        playerB: mockPlayerB,
      });
      // Notifications to both
      prismaMock.notification.create.mockResolvedValue({});
      prismaMock.user.findUnique.mockResolvedValue({ expoPushToken: null });

      const res = await request(app)
        .post('/api/competitive-matches/match-1/submit-result')
        .set('Authorization', `Bearer ${playerBToken}`)
        .send({ winnerId: 'player-b' }); // B says B won — DISPUTE

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DISPUTED');
    });

    it('returns 403 to non-participant', async () => {
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(activeMatch);

      const outsiderToken = makeToken({ id: 'outsider', email: 'out@example.com', role: 'PLAYER' });
      const res = await request(app)
        .post('/api/competitive-matches/match-1/submit-result')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ winnerId: 'player-a' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/competitive-matches/:id/cancel', () => {
    const createdMatch = { ...mockMatch, playerBId: null, status: 'CREATED' };

    it('creator can cancel a match', async () => {
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(createdMatch);
      prismaMock.competitiveMatch.update.mockResolvedValueOnce({
        ...createdMatch, status: 'CANCELLED',
        playerA: mockPlayerA, playerB: null,
      });

      const res = await request(app)
        .post('/api/competitive-matches/match-1/cancel')
        .set('Authorization', `Bearer ${playerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
    });

    it('non-creator gets 403', async () => {
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(createdMatch);

      const res = await request(app)
        .post('/api/competitive-matches/match-1/cancel')
        .set('Authorization', `Bearer ${playerBToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/competitive-matches/my', () => {
    it('returns paginated matches for authenticated user', async () => {
      prismaMock.competitiveMatch.findMany.mockResolvedValueOnce([
        { ...mockMatch, playerA: mockPlayerA, playerB: null },
      ]);
      prismaMock.competitiveMatch.count.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/competitive-matches/my')
        .set('Authorization', `Bearer ${playerAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.matches)).toBe(true);
      expect(res.body.total).toBe(1);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/competitive-matches/my');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/competitive-matches/:id', () => {
    const activeMatch = { ...mockMatch, playerBId: 'player-b', status: 'ACTIVE', playerA: mockPlayerA, playerB: mockPlayerB };

    it('participant can view match', async () => {
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(activeMatch);

      const res = await request(app)
        .get('/api/competitive-matches/match-1')
        .set('Authorization', `Bearer ${playerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('match-1');
    });

    it('non-participant gets 403', async () => {
      prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce(activeMatch);

      const outsiderToken = makeToken({ id: 'outsider', email: 'out@example.com', role: 'PLAYER' });
      const res = await request(app)
        .get('/api/competitive-matches/match-1')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });
  });
});
