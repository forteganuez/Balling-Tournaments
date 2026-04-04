# Payment & Monetization System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the credit-pack monetization system with a new model supporting Stripe (web) and RevenueCat (mobile IAP) for Baller subscriptions, match entry, equipment rental, and shop orders.

**Architecture:** The server gains a new `payments` router for purchase flows and a RevenueCat webhook handler alongside the existing Stripe webhook. The Prisma schema removes `CreditPack` and replaces the old `BallerSubscription` (Stripe-only) with a unified model supporting both Stripe and RevenueCat. Mobile gets a RevenueCat lib and a native paywall screen, plus a thin `webPayment.ts` wrapper for Stripe Checkout via expo-web-browser.

**Tech Stack:** Express + TypeScript + Prisma + PostgreSQL, Stripe SDK, RevenueCat (`react-native-purchases`), `expo-web-browser`, Zod, Jest (existing mock pattern)

---

## File Map

**Server — modify:**
- `server/prisma/schema.prisma` — remove CreditPack; replace BallerSubscription; add Purchase, MatchEntry, EquipmentRental, ShopOrder; add `ballerExpiresAt` to User
- `server/src/routes/webhooks.ts` — update Stripe handler: handle new metadata types, remove credit-pack handling
- `server/src/routes/monetization.ts` — remove buy-credits / credit-pack logic; keep balance, subscribe, cancel-subscription, pay-match endpoints (updated references)
- `server/src/services/payments.ts` — update `verifyCompetitiveAccess` for new BallerSubscription fields; remove `CREDIT_PACK_PRICES`, `createCreditPackCheckout`
- `server/src/routes/auth.ts` — add `ballerExpiresAt` to `USER_SELECT`
- `server/src/index.ts` — mount new payments router + RevenueCat webhook
- `server/.env.example` — add new price env vars + `REVENUECAT_WEBHOOK_SECRET`

**Server — create:**
- `server/src/routes/webhooks/revenuecat.ts` — RevenueCat webhook handler
- `server/src/routes/payments.ts` — match-entry, baller-subscription, equipment-rental, shop-order, cancel-pending endpoints

**Mobile — create:**
- `mobile/src/lib/purchases.ts` — RevenueCat init, getBallerOffering, purchaseBaller, restorePurchases
- `mobile/src/screens/BallerPaywallScreen.tsx` — native IAP paywall with RevenueCat
- `mobile/src/lib/webPayment.ts` — expo-web-browser wrapper for Stripe Checkout

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Remove CreditPack model and its User relation**

In `server/prisma/schema.prisma`:
1. Delete the entire `CreditPack` model block (lines ~489–500)
2. Remove `creditPacks CreditPack[]` from the User model relations
3. Remove the `CREDIT_PACK_PRICES` import reference (done in Task 3)

After deletion, the `CreditPack` model should be gone and `User.creditPacks` removed.

- [ ] **Step 2: Replace BallerSubscription model**

Find the existing `BallerSubscription` model and replace it entirely:

```prisma
// ── Baller subscription (Stripe web or RevenueCat mobile) ──
model BallerSubscription {
  id                     String   @id @default(cuid())
  userId                 String   @unique
  source                 String   // 'stripe' | 'revenuecat'
  externalSubscriptionId String   @unique
  status                 String   // 'active' | 'cancelled' | 'expired'
  currentPeriodEnd       DateTime
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  user                   User     @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 3: Add ballerExpiresAt to User model**

In the User model, after `isBaller Boolean @default(false)`, add:

```prisma
ballerExpiresAt DateTime?
```

- [ ] **Step 4: Add Purchase model**

After the BallerSubscription model, add:

```prisma
// ── Purchase audit record (idempotency key = externalTransactionId) ──
model Purchase {
  id                    String   @id @default(cuid())
  userId                String
  type                  String   // 'match_entry' | 'baller_subscription' | 'equipment_rental' | 'shop_order'
  source                String   // 'stripe' | 'revenuecat'
  externalTransactionId String   @unique
  amountCents           Int
  currency              String   @default("eur")
  metadata              Json?
  createdAt             DateTime @default(now())
  user                  User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
}
```

- [ ] **Step 5: Add MatchEntry model**

```prisma
model MatchEntry {
  id         String   @id @default(cuid())
  matchId    String
  userId     String
  purchaseId String?  @unique
  status     String   // 'pending_payment' | 'confirmed' | 'refunded'
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])

  @@index([matchId])
  @@index([userId, status])
}
```

- [ ] **Step 6: Add EquipmentRental model**

```prisma
model EquipmentRental {
  id          String   @id @default(cuid())
  userId      String
  item        String   // 'racket' | 'grip_set' | 'ball_set'
  quantity    Int
  sessionDate DateTime
  purchaseId  String?  @unique
  status      String   // 'pending_payment' | 'confirmed' | 'cancelled'
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id])

  @@index([userId, status])
}
```

- [ ] **Step 7: Add ShopOrder model**

```prisma
model ShopOrder {
  id              String   @id @default(cuid())
  userId          String
  items           Json     // [{ product_id, name, quantity, unit_price_cents }]
  totalCents      Int
  status          String   // 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  shippingAddress Json
  purchaseId      String?  @unique
  createdAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id])

  @@index([userId, status])
}
```

- [ ] **Step 8: Add new User relations**

In the User model relations block, add after existing relations:

```prisma
purchases        Purchase[]
matchEntries     MatchEntry[]
equipmentRentals EquipmentRental[]
shopOrders       ShopOrder[]
```

- [ ] **Step 9: Run migration**

```bash
cd server && npx prisma migrate dev --name replace_creditpack_with_payment_system
```

Expected: Migration created and applied. If any existing data in `BallerSubscription` fails migration (field rename), it's acceptable in dev — it's a clean slate redesign.

- [ ] **Step 10: Verify generated client**

```bash
cd server && npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 11: Verify build**

```bash
cd server && npm run build 2>&1 | head -30
```

Expected: TypeScript errors from removed CreditPack references (in monetization.ts, webhooks.ts, services/payments.ts) — that's expected. Fix those in subsequent tasks.

- [ ] **Step 12: Commit**

```bash
cd server && git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: replace credit-pack schema with payment system models"
```

---

## Task 2: Update services/payments.ts

**Files:**
- Modify: `server/src/services/payments.ts`

