process.env.NODE_ENV = 'test';

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Model mock factory ────────────────────────────────────────────────────────
function createModelMock() {
  return {
    findUnique: jest.fn<any>(),
    findFirst: jest.fn<any>(),
    findMany: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
    updateMany: jest.fn<any>(),
    upsert: jest.fn<any>(),
    delete: jest.fn<any>(),
    count: jest.fn<any>(),
    aggregate: jest.fn<any>(),
  };
}

const mockStripeInstance = {
  webhooks: { constructEvent: jest.fn<any>() },
  checkout: {
    sessions: {
      create: jest.fn<any>().mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      }),
    },
  },
  subscriptions: {
    retrieve: jest.fn<any>(),
    update: jest.fn<any>().mockResolvedValue({}),
  },
  refunds: { create: jest.fn<any>() },
  customers: { create: jest.fn<any>().mockResolvedValue({ id: 'cus_test_123' }) },
};

const prismaMock = {
  user: createModelMock(),
  creditPack: createModelMock(),
  ballerSubscription: createModelMock(),
  competitiveMatch: createModelMock(),
  transaction: createModelMock(),
  notification: createModelMock(),
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
  getStripe: jest.fn<any>().mockResolvedValue(mockStripeInstance),
  createCheckoutSession: jest.fn<any>(),
  isStripeConfigured: jest.fn<any>().mockReturnValue(true),
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

const userToken = makeToken({ id: 'user-1', email: 'user@example.com', role: 'PLAYER' });

const mockCreditPack = (remaining: number) => ({
  id: 'pack-1',
  userId: 'user-1',
  packSize: 10,
  creditsRemaining: remaining,
  pricePaid: 450,
  stripeTransactionId: 'pi_123',
  purchasedAt: new Date(),
});

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
  prismaMock.$transaction.mockImplementation((fnOrOps: any) => {
    if (typeof fnOrOps === 'function') return fnOrOps(prismaMock);
    return Promise.all(fnOrOps);
  });
  // Reset checkout.sessions.create default
  mockStripeInstance.checkout.sessions.create.mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/pay/cs_test_123',
  });
  mockStripeInstance.subscriptions.update.mockResolvedValue({});
  mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_test_123' });
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Monetization endpoints', () => {

  describe('GET /api/monetization/pricing — public endpoint', () => {
    it('returns pricing info without auth', async () => {
      const res = await request(app).get('/api/monetization/pricing');

      expect(res.status).toBe(200);
      expect(res.body.matchPrice).toBe(0.50);
      expect(Array.isArray(res.body.creditPacks)).toBe(true);
      expect(res.body.ballerSubscription.price).toBe(4.99);
    });
  });

  describe('GET /api/monetization/balance', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/monetization/balance');
      expect(res.status).toBe(401);
    });

    it('returns zero credits and no subscription when user has none', async () => {
      prismaMock.creditPack.findMany.mockResolvedValueOnce([]);
      prismaMock.ballerSubscription.findUnique
        .mockResolvedValueOnce(null)  // balance query
        .mockResolvedValueOnce(null); // verifyCompetitiveAccess
      prismaMock.competitiveMatch.count.mockResolvedValueOnce(0);
      prismaMock.creditPack.findFirst.mockResolvedValueOnce(null);
      prismaMock.creditPack.aggregate.mockResolvedValueOnce({ _sum: { creditsRemaining: 0 } });

      const res = await request(app)
        .get('/api/monetization/balance')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.credits.total).toBe(0);
      expect(res.body.subscription).toBeNull();
      expect(res.body.isBaller).toBe(false);
    });

    it('sums credits across multiple packs', async () => {
      const pack1 = mockCreditPack(3);
      const pack2 = { ...mockCreditPack(7), id: 'pack-2' };
      prismaMock.creditPack.findMany.mockResolvedValueOnce([pack1, pack2]);
      prismaMock.ballerSubscription.findUnique
        .mockResolvedValueOnce(null)  // balance query
        .mockResolvedValueOnce(null); // verifyCompetitiveAccess
      prismaMock.competitiveMatch.count.mockResolvedValueOnce(2);
      prismaMock.creditPack.findFirst.mockResolvedValueOnce(pack1);
      prismaMock.creditPack.aggregate.mockResolvedValueOnce({ _sum: { creditsRemaining: 10 } });

      const res = await request(app)
        .get('/api/monetization/balance')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.credits.total).toBe(10); // 3 + 7
      expect(res.body.credits.packs).toHaveLength(2);
    });

    it('reflects active Baller subscription', async () => {
      const mockSub = {
        id: 'sub-1',
        userId: 'user-1',
        stripeSubscriptionId: 'sub_stripe_123',
        stripeCustomerId: 'cus_123',
        status: 'ACTIVE',
        currentPeriodEnd: new Date('2026-05-01'),
        cancelAtPeriodEnd: false,
      };
      prismaMock.creditPack.findMany.mockResolvedValueOnce([]);
      prismaMock.ballerSubscription.findUnique
        .mockResolvedValueOnce(mockSub)   // balance query
        .mockResolvedValueOnce(mockSub);  // verifyCompetitiveAccess
      prismaMock.competitiveMatch.count.mockResolvedValueOnce(0);
      // verifyCompetitiveAccess → Stripe check (isBaller path)
      mockStripeInstance.subscriptions.retrieve.mockResolvedValueOnce({ status: 'active' });

      const res = await request(app)
        .get('/api/monetization/balance')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isBaller).toBe(true);
      expect(res.body.subscription.status).toBe('ACTIVE');
    });
  });

  describe('POST /api/monetization/buy-credits', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/monetization/buy-credits').send({ packSize: '10' });
      expect(res.status).toBe(401);
    });

    it('rejects invalid pack size', async () => {
      const res = await request(app)
        .post('/api/monetization/buy-credits')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ packSize: '99' }); // not in enum

      expect(res.status).toBe(400);
    });

    it('creates a Stripe checkout session for valid pack size', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({ email: 'user@example.com' });

      const res = await request(app)
        .post('/api/monetization/buy-credits')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ packSize: '10' });

      expect(res.status).toBe(200);
      expect(res.body.checkoutUrl).toContain('checkout.stripe.com');
      expect(res.body.sessionId).toBe('cs_test_123');
    });

    it('returns 404 if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/monetization/buy-credits')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ packSize: '25' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/monetization/subscribe', () => {
    it('returns 400 if already subscribed', async () => {
      prismaMock.ballerSubscription.findUnique.mockResolvedValueOnce({
        id: 'sub-1', status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/monetization/subscribe')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already subscribed/i);
    });

    it('creates subscription checkout for new subscriber', async () => {
      prismaMock.ballerSubscription.findUnique
        .mockResolvedValueOnce(null)   // active check
        .mockResolvedValueOnce(null);  // customer lookup in createBallerSubscriptionCheckout
      prismaMock.user.findUnique.mockResolvedValueOnce({ email: 'user@example.com' });

      const res = await request(app)
        .post('/api/monetization/subscribe')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.checkoutUrl).toContain('checkout.stripe.com');
    });
  });

  describe('POST /api/monetization/cancel-subscription', () => {
    it('returns 400 if no active subscription', async () => {
      prismaMock.ballerSubscription.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/monetization/cancel-subscription')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no active subscription/i);
    });

    it('cancels subscription at period end', async () => {
      const activeSub = {
        id: 'sub-1',
        userId: 'user-1',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'ACTIVE',
        currentPeriodEnd: new Date('2026-05-01'),
        cancelAtPeriodEnd: false,
      };
      prismaMock.ballerSubscription.findUnique.mockResolvedValueOnce(activeSub);
      prismaMock.ballerSubscription.update.mockResolvedValueOnce({
        ...activeSub, cancelAtPeriodEnd: true,
      });

      const res = await request(app)
        .post('/api/monetization/cancel-subscription')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/cancelled at end/i);
      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(
        'sub_stripe_123',
        { cancel_at_period_end: true },
      );
    });
  });

  describe('GET /api/monetization/transactions', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/monetization/transactions');
      expect(res.status).toBe(401);
    });

    it('returns paginated transaction history', async () => {
      const mockTx = {
        id: 'tx-1',
        userId: 'user-1',
        type: 'CREDIT_PURCHASE',
        amount: 450,
        description: '10 match credit pack purchased',
        createdAt: new Date(),
      };
      prismaMock.transaction.findMany.mockResolvedValueOnce([mockTx]);
      prismaMock.transaction.count.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/monetization/transactions')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.transactions)).toBe(true);
      expect(res.body.transactions[0].type).toBe('CREDIT_PURCHASE');
      expect(res.body.total).toBe(1);
    });

    it('supports pagination params', async () => {
      prismaMock.transaction.findMany.mockResolvedValueOnce([]);
      prismaMock.transaction.count.mockResolvedValueOnce(0);

      const res = await request(app)
        .get('/api/monetization/transactions?page=2&limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(5);
    });
  });
});
