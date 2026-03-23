process.env.NODE_ENV = 'test';

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock Prisma globally before importing app
const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'PLAYER',
  phone: null,
  avatarUrl: null,
  bio: null,
  city: null,
  dateOfBirth: null,
  level: null,
  preferredSport: null,
  authProvider: 'LOCAL',
  skillLevel: null,
  sports: [],
  wins: 0,
  losses: 0,
  matchesPlayed: 0,
  onboardingDone: false,
  expoPushToken: null,
  createdAt: new Date(),
  passwordHash: '$2a$10$dummy',
};

const mockTournament = {
  id: 'tournament-1',
  name: 'Test Padel Open',
  sport: 'PADEL',
  format: 'SINGLE_ELIMINATION',
  status: 'REGISTRATION_OPEN',
  description: 'A test tournament',
  date: new Date('2026-06-01'),
  location: 'Madrid',
  venue: null,
  maxPlayers: 16,
  entryFee: 1000,
  organizerId: 'user-1',
  coverImageUrl: null,
  rules: null,
  allowDoubles: false,
  skillMin: null,
  skillMax: null,
  chatEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Create model mocks
function createModelMock() {
  return {
    findUnique: jest.fn<any>(),
    findFirst: jest.fn<any>(),
    findMany: jest.fn<any>(),
    create: jest.fn<any>(),
    createMany: jest.fn<any>(),
    update: jest.fn<any>(),
    updateMany: jest.fn<any>(),
    upsert: jest.fn<any>(),
    delete: jest.fn<any>(),
    deleteMany: jest.fn<any>(),
    count: jest.fn<any>(),
  };
}

const prismaMock = {
  user: createModelMock(),
  tournament: createModelMock(),
  registration: createModelMock(),
  match: createModelMock(),
  matchResult: createModelMock(),
  friendship: createModelMock(),
  follow: createModelMock(),
  notification: createModelMock(),
  tournamentAnnouncement: createModelMock(),
  tournamentChat: createModelMock(),
  doublesTeam: createModelMock(),
  openMatch: createModelMock(),
  auditLog: createModelMock(),
  $transaction: jest.fn<any>((fn: any) => fn(prismaMock)),
};

jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  default: prismaMock,
}));

// Mock auth middleware — jwt.unstable_mockModule doesn't reliably intercept
// transitive imports in ESM, so we mock the auth middleware directly.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

jest.unstable_mockModule('../../src/middleware/auth.js', () => ({
  authenticate: jest.fn<any>((req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as any;
      req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  }),
  optionalAuth: jest.fn<any>((_req: any, _res: any, next: any) => {
    next();
  }),
}));

// Mock Sentry
jest.unstable_mockModule('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

// Mock Stripe
jest.unstable_mockModule('../../src/services/stripe.js', () => ({
  stripe: {
    webhooks: { constructEvent: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
  },
  createCheckoutSession: jest.fn(),
}));

// Mock Google Auth
jest.unstable_mockModule('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: jest.fn(),
    getToken: jest.fn(),
    verifyIdToken: jest.fn(),
  })),
}));

function makeToken(user: { id: string; email: string; role: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
}

let app: any;

beforeAll(async () => {
  const module = await import('../../src/index.js');
  app = module.default;
});

beforeEach(() => {
  // Reset all mock return values between tests
  for (const model of Object.values(prismaMock)) {
    if (model && typeof model === 'object') {
      for (const fn of Object.values(model as Record<string, any>)) {
        if (typeof fn?.mockReset === 'function') {
          fn.mockReset();
        }
      }
    }
  }
});

describe('API Integration Tests', () => {
  describe('GET /api — 404 for unknown routes', () => {
    it('returns 404 for unknown API path', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });
  });

  describe('Auth endpoints', () => {
    it('POST /api/auth/register — rejects invalid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'J', email: 'bad', password: '12' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
    });

    it('POST /api/auth/login — rejects invalid data', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-email', password: '12' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation error');
    });

    it('POST /api/auth/login — returns 401 for non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('GET /api/auth/me — returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('GET /api/auth/me — returns user with valid token', async () => {
      const token = makeToken({ id: 'user-1', email: 'test@example.com', role: 'PLAYER' });
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@example.com');
    });
  });

  describe('Tournament endpoints', () => {
    it('GET /api/tournaments — returns tournament list', async () => {
      prismaMock.tournament.findMany.mockResolvedValueOnce([mockTournament]);

      const res = await request(app).get('/api/tournaments');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/tournaments/:id — returns 404 for missing tournament', async () => {
      prismaMock.tournament.findUnique.mockResolvedValueOnce(null);

      const res = await request(app).get('/api/tournaments/nonexistent');

      expect(res.status).toBe(404);
    });

    it('POST /api/tournaments — rejects unauthenticated', async () => {
      const res = await request(app)
        .post('/api/tournaments')
        .send({ name: 'Test' });

      expect(res.status).toBe(401);
    });

    it('POST /api/tournaments — rejects PLAYER role', async () => {
      const token = makeToken({ id: 'user-1', email: 'test@example.com', role: 'PLAYER' });

      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Tourney',
          sport: 'PADEL',
          format: 'SINGLE_ELIMINATION',
          date: '2026-06-01T10:00:00Z',
          location: 'Madrid',
          maxPlayers: 8,
          entryFee: 0,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Notification endpoints', () => {
    it('GET /api/notifications — returns 401 without auth', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    it('GET /api/notifications — returns notifications for authed user', async () => {
      const token = makeToken({ id: 'user-1', email: 'test@example.com', role: 'PLAYER' });
      prismaMock.notification.findMany.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('User endpoints', () => {
    it('GET /api/users/:id — returns user profile', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        avatarUrl: null,
        bio: null,
        city: null,
        skillLevel: null,
        sports: [],
        wins: 0,
        losses: 0,
        matchesPlayed: 0,
        level: null,
        preferredSport: null,
        createdAt: new Date(),
      });

      const res = await request(app).get('/api/users/user-1');

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Test User');
    });

    it('GET /api/users/:id — returns 404 for missing user', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app).get('/api/users/nonexistent');

      expect(res.status).toBe(404);
    });

    it('PUT /api/users/:id/role — rejects non-admin', async () => {
      const token = makeToken({ id: 'user-1', email: 'test@example.com', role: 'PLAYER' });

      const res = await request(app)
        .put('/api/users/user-2/role')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ORGANIZER' });

      expect(res.status).toBe(403);
    });
  });

  describe('Rate limiting', () => {
    it('auth endpoints return rate limit headers', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      // Rate limit headers should be present
      expect(res.headers['ratelimit-limit']).toBeDefined();
    });
  });

  describe('Security headers', () => {
    it('includes helmet security headers', async () => {
      prismaMock.tournament.findMany.mockResolvedValueOnce([]);
      const res = await request(app).get('/api/tournaments');

      // Helmet sets these headers
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