Remove `CREDIT_PACK_PRICES` and `createCreditPackCheckout`. Update `verifyCompetitiveAccess` to use the new `BallerSubscription` fields (no more Stripe real-time check — rely on DB state kept current by webhooks).

- [ ] **Step 1: Write failing test**

In `server/tests/integration/api.test.ts`, find the `prismaMock` object and add the new models:

```typescript
const prismaMock = {
  // ... existing models ...
  ballerSubscription: createModelMock(),
  purchase: createModelMock(),
  matchEntry: createModelMock(),
  equipmentRental: createModelMock(),
  shopOrder: createModelMock(),
  // ... keep existing creditPack: createModelMock() for now (will be removed after)
};
```

Add a describe block for `verifyCompetitiveAccess`:

```typescript
describe('verifyCompetitiveAccess (unit)', () => {
  it('returns isBaller=true for active subscription not yet expired', async () => {
    prismaMock.ballerSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      userId: 'user-1',
      source: 'stripe',
      externalSubscriptionId: 'sub_abc',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 86400 * 1000), // tomorrow
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { verifyCompetitiveAccess } = await import('../../src/services/payments.js');
    const result = await verifyCompetitiveAccess('user-1');
    expect(result.isBaller).toBe(true);
    expect(result.hasAccess).toBe(true);
  });

  it('returns isBaller=false for expired subscription', async () => {
    prismaMock.ballerSubscription.findUnique.mockResolvedValueOnce({
      id: 'sub-1',
      userId: 'user-1',
      source: 'stripe',
      externalSubscriptionId: 'sub_abc',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() - 86400 * 1000), // yesterday
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { verifyCompetitiveAccess } = await import('../../src/services/payments.js');
    const result = await verifyCompetitiveAccess('user-1');
    expect(result.isBaller).toBe(false);
  });
});
```

Run: `cd server && npm test -- --testNamePattern="verifyCompetitiveAccess" 2>&1 | tail -20`  
Expected: FAIL (function uses old BallerSubscription fields)

- [ ] **Step 2: Update services/payments.ts**

Replace the entire file with the following (remove all credit-pack related functions, update `verifyCompetitiveAccess`):

