import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { stripe } from '../services/stripe.js';
import Stripe from 'stripe';
import { logger } from '../lib/logger.js';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export const webhookRouter = Router();

// POST / — Stripe webhook handler
// Note: express.raw() is applied in index.ts for this route
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
    } catch (err: any) {
      logger.error('Webhook signature verification failed', { error: err.message });
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const paymentType = session.metadata?.type;

      if (paymentType === 'CREDIT_PACK' && userId) {
        // Credit pack purchase
        const packSize = parseInt(session.metadata?.packSize || '0');
        const paymentIntent = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || '';

        await prisma.$transaction([
          prisma.creditPack.create({
            data: {
              userId,
              packSize,
              creditsRemaining: packSize,
              pricePaid: session.amount_total || 0,
              stripeTransactionId: paymentIntent,
            },
          }),
          prisma.transaction.create({
            data: {
              userId,
              type: 'CREDIT_PURCHASE',
              amount: session.amount_total || 0,
              description: `${packSize} match credit pack purchased`,
              stripePaymentId: paymentIntent,
              idempotencyKey: `credit-purchase-${session.id}`,
            },
          }),
        ]);

        logger.info('Credit pack purchased', { userId, packSize });
      } else if (paymentType === 'MATCH_PAYMENT' && userId) {
        // Individual match payment
        const matchId = session.metadata?.matchId;
        const paymentIntent = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || '';

        const transaction = await prisma.transaction.create({
          data: {
            userId,
            type: 'MATCH_PAYMENT',
            amount: session.amount_total || 0,
            description: 'Competitive match individual payment',
            matchId: matchId || null,
            stripePaymentId: paymentIntent,
            idempotencyKey: `match-payment-${session.id}`,
          },
        });

        // Update match with payment info
        if (matchId) {
          const match = await prisma.competitiveMatch.findUnique({ where: { id: matchId } });
          if (match) {
            const isPlayerA = match.playerAId === userId;
            await prisma.competitiveMatch.update({
              where: { id: matchId },
              data: isPlayerA
                ? { playerAPaymentMethod: 'INDIVIDUAL', playerATransactionId: transaction.id }
                : { playerBPaymentMethod: 'INDIVIDUAL', playerBTransactionId: transaction.id },
            });
          }
        }

        logger.info('Match payment processed', { userId, matchId });
      } else if (paymentType === 'BALLER_SUBSCRIPTION' && userId) {
        // Subscription checkout completed — handled by subscription events below
        logger.info('Baller subscription checkout completed', { userId });
      } else {
        // Tournament registration (legacy flow)
        const tournamentId = session.metadata?.tournamentId;

        if (!userId || !tournamentId) {
          logger.error('Webhook missing metadata', { userId, tournamentId });
          res.status(400).json({ error: 'Missing metadata in checkout session' });
          return;
        }

        const tournament = await prisma.tournament.findUnique({
          where: { id: tournamentId },
          include: { _count: { select: { registrations: true } } },
        });

        if (!tournament) {
          logger.error('Tournament not found for webhook', { tournamentId });
          res.status(400).json({ error: 'Tournament not found' });
          return;
        }

        if (tournament._count.registrations >= tournament.maxPlayers) {
          logger.warn('Tournament full — payment needs refund', { tournamentId, userId });
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
              stripePaymentId:
                typeof session.payment_intent === 'string'
                  ? session.payment_intent
                  : session.payment_intent?.id || null,
              paidAt: new Date(),
            },
          });
        }
      }
    }

    // Handle subscription lifecycle events
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (userId) {
        const status = sub.status === 'active' ? 'ACTIVE'
          : sub.status === 'past_due' ? 'PAST_DUE'
          : sub.status === 'canceled' ? 'CANCELLED'
          : 'EXPIRED';

        await prisma.ballerSubscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeSubscriptionId: sub.id,
            stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
            status,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
          update: {
            status,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });

        await prisma.user.update({
          where: { id: userId },
          data: { isBaller: status === 'ACTIVE' },
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (userId) {
        await prisma.ballerSubscription.update({
          where: { userId },
          data: { status: 'EXPIRED' },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { isBaller: false },
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});
