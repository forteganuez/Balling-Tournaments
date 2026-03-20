import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { stripe } from '../services/stripe.js';
import Stripe from 'stripe';

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
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId;
      const tournamentId = session.metadata?.tournamentId;

      if (!userId || !tournamentId) {
        console.error('Webhook missing metadata:', { userId, tournamentId });
        res.status(400).json({ error: 'Missing metadata in checkout session' });
        return;
      }

      // Check if tournament is full before creating registration
      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { _count: { select: { registrations: true } } },
      });

      if (!tournament) {
        console.error('Tournament not found for webhook:', tournamentId);
        res.status(400).json({ error: 'Tournament not found' });
        return;
      }

      if (tournament._count.registrations >= tournament.maxPlayers) {
        console.warn(
          `Tournament ${tournamentId} is full. Payment from user ${userId} needs refund.`
        );
        // In production, you would initiate a refund here
        res.json({ received: true });
        return;
      }

      // Check if registration already exists (idempotency)
      const existing = await prisma.registration.findUnique({
        where: {
          userId_tournamentId: { userId, tournamentId },
        },
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

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});