```typescript
import prisma from '../lib/prisma.js';
import { stripe } from './stripe.js';
import { logger } from '../lib/logger.js';
import type { CompetitiveMatch } from '@prisma/client';

const MATCH_PRICE_CENTS = 50; // €0.50
const BALLER_MONTHLY_PRICE_CENTS = 499; // €4.99

interface AccessResult {
  hasAccess: boolean;
  method: 'INDIVIDUAL' | 'BALLER_SUBSCRIPTION' | 'NONE';
  isBaller: boolean;
}

export async function verifyCompetitiveAccess(userId: string): Promise<AccessResult> {
  const subscription = await prisma.ballerSubscription.findUnique({
    where: { userId },
  });

  if (
    subscription &&
    subscription.status === 'active' &&
    subscription.currentPeriodEnd > new Date()
  ) {
    return { hasAccess: true, method: 'BALLER_SUBSCRIPTION', isBaller: true };
  }

  return { hasAccess: true, method: 'INDIVIDUAL', isBaller: false };
}

export async function createMatchPaymentSession(
  userId: string,
  matchId: string,
  userEmail: string,
) {
  const idempotencyKey = `match-${matchId}-${userId}`;

  return stripe.checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: 'Competitive Match Entry' },
            unit_amount: MATCH_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'MATCH_PAYMENT',
        userId,
        matchId,
      },
      success_url: `${process.env.CLIENT_URL}/payment/success`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    },
    { idempotencyKey },
  );
}

export async function createBallerSubscriptionCheckout(
  userId: string,
  userEmail: string,
) {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: userEmail,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_BALLER_MONTHLY,
        quantity: 1,
      },
    ],
    metadata: {
      type: 'baller_subscription',
      userId,
    },
    subscription_data: {
      metadata: { userId },
    },
    success_url: `${process.env.CLIENT_URL}/payment/success`,
    cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
  });
}

export { MATCH_PRICE_CENTS, BALLER_MONTHLY_PRICE_CENTS };
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd server && npm test -- --testNamePattern="verifyCompetitiveAccess" 2>&1 | tail -20`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
cd server && git add src/services/payments.ts tests/integration/api.test.ts
git commit -m "feat: simplify verifyCompetitiveAccess for unified subscription model"
```

---

## Task 3: Update Stripe Webhook Handler

**Files:**
- Modify: `server/src/routes/webhooks.ts`

Remove credit-pack handling. Add new metadata type handlers: `match_entry`, `equipment_rental`, `shop_order`. Keep tournament registration. Update BallerSubscription upsert for new schema.

- [ ] **Step 1: Write failing test**

In `server/tests/integration/api.test.ts`, in the webhook test section, add a test for the new `match_entry` type. Find the existing webhook describe block and add:

```typescript
it('POST /api/webhooks/stripe - confirms match_entry on checkout.session.completed', async () => {
  // Mock constructEvent to return a match_entry event
  const mockStripe = (await import('../../src/services/stripe.js')).stripe;
  (mockStripe.webhooks.constructEvent as jest.Mock).mockReturnValueOnce({
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        metadata: { type: 'match_entry', matchEntryId: 'entry-1', userId: 'user-1' },
        payment_intent: 'pi_test_1',
        amount_total: 50,
      },
    },
  });

  prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
  prismaMock.purchase.findUnique.mockResolvedValueOnce(null); // idempotency check
  prismaMock.matchEntry.findUnique.mockResolvedValueOnce({ id: 'entry-1', status: 'pending_payment' });
  prismaMock.$transaction.mockResolvedValueOnce([{}, {}]);

  const response = await request(app)
    .post('/api/webhooks/stripe')
    .set('stripe-signature', 'valid-sig')
    .set('content-type', 'application/json')
    .send(Buffer.from('{}'));

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ received: true });
});
```

Run: `cd server && npm test -- --testNamePattern="confirms match_entry" 2>&1 | tail -20`  
Expected: FAIL (handler doesn't know about match_entry yet)

- [ ] **Step 2: Update webhooks.ts**

Replace the entire file content:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { stripe } from '../services/stripe.js';
import Stripe from 'stripe';
import { logger } from '../lib/logger.js';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (!STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

export const webhookRouter = Router();

webhookRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Webhook signature verification failed', { error: message });
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const paymentType = session.metadata?.type;
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? '';

      if (userId) {
        const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!userExists) {
          logger.error('Webhook: userId not found', { userId, paymentType });
          res.json({ received: true });
          return;
        }
      }

      if (paymentType === 'match_entry' && userId) {
        const entryId = session.metadata?.matchEntryId;
        if (!entryId) { res.json({ received: true }); return; }

        const idempotencyKey = `match-entry-${session.id}`;
        const already = await prisma.purchase.findUnique({ where: { externalTransactionId: idempotencyKey } });
        if (already) { res.json({ received: true }); return; }

        const entry = await prisma.matchEntry.findUnique({ where: { id: entryId } });
        if (!entry) { res.json({ received: true }); return; }

        await prisma.$transaction([
          prisma.purchase.create({
            data: {
              userId,
              type: 'match_entry',
              source: 'stripe',
              externalTransactionId: idempotencyKey,
              amountCents: session.amount_total ?? 50,
              metadata: { sessionId: session.id, paymentIntentId },
            },
          }),
          prisma.matchEntry.update({
            where: { id: entryId },
            data: { status: 'confirmed', purchaseId: idempotencyKey },
          }),
        ]);
        logger.info('Match entry confirmed', { userId, entryId });

      } else if (paymentType === 'equipment_rental' && userId) {
        const rentalId = session.metadata?.rentalId;
        if (!rentalId) { res.json({ received: true }); return; }

        const idempotencyKey = `rental-${session.id}`;
        const already = await prisma.purchase.findUnique({ where: { externalTransactionId: idempotencyKey } });
        if (already) { res.json({ received: true }); return; }

        await prisma.$transaction([
          prisma.purchase.create({
            data: {
              userId,
              type: 'equipment_rental',
              source: 'stripe',
              externalTransactionId: idempotencyKey,
              amountCents: session.amount_total ?? 0,
              metadata: { sessionId: session.id, paymentIntentId },
            },
          }),
          prisma.equipmentRental.update({
            where: { id: rentalId },
            data: { status: 'confirmed', purchaseId: idempotencyKey },
          }),
        ]);
        logger.info('Equipment rental confirmed', { userId, rentalId });

      } else if (paymentType === 'shop_order' && userId) {
        const orderId = session.metadata?.orderId;
        if (!orderId) { res.json({ received: true }); return; }

        const idempotencyKey = `shop-${session.id}`;
        const already = await prisma.purchase.findUnique({ where: { externalTransactionId: idempotencyKey } });
        if (already) { res.json({ received: true }); return; }

        await prisma.$transaction([
          prisma.purchase.create({
            data: {
              userId,
              type: 'shop_order',
              source: 'stripe',
              externalTransactionId: idempotencyKey,
              amountCents: session.amount_total ?? 0,
              metadata: { sessionId: session.id, paymentIntentId },
            },
          }),
          prisma.shopOrder.update({
            where: { id: orderId },
            data: { status: 'paid', purchaseId: idempotencyKey },
          }),
        ]);
        logger.info('Shop order paid', { userId, orderId });

      } else if (paymentType === 'baller_subscription' && userId) {
        // Subscription is activated via subscription lifecycle events below
        logger.info('Baller subscription checkout completed', { userId });

      } else if (paymentType === 'MATCH_PAYMENT' && userId) {
        // Legacy competitive match individual payment
        const matchId = session.metadata?.matchId;
        const idempotencyKey = `match-payment-${session.id}`;
        const already = await prisma.purchase.findUnique({ where: { externalTransactionId: idempotencyKey } });
        if (!already) {
          await prisma.purchase.create({
            data: {
              userId,
              type: 'match_entry',
              source: 'stripe',
              externalTransactionId: idempotencyKey,
              amountCents: session.amount_total ?? 50,
              metadata: { matchId, sessionId: session.id, paymentIntentId },
            },
          });

          if (matchId) {
            const match = await prisma.competitiveMatch.findUnique({ where: { id: matchId } });
            if (match) {
              const isPlayerA = match.playerAId === userId;
              await prisma.competitiveMatch.update({
                where: { id: matchId },
                data: isPlayerA
                  ? { playerAPaymentMethod: 'INDIVIDUAL', playerATransactionId: idempotencyKey }
                  : { playerBPaymentMethod: 'INDIVIDUAL', playerBTransactionId: idempotencyKey },
              });
            }
          }
        }
        logger.info('Legacy match payment processed', { userId, matchId });

      } else {
        // Tournament registration (legacy flow)
        const tournamentId = session.metadata?.tournamentId;
        if (!userId || !tournamentId) {
          logger.error('Webhook missing metadata', { userId, tournamentId });
          res.json({ received: true });
          return;
        }

        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId },
          include: { _count: { select: { registrations: true } } },
        });

        if (!tournament) {
          logger.error('Tournament not found for webhook', { tournamentId });
          res.json({ received: true });
          return;
        }

        if (tournament._count.registrations >= tournament.maxPlayers) {
          const pi = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;
          if (pi) {
            try {
              await stripe.refunds.create({ payment_intent: pi });
              logger.info('Auto-refund for full tournament', { tournamentId, userId });
            } catch (refundErr: unknown) {
              const msg = refundErr instanceof Error ? refundErr.message : 'Unknown';
              logger.error('Auto-refund failed', { tournamentId, userId, error: msg });
            }
          }
          res.json({ received: true });
          return;
        }

        const existing = await prisma.registration.findUnique({
          where: { userId_tournamentId: { userId, tournamentId } },
        });
        if (!existing) {
          await prisma.registration.create({
            data: {
              userId,
              tournamentId,
              stripeSessionId: session.id,
              stripePaymentId: paymentIntentId || null,
              paidAt: new Date(),
            },
          });
        }
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) { res.json({ received: true }); return; }

      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!userExists) { res.json({ received: true }); return; }

      const isActive = sub.status === 'active';
      const status = isActive ? 'active' : sub.status === 'canceled' ? 'cancelled' : 'expired';
      const periodEnd = new Date(sub.current_period_end * 1000);

      await prisma.$transaction([
        prisma.ballerSubscription.upsert({
          where: { userId },
          create: {
            userId,
            source: 'stripe',
            externalSubscriptionId: sub.id,
            status,
            currentPeriodEnd: periodEnd,
          },
          update: {
            status,
            currentPeriodEnd: periodEnd,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            isBaller: isActive,
            ballerExpiresAt: isActive ? periodEnd : null,
          },
        }),
      ]);
      logger.info('Baller subscription updated via Stripe', { userId, status });
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) { res.json({ received: true }); return; }

      await prisma.$transaction([
        prisma.ballerSubscription.updateMany({
          where: { userId },
          data: { status: 'cancelled' },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isBaller: false, ballerExpiresAt: null },
        }),
      ]);
      logger.info('Baller subscription cancelled via Stripe', { userId });
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd server && npm test -- --testNamePattern="confirms match_entry" 2>&1 | tail -20`  
Expected: PASS

