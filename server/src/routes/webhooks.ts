import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { getStripe, isStripeConfigured } from '../services/stripe.js';
import { CREDIT_PACK_PRICES } from '../services/payments.js';
import type Stripe from 'stripe';
import { logger } from '../lib/logger.js';

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export const webhookRouter = Router();

// POST / — Stripe webhook handler
// Note: express.raw() is applied in index.ts for this route
webhookRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isStripeConfigured() || !STRIPE_WEBHOOK_SECRET || /placeholder/i.test(STRIPE_WEBHOOK_SECRET)) {
      res.status(503).json({ error: 'Stripe webhooks are not configured in this environment' });
      return;
    }

    const stripe = await getStripe();
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
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    // Idempotency: check if this event was already processed before any side effects
    const alreadyProcessed = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });
    if (alreadyProcessed) {
      logger.info('Webhook event already processed — skipping', { eventId: event.id, type: event.type });
      res.json({ received: true });
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const paymentType = session.metadata?.type;

      // Verify the userId from metadata actually exists in our database
      if (userId) {
        const userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!userExists) {
          logger.error('Webhook userId not found in database', { userId, paymentType });
          res.status(400).json({ error: 'Invalid user' });
          return;
        }
      }

      if (paymentType === 'CREDIT_PACK' && userId) {
        // Credit pack purchase
        const packSize = parseInt(session.metadata?.packSize || '0');
        const expectedPrice = CREDIT_PACK_PRICES[packSize];

        if (!expectedPrice) {
          logger.error('Invalid pack size in webhook metadata', { packSize, userId });
          res.status(400).json({ error: 'Invalid pack size' });
          return;
        }

        if ((session.amount_total || 0) !== expectedPrice) {
          logger.error('Payment amount mismatch', {
            packSize,
            expectedPrice,
            receivedAmount: session.amount_total,
            userId,
          });
          res.status(400).json({ error: 'Payment amount verification failed' });
          return;
        }

        const paymentIntent = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || '';

        await prisma.$transaction([
          prisma.creditPack.create({
            data: {
              userId,
              packSize,
              creditsRemaining: packSize,
              pricePaid: expectedPrice,
              stripeTransactionId: paymentIntent,
            },
          }),
          prisma.transaction.create({
            data: {
              userId,
              type: 'CREDIT_PURCHASE',
              amount: expectedPrice,
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
          // Auto-refund: user paid but tournament filled before webhook arrived
          const pi = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;
          if (pi) {
            try {
              await stripe.refunds.create({ payment_intent: pi });
              logger.info('Auto-refund issued for full tournament', { tournamentId, userId, paymentIntent: pi });
            } catch (refundErr: any) {
              logger.error('Failed to auto-refund full tournament payment', {
                tournamentId, userId, paymentIntent: pi, error: refundErr.message,
              });
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
      if (userId && await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })) {
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
      if (userId && await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })) {
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

    // Record event as processed (idempotency guard)
    await prisma.webhookEvent.create({
      data: { stripeEventId: event.id, type: event.type },
    });

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});
