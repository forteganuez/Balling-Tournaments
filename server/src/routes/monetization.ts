import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { purchaseCreditPackSchema } from '../lib/validation.js';
import {
  createCreditPackCheckout,
  createBallerSubscriptionCheckout,
  createMatchPaymentSession,
  verifyCompetitiveAccess,
  CREDIT_PACK_PRICES,
} from '../services/payments.js';

export const monetizationRouter = Router();

// GET /balance — get user's credit balance and subscription status
monetizationRouter.get(
  '/balance',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const [creditPacks, subscription, recentMatchCount] = await Promise.all([
        prisma.creditPack.findMany({
          where: { userId, creditsRemaining: { gt: 0 } },
          orderBy: { purchasedAt: 'asc' },
        }),
        prisma.ballerSubscription.findUnique({ where: { userId } }),
        // Count competitive matches this month for smart nudges
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

      const totalCredits = creditPacks.reduce((sum, p) => sum + p.creditsRemaining, 0);

      // Smart nudge logic
      let nudge: { type: string; message: string } | null = null;
      const access = await verifyCompetitiveAccess(userId);

      if (!access.isBaller && recentMatchCount >= 10) {
        const savedAmount = ((recentMatchCount * 0.50) - 4.99).toFixed(2);
        nudge = {
          type: 'upgrade_to_baller',
          message: `You played ${recentMatchCount} competitive matches this month. With Balling Baller you would have saved €${savedAmount}`,
        };
      } else if (!access.isBaller && totalCredits === 0 && recentMatchCount >= 3) {
        nudge = {
          type: 'buy_pack',
          message: 'Save 10% with a 10-match credit pack',
        };
      }

      res.json({
        credits: {
          total: totalCredits,
          packs: creditPacks.map(p => ({
            id: p.id,
            packSize: p.packSize,
            remaining: p.creditsRemaining,
            purchasedAt: p.purchasedAt,
          })),
        },
        subscription: subscription ? {
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        } : null,
        isBaller: access.isBaller,
        competitiveMatchesThisMonth: recentMatchCount,
        nudge,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /buy-credits — purchase a credit pack
monetizationRouter.post(
  '/buy-credits',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { packSize } = purchaseCreditPackSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { email: true },
      });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const session = await createCreditPackCheckout(req.user!.id, packSize, user.email);
      res.json({ checkoutUrl: session.url, sessionId: session.id });
    } catch (err) {
      next(err);
    }
  },
);

// POST /subscribe — start Baller subscription
monetizationRouter.post(
  '/subscribe',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if already subscribed
      const existing = await prisma.ballerSubscription.findUnique({
        where: { userId: req.user!.id },
      });
      if (existing && existing.status === 'ACTIVE') {
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

// POST /cancel-subscription — cancel Baller at end of period
monetizationRouter.post(
  '/cancel-subscription',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subscription = await prisma.ballerSubscription.findUnique({
        where: { userId: req.user!.id },
      });

      if (!subscription || subscription.status !== 'ACTIVE') {
        res.status(400).json({ error: 'No active subscription found' });
        return;
      }

      // Cancel at period end in Stripe
      const { stripe: stripeInstance } = await import('../services/stripe.js');
      await stripeInstance.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await prisma.ballerSubscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });

      res.json({
        message: 'Subscription will be cancelled at end of billing period',
        periodEnd: subscription.currentPeriodEnd,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /pay-match/:matchId — individual match payment
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

// GET /transactions — transaction history
monetizationRouter.get(
  '/transactions',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: { userId: req.user!.id },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.transaction.count({ where: { userId: req.user!.id } }),
      ]);

      res.json({ transactions, total, page, limit });
    } catch (err) {
      next(err);
    }
  },
);

// GET /pricing — get pricing info (public)
monetizationRouter.get('/pricing', (_req: Request, res: Response) => {
  res.json({
    matchPrice: 0.50,
    creditPacks: [
      { size: 10, price: 4.50, perMatch: 0.45, discount: '10%' },
      { size: 25, price: 10.00, perMatch: 0.40, discount: '20%' },
      { size: 50, price: 17.50, perMatch: 0.35, discount: '30%' },
    ],
    ballerSubscription: {
      price: 4.99,
      period: 'month',
      includes: [
        'Unlimited competitive matches',
        'Advanced stats and graphs',
        'Exclusive badges',
        'Priority support',
        'Gold BALLER profile badge',
      ],
    },
  });
});