- [ ] **Step 4: Verify build**

```bash
cd server && npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: No errors from webhooks.ts. Errors may remain in monetization.ts (fixed next).

- [ ] **Step 5: Commit**

```bash
cd server && git add src/routes/webhooks.ts
git commit -m "feat: update Stripe webhook for new payment system models"
```

---

## Task 4: RevenueCat Webhook Handler

**Files:**
- Create: `server/src/routes/webhooks/revenuecat.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write failing test**

In `server/tests/integration/api.test.ts`, add after the Stripe webhook tests:

```typescript
describe('POST /webhooks/revenuecat', () => {
  const RC_SECRET = 'test-rc-secret';
  const originalEnv = process.env.REVENUECAT_WEBHOOK_SECRET;

  beforeAll(() => { process.env.REVENUECAT_WEBHOOK_SECRET = RC_SECRET; });
  afterAll(() => { process.env.REVENUECAT_WEBHOOK_SECRET = originalEnv; });

  it('returns 401 when Authorization header is missing', async () => {
    const response = await request(app)
      .post('/webhooks/revenuecat')
      .send({ event: { type: 'INITIAL_PURCHASE' } });

    expect(response.status).toBe(401);
  });

  it('returns 401 when Authorization token is wrong', async () => {
    const response = await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', 'Bearer wrong-secret')
      .send({ event: { type: 'INITIAL_PURCHASE' } });

    expect(response.status).toBe(401);
  });

  it('handles INITIAL_PURCHASE and sets isBaller=true', async () => {
    prismaMock.ballerSubscription.upsert.mockResolvedValueOnce({});
    prismaMock.user.update.mockResolvedValueOnce({});
    prismaMock.$transaction.mockResolvedValueOnce([{}, {}]);

    const response = await request(app)
      .post('/webhooks/revenuecat')
      .set('Authorization', `Bearer ${RC_SECRET}`)
      .send({
        event: {
          type: 'INITIAL_PURCHASE',
          id: 'rc-event-1',
          app_user_id: 'user-1',
          product_id: 'baller_monthly',
          expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true });
  });
});
```

Run: `cd server && npm test -- --testNamePattern="POST /webhooks/revenuecat" 2>&1 | tail -30`  
Expected: FAIL (route doesn't exist yet)

- [ ] **Step 2: Create directory and file**

Create directory: `server/src/routes/webhooks/`

Create `server/src/routes/webhooks/revenuecat.ts`:

```typescript
import { Router, Request, Response } from 'express';
import prisma from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

export const revenuecatWebhookRouter = Router();

revenuecatWebhookRouter.post('/', async (req: Request, res: Response) => {
  // Always return 200 to RevenueCat — it retries on non-200
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!REVENUECAT_WEBHOOK_SECRET || token !== REVENUECAT_WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { event } = req.body as {
      event: {
        type: string;
        id: string;
        app_user_id: string;
        product_id: string;
        expiration_at_ms?: number;
      };
    };

    if (!event?.type || !event?.app_user_id) {
      res.json({ received: true });
      return;
    }

    const userId = event.app_user_id;

    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      logger.warn('RevenueCat webhook: user not found', { userId, eventType: event.type });
      res.json({ received: true });
      return;
    }

    if (event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL') {
      const periodEnd = event.expiration_at_ms
        ? new Date(event.expiration_at_ms)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.$transaction([
        prisma.ballerSubscription.upsert({
          where: { userId },
          create: {
            userId,
            source: 'revenuecat',
            externalSubscriptionId: `rc_${event.id}`,
            status: 'active',
            currentPeriodEnd: periodEnd,
          },
          update: {
            status: 'active',
            currentPeriodEnd: periodEnd,
          },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isBaller: true, ballerExpiresAt: periodEnd },
        }),
      ]);
      logger.info('RevenueCat subscription activated', { userId, eventType: event.type });

    } else if (event.type === 'CANCELLATION') {
      await prisma.$transaction([
        prisma.ballerSubscription.updateMany({
          where: { userId },
          data: { status: 'cancelled' },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isBaller: false, ballerExpiresAt: null },
        }),
      ]);
      logger.info('RevenueCat subscription cancelled', { userId });

    } else if (event.type === 'EXPIRATION') {
      await prisma.$transaction([
        prisma.ballerSubscription.updateMany({
          where: { userId },
          data: { status: 'expired' },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isBaller: false, ballerExpiresAt: null },
        }),
      ]);
      logger.info('RevenueCat subscription expired', { userId });
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logger.error('RevenueCat webhook processing error', { error: msg });
    // Still return 200 — RevenueCat should not retry on our internal errors
  }

  res.json({ received: true });
});
```

- [ ] **Step 3: Mount in index.ts**

In `server/src/index.ts`, add the import after the existing `webhookRouter` import:

```typescript
import { revenuecatWebhookRouter } from './routes/webhooks/revenuecat.js';
```

Add the route mount after the Stripe webhook line (before `express.json()`):

```typescript
// RevenueCat webhook — no raw body needed, just JSON
app.use('/webhooks/revenuecat', revenuecatWebhookRouter);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- --testNamePattern="POST /webhooks/revenuecat" 2>&1 | tail -30`  
Expected: PASS (3 tests pass)

- [ ] **Step 5: Verify build**

```bash
cd server && npm run build 2>&1 | grep -E "^.*error" | head -10
```

- [ ] **Step 6: Commit**

```bash
cd server && git add src/routes/webhooks/revenuecat.ts src/index.ts
git commit -m "feat: add RevenueCat webhook handler"
```

---

## Task 5: Update Monetization Router

**Files:**
- Modify: `server/src/routes/monetization.ts`

Remove credit-pack endpoints. Update balance endpoint to use new Purchase/BallerSubscription model. Keep subscribe, cancel-subscription, pay-match.

- [ ] **Step 1: Write failing test**

In `server/tests/integration/api.test.ts`, find the monetization test section and add:

```typescript
it('GET /api/monetization/balance returns isBaller and ballerExpiresAt', async () => {
  prismaMock.ballerSubscription.findUnique.mockResolvedValueOnce({
    id: 'sub-1',
    status: 'active',
    currentPeriodEnd: new Date('2026-05-01'),
    source: 'stripe',
    externalSubscriptionId: 'sub_abc',
  });
  prismaMock.competitiveMatch.count.mockResolvedValueOnce(3);

  const response = await request(app)
    .get('/api/monetization/balance')
    .set('Authorization', `Bearer ${validToken}`);

  expect(response.status).toBe(200);
  expect(response.body.isBaller).toBe(true);
  expect(response.body).not.toHaveProperty('credits');
});
```

Run: `cd server && npm test -- --testNamePattern="balance returns isBaller" 2>&1 | tail -20`  
Expected: FAIL

- [ ] **Step 2: Update monetization.ts**

Replace the entire file:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import {
  createBallerSubscriptionCheckout,
  createMatchPaymentSession,
  verifyCompetitiveAccess,
} from '../services/payments.js';
import { stripe as stripeInstance } from '../services/stripe.js';

export const monetizationRouter = Router();

// GET /balance — subscription status
monetizationRouter.get(
  '/balance',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const [subscription, recentMatchCount] = await Promise.all([
        prisma.ballerSubscription.findUnique({ where: { userId } }),
        prisma.competitiveMatch.count({
          where: {
            OR: [{ playerAId: userId }, { playerBId: userId }],
            type: 'COMPETITIVE',
            status: 'COMPLETED',
            completedAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]);

      const access = await verifyCompetitiveAccess(userId);

      res.json({
        subscription: subscription
          ? {
              status: subscription.status,
              source: subscription.source,
              currentPeriodEnd: subscription.currentPeriodEnd,
            }
          : null,
        isBaller: access.isBaller,
        competitiveMatchesThisMonth: recentMatchCount,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /subscribe — start Baller subscription (web, via Stripe)
monetizationRouter.post(
  '/subscribe',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.ballerSubscription.findUnique({
        where: { userId: req.user!.id },
      });
      if (existing && existing.status === 'active') {
        res.status(400).json({ error: 'Already subscribed to Balling Baller' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { email: true },
      });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const session = await createBallerSubscriptionCheckout(req.user!.id, user.email);
      res.json({ checkoutUrl: session.url, sessionId: session.id });
    } catch (err) {
      next(err);
    }
  },
);

// POST /cancel-subscription — cancel at period end
monetizationRouter.post(
  '/cancel-subscription',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await prisma.ballerSubscription.findUnique({
        where: { userId: req.user!.id },
      });

      if (!subscription || subscription.status !== 'active') {
        res.status(400).json({ error: 'No active subscription found' });
        return;
      }

      if (subscription.source === 'stripe') {
        await stripeInstance.subscriptions.update(subscription.externalSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
      // RevenueCat cancellation is handled via the App Store/Play Store UI

      res.json({
        message: 'Subscription will be cancelled at end of billing period',
        periodEnd: subscription.currentPeriodEnd,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /pay-match/:matchId — individual match payment (legacy competitive match flow)
monetizationRouter.post(
  '/pay-match/:matchId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { email: true },
      });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const session = await createMatchPaymentSession(req.user!.id, req.params.matchId, user.email);
      res.json({ checkoutUrl: session.url, sessionId: session.id });
    } catch (err) {
      next(err);
    }
  },
);

// GET /pricing — public pricing info
monetizationRouter.get('/pricing', (_req: Request, res: Response) => {
  res.json({
    matchPrice: 0.50,
    ballerSubscription: {
      price: 4.99,
      period: 'month',
      includes: [
        'Unlimited competitive matches',
        'Baller badge',
        'Priority matchmaking',
      ],
    },
  });
});

// GET /transactions — purchase history
monetizationRouter.get(
  '/transactions',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

      const [purchases, total] = await Promise.all([
        prisma.purchase.findMany({
          where: { userId: req.user!.id },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.purchase.count({ where: { userId: req.user!.id } }),
      ]);

      res.json({ purchases, total, page, limit });
    } catch (err) {
      next(err);
    }
  },
);
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd server && npm test -- --testNamePattern="balance returns isBaller" 2>&1 | tail -20`  
Expected: PASS

- [ ] **Step 4: Verify full test suite**

```bash
cd server && npm test 2>&1 | tail -20
```

Expected: All previously passing tests still pass.

- [ ] **Step 5: Verify build**

```bash
cd server && npm run build 2>&1 | grep "error" | head -10
```

- [ ] **Step 6: Commit**

```bash
cd server && git add src/routes/monetization.ts
git commit -m "feat: remove credit-pack endpoints, update balance for new subscription model"
```

---

## Task 6: New Payments Router

**Files:**
- Create: `server/src/routes/payments.ts`
- Modify: `server/src/index.ts`

Implements: `POST /payments/match-entry`, `/baller-subscription`, `/equipment-rental`, `/shop-order`, `/cancel-pending`.

- [ ] **Step 1: Write failing tests**

In `server/tests/integration/api.test.ts`, add:

```typescript
describe('Payments router', () => {
  it('POST /api/payments/match-entry - free for Baller users', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'user-1', email: 'test@example.com', isBaller: true });
    prismaMock.ballerSubscription.findUnique.mockResolvedValueOnce({
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 86400 * 1000),
    });
    // Match exists and is open
    prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce({ id: 'match-1', status: 'AWAITING_OPPONENT' });
    // Not already entered
    prismaMock.matchEntry.findFirst.mockResolvedValueOnce(null);
    prismaMock.matchEntry.create.mockResolvedValueOnce({ id: 'entry-1', status: 'confirmed' });

    const response = await request(app)
      .post('/api/payments/match-entry')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ match_id: 'match-1' });

    expect(response.status).toBe(200);
    expect(response.body.free).toBe(true);
    expect(response.body.success).toBe(true);
  });

  it('POST /api/payments/match-entry - redirects non-Baller to Stripe', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'user-1', email: 'test@example.com', isBaller: false });
    prismaMock.ballerSubscription.findUnique.mockResolvedValueOnce(null);
    prismaMock.competitiveMatch.findUnique.mockResolvedValueOnce({ id: 'match-1', status: 'AWAITING_OPPONENT' });
    prismaMock.matchEntry.findFirst.mockResolvedValueOnce(null);
    prismaMock.matchEntry.create.mockResolvedValueOnce({ id: 'entry-1', status: 'pending_payment' });

    const mockStripe = (await import('../../src/services/stripe.js')).stripe;
    (mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValueOnce({
      url: 'https://checkout.stripe.com/test',
      id: 'cs_test',
    });

    const response = await request(app)
      .post('/api/payments/match-entry')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ match_id: 'match-1' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('url');
  });

  it('POST /api/payments/equipment-rental - validates item enum', async () => {
    const response = await request(app)
      .post('/api/payments/equipment-rental')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ item: 'invalid_item', quantity: 1, session_date: '2026-06-01' });

    expect(response.status).toBe(400);
  });
});
```

Run: `cd server && npm test -- --testNamePattern="Payments router" 2>&1 | tail -30`  
Expected: FAIL (router doesn't exist)

- [ ] **Step 2: Create payments.ts**

Create `server/src/routes/payments.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { stripe } from '../services/stripe.js';
import { verifyCompetitiveAccess } from '../services/payments.js';
import { logger } from '../lib/logger.js';

export const paymentsRouter = Router();

const RENTAL_PRICES: Record<string, string> = {
  racket: process.env.STRIPE_PRICE_RACKET_RENTAL ?? '',
  grip_set: process.env.STRIPE_PRICE_GRIP_SET ?? '',
  ball_set: process.env.STRIPE_PRICE_BALL_SET ?? '',
};

const PRODUCT_CATALOG: Record<string, { name: string; unitPriceCents: number }> = {
  grip_overgrip: { name: 'Overgrip Pack (3)', unitPriceCents: 299 },
  ball_can: { name: 'Ball Can (3 balls)', unitPriceCents: 599 },
  wristband: { name: 'Wristband', unitPriceCents: 199 },
};

const matchEntrySchema = z.object({ match_id: z.string().min(1) });

const equipmentRentalSchema = z.object({
  item: z.enum(['racket', 'grip_set', 'ball_set']),
  quantity: z.number().int().min(1).max(5),
  session_date: z.string().datetime({ offset: true }).or(z.string().date()),
});

const shopOrderSchema = z.object({
  items: z
    .array(z.object({ product_id: z.string(), quantity: z.number().int().min(1).max(20) }))
    .min(1),
  shipping_address: z.object({
    name: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().length(2),
  }),
});

// POST /match-entry
paymentsRouter.post(
  '/match-entry',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { match_id } = matchEntrySchema.parse(req.body);
      const userId = req.user!.id;

      const match = await prisma.competitiveMatch.findUnique({ where: { id: match_id } });
      if (!match || match.status === 'COMPLETED' || match.status === 'CANCELLED') {
        res.status(400).json({ error: 'Match not available for entry' });
        return;
      }

      const alreadyEntered = await prisma.matchEntry.findFirst({
        where: { matchId: match_id, userId, status: { not: 'refunded' } },
      });
      if (alreadyEntered) {
        res.status(400).json({ error: 'Already entered this match' });
        return;
      }

      const access = await verifyCompetitiveAccess(userId);

      if (access.isBaller) {
        const entry = await prisma.matchEntry.create({
          data: { matchId: match_id, userId, status: 'confirmed' },
        });
        res.json({ success: true, free: true, entryId: entry.id });
        return;
      }

      const entry = await prisma.matchEntry.create({
        data: { matchId: match_id, userId, status: 'pending_payment' },
      });

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user?.email,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: { name: 'Competitive Match Entry' },
              unit_amount: 50,
            },
            quantity: 1,
          },
        ],
        metadata: { type: 'match_entry', matchEntryId: entry.id, userId },
        success_url: `${process.env.WEB_URL ?? process.env.CLIENT_URL}/payment/success`,
        cancel_url: `${process.env.WEB_URL ?? process.env.CLIENT_URL}/payment/cancel`,
      });

      res.json({ url: session.url });
    } catch (err) {
      next(err);
    }
  },
);

// POST /baller-subscription
paymentsRouter.post(
  '/baller-subscription',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const existing = await prisma.ballerSubscription.findUnique({ where: { userId } });
      if (existing && existing.status === 'active') {
        res.status(400).json({ error: 'Already a Baller' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        line_items: [{ price: process.env.STRIPE_PRICE_BALLER_MONTHLY, quantity: 1 }],
        metadata: { type: 'baller_subscription', userId },
        subscription_data: { metadata: { userId } },
        success_url: `${process.env.WEB_URL ?? process.env.CLIENT_URL}/payment/success`,
        cancel_url: `${process.env.WEB_URL ?? process.env.CLIENT_URL}/payment/cancel`,
      });

      res.json({ url: session.url });
    } catch (err) {
      next(err);
    }
  },
);

// POST /equipment-rental
paymentsRouter.post(
  '/equipment-rental',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { item, quantity, session_date } = equipmentRentalSchema.parse(req.body);
      const userId = req.user!.id;

      const priceId = RENTAL_PRICES[item];
      if (!priceId) {
        res.status(400).json({ error: `No price configured for ${item}` });
        return;
      }

      const rental = await prisma.equipmentRental.create({
        data: {
          userId,
          item,
          quantity,
          sessionDate: new Date(session_date),
          status: 'pending_payment',
        },
      });

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user?.email,
        line_items: [{ price: priceId, quantity }],
        metadata: { type: 'equipment_rental', rentalId: rental.id, userId },
        success_url: `${process.env.WEB_URL ?? process.env.CLIENT_URL}/payment/success`,
        cancel_url: `${process.env.WEB_URL ?? process.env.CLIENT_URL}/payment/cancel`,
      });

      res.json({ url: session.url });
    } catch (err) {
      next(err);
    }
  },
);

// POST /shop-order
paymentsRouter.post(
  '/shop-order',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items, shipping_address } = shopOrderSchema.parse(req.body);
      const userId = req.user!.id;

      const lineItems: Array<{ price_data: object; quantity: number }> = [];
      let totalCents = 0;
      const orderItems: Array<{ product_id: string; name: string; quantity: number; unit_price_cents: number }> = [];

      for (const item of items) {
        const product = PRODUCT_CATALOG[item.product_id];
        if (!product) {
          res.status(400).json({ error: `Unknown product: ${item.product_id}` });
          return;
        }
        const lineTotal = product.unitPriceCents * item.quantity;
        totalCents += lineTotal;
        orderItems.push({ product_id: item.product_id, name: product.name, quantity: item.quantity, unit_price_cents: product.unitPriceCents });
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: { name: product.name },
            unit_amount: product.unitPriceCents,
          },
          quantity: item.quantity,
        });
      }

      const order = await prisma.shopOrder.create({
        data: {
          userId,
          items: orderItems,
          totalCents,
          status: 'pending_payment',
          shippingAddress: shipping_address,
        },
      });

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user?.email,
        line_items: lineItems,
        metadata: { type: 'shop_order', orderId: order.id, userId },
        success_url: `${process.env.WEB_URL ?? process.env.CLIENT_URL}/payment/success`,
        cancel_url: `${process.env.WEB_URL ?? process.env.CLIENT_URL}/payment/cancel`,
      });

      res.json({ url: session.url });
    } catch (err) {
      next(err);
    }
  },
);

// POST /cancel-pending
paymentsRouter.post(
  '/cancel-pending',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

      const [entries, rentals] = await Promise.all([
        prisma.matchEntry.updateMany({
          where: { userId, status: 'pending_payment', createdAt: { lt: cutoff } },
          data: { status: 'refunded' },
        }),
        prisma.equipmentRental.updateMany({
          where: { userId, status: 'pending_payment', createdAt: { lt: cutoff } },
          data: { status: 'cancelled' },
        }),
      ]);

      logger.info('Cancelled pending payments', { userId, entries: entries.count, rentals: rentals.count });
      res.json({ cancelled: { matchEntries: entries.count, rentals: rentals.count } });
    } catch (err) {
      next(err);
    }
  },
);
```

- [ ] **Step 3: Mount in index.ts**

In `server/src/index.ts`, add the import:

```typescript
import { paymentsRouter } from './routes/payments.js';
```

Add rate limiting and route mounting after the other route mounts:

```typescript
// In the rate limiting section, add:
app.use('/api/payments', writeLimiter);

// In the routes section, add:
app.use('/api/payments', paymentsRouter);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npm test -- --testNamePattern="Payments router" 2>&1 | tail -30`  
Expected: PASS (3 tests)

- [ ] **Step 5: Verify build**

```bash
cd server && npm run build 2>&1 | grep "error" | head -10
```

Expected: Clean compile.

- [ ] **Step 6: Full test suite**

```bash
cd server && npm test 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
cd server && git add src/routes/payments.ts src/index.ts
git commit -m "feat: add payments router (match-entry, baller-subscription, equipment-rental, shop-order)"
```

---

## Task 7: Update auth/me + .env.example

**Files:**
- Modify: `server/src/routes/auth.ts`
- Modify: `server/.env.example`

- [ ] **Step 1: Add ballerExpiresAt to USER_SELECT in auth.ts**

Find the `USER_SELECT` constant at the top of `server/src/routes/auth.ts`:

```typescript
const USER_SELECT = {
  id: true, username: true, displayName: true, name: true, email: true,
  role: true, phone: true, avatarUrl: true, bio: true, city: true,
  location: true, dateOfBirth: true, level: true, preferredSport: true,
  authProvider: true, skillLevel: true, sports: true, wins: true,
  losses: true, matchesPlayed: true, onboardingDone: true,
  expoPushToken: true, isBaller: true, lookingForMatch: true,
  lookingForMatchSport: true, lastActiveAt: true,
  profileVisible: true, showRating: true, showMatchHistory: true,
  createdAt: true,
};
```

Add `ballerExpiresAt: true,` after `isBaller: true,`:

```typescript
const USER_SELECT = {
  id: true, username: true, displayName: true, name: true, email: true,
  role: true, phone: true, avatarUrl: true, bio: true, city: true,
  location: true, dateOfBirth: true, level: true, preferredSport: true,
  authProvider: true, skillLevel: true, sports: true, wins: true,
  losses: true, matchesPlayed: true, onboardingDone: true,
  expoPushToken: true, isBaller: true, ballerExpiresAt: true,
  lookingForMatch: true, lookingForMatchSport: true, lastActiveAt: true,
  profileVisible: true, showRating: true, showMatchHistory: true,
  createdAt: true,
};
```

- [ ] **Step 2: Update .env.example**

Add the following after the `STRIPE_WEBHOOK_SECRET` line:

```
STRIPE_PRICE_BALLER_MONTHLY=price_...
STRIPE_PRICE_RACKET_RENTAL=price_...
STRIPE_PRICE_GRIP_SET=price_...
STRIPE_PRICE_BALL_SET=price_...
REVENUECAT_WEBHOOK_SECRET=...
WEB_URL=https://balling.app
```

- [ ] **Step 3: Verify build**

```bash
cd server && npm run build 2>&1 | grep "error" | head -10
```

Expected: Clean compile.

- [ ] **Step 4: Run full test suite**

```bash
cd server && npm test 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
cd server && git add src/routes/auth.ts .env.example
git commit -m "feat: add ballerExpiresAt to /me response and new env vars to .env.example"
```

---

## Task 8: Mobile — purchases.ts (RevenueCat)

**Files:**
- Create: `mobile/src/lib/purchases.ts`
- Modify: `mobile/package.json` (add react-native-purchases)

- [ ] **Step 1: Install react-native-purchases**

```bash
cd mobile && npm install react-native-purchases
```

Expected: Package added to package.json.

- [ ] **Step 2: Create mobile/src/lib/purchases.ts**

```typescript
import Purchases, {
  type PurchasesPackage,
  type CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '';
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '';

const BALLER_OFFERING_ID = 'baller';

export function initPurchases(userId: string): void {
  const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
  if (!apiKey) return;

  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey, appUserID: userId });
}

export async function getBallerOffering(): Promise<PurchasesPackage | null> {
  try {
    const offerings = await Purchases.getOfferings();
    const offering =
      offerings.all[BALLER_OFFERING_ID] ?? offerings.current;
    return offering?.availablePackages[0] ?? null;
  } catch {
    return null;
  }
}

export async function purchaseBaller(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
```

- [ ] **Step 3: Update mobile/.env.example (or create if missing)**

Add to `mobile/.env.example` (create if it doesn't exist):

```
EXPO_PUBLIC_RC_IOS_KEY=appl_...
EXPO_PUBLIC_RC_ANDROID_KEY=goog_...
```

- [ ] **Step 4: Verify TypeScript (manual check)**

```bash
cd mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors from purchases.ts (there may be pre-existing unrelated errors — only fix new ones).

- [ ] **Step 5: Commit**

```bash
cd mobile && git add package.json package-lock.json src/lib/purchases.ts .env.example
git commit -m "feat: add RevenueCat lib for mobile Baller subscriptions"
```

---

## Task 9: Mobile — BallerPaywallScreen.tsx

**Files:**
- Create: `mobile/src/screens/BallerPaywallScreen.tsx`

- [ ] **Step 1: Create BallerPaywallScreen.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { getBallerOffering, purchaseBaller, restorePurchases } from '../lib/purchases';

// Benefits list shown above the buy button
const BENEFITS = [
  'Unlimited competitive matches',
  'Baller badge on your profile',
  'Priority matchmaking',
];

export default function BallerPaywallScreen({ navigation }: { navigation: any }) {
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    getBallerOffering()
      .then(setPkg)
      .finally(() => setLoading(false));
  }, []);

  async function handlePurchase() {
    if (!pkg) return;
    setPurchasing(true);
    try {
      await purchaseBaller(pkg);
      Alert.alert('Welcome, Baller! 🎾', 'Your subscription is now active.');
      navigation.goBack();
    } catch (err: unknown) {
      // PurchasesError has a userCancelled property
      const cancelled = (err as { userCancelled?: boolean })?.userCancelled;
      if (!cancelled) {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    try {
      await restorePurchases();
      Alert.alert('Restored', 'Your purchases have been restored.');
      navigation.goBack();
    } catch {
      Alert.alert('Restore Failed', 'Could not restore purchases. Please try again.');
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Go Baller 🎾</Text>
      <Text style={styles.subtitle}>Unlock everything for one monthly price</Text>

      <View style={styles.benefitsList}>
        {BENEFITS.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <Text style={styles.benefitCheck}>✓</Text>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      {pkg ? (
        <TouchableOpacity
          style={[styles.buyButton, purchasing && styles.buyButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buyButtonText}>
              {pkg.product.priceString} / month
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.unavailableText}>Subscription unavailable. Try again later.</Text>
      )}

      <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>

      <Text style={styles.legalNote}>
        Also available at balling.app
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d0d' },
  container: { flexGrow: 1, backgroundColor: '#0d0d0d', padding: 24, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#9ca3af', textAlign: 'center', marginBottom: 32 },
  benefitsList: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 20, marginBottom: 32 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  benefitCheck: { color: '#22c55e', fontSize: 18, marginRight: 12, fontWeight: '700' },
  benefitText: { color: '#ffffff', fontSize: 16 },
  buyButton: { backgroundColor: '#22c55e', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 16 },
  buyButtonDisabled: { opacity: 0.6 },
  buyButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  unavailableText: { color: '#9ca3af', textAlign: 'center', marginBottom: 16 },
  restoreButton: { alignItems: 'center', padding: 12, marginBottom: 16 },
  restoreText: { color: '#9ca3af', fontSize: 14, textDecorationLine: 'underline' },
  legalNote: { color: '#6b7280', fontSize: 12, textAlign: 'center' },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "BallerPaywallScreen" | head -10
```

Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/screens/BallerPaywallScreen.tsx
git commit -m "feat: add BallerPaywallScreen with RevenueCat native IAP"
```

---

## Task 10: Mobile — webPayment.ts

**Files:**
- Create: `mobile/src/lib/webPayment.ts`

expo-web-browser is already in dependencies. This thin wrapper opens a Stripe Checkout URL and detects the success/cancel return.

- [ ] **Step 1: Create mobile/src/lib/webPayment.ts**

```typescript
import * as WebBrowser from 'expo-web-browser';

const SUCCESS_PATH = '/payment/success';
const CANCEL_PATH = '/payment/cancel';

/**
 * Opens a Stripe Checkout URL in the system browser.
 * Calls onSuccess when Stripe redirects to the success URL,
 * calls onCancel when Stripe redirects to the cancel URL or the user dismisses.
 */
export async function openPaymentSheet(
  url: string,
  onSuccess: () => void,
  onCancel: () => void,
): Promise<void> {
  const result = await WebBrowser.openAuthSessionAsync(url, '');

  if (result.type === 'success' && result.url) {
    if (result.url.includes(SUCCESS_PATH)) {
      onSuccess();
    } else {
      onCancel();
    }
  } else {
    onCancel();
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd mobile && npx tsc --noEmit 2>&1 | grep "webPayment" | head -10
```

Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/lib/webPayment.ts
git commit -m "feat: add webPayment.ts expo-web-browser wrapper for Stripe Checkout"
```

---

## Verification Checklist

After all tasks are complete, run these checks:

- [ ] `cd server && npx prisma migrate dev` — runs clean, no unresolved errors
- [ ] `cd server && npm run build` — TypeScript compiles with zero errors
- [ ] `cd server && npm test` — all tests pass
- [ ] POST `/api/webhooks/stripe` with bad sig → 400
- [ ] POST `/api/webhooks/stripe` with valid sig + `match_entry` type → 200, MatchEntry confirmed
- [ ] POST `/api/webhooks/revenuecat` without `Authorization` → 401
- [ ] POST `/api/webhooks/revenuecat` with wrong secret → 401
- [ ] POST `/api/webhooks/revenuecat` with correct secret + `INITIAL_PURCHASE` → 200, isBaller=true
- [ ] POST `/api/payments/match-entry` for Baller user → `{ success: true, free: true }`
- [ ] POST `/api/payments/match-entry` for non-Baller → `{ url: "https://checkout.stripe.com/..." }`
- [ ] Duplicate webhook events (same `session.id`) → idempotent, no double-write
- [ ] GET `/api/auth/me` → response includes `ballerExpiresAt`
- [ ] Mobile: `BallerPaywallScreen` shows price string from RevenueCat offering
- [ ] Mobile: "Restore Purchases" button present and calls `restorePurchases()`
