import prisma from '../lib/prisma.js';
import { stripe } from './stripe.js';
import type { CompetitiveMatch } from '@prisma/client';
import crypto from 'crypto';

const MATCH_PRICE_CENTS = 50; // €0.50
const CREDIT_PACK_PRICES: Record<number, number> = {
  10: 450,   // €4.50
  25: 1000,  // €10.00
  50: 1750,  // €17.50
};
const BALLER_MONTHLY_PRICE_CENTS = 499; // €4.99

interface AccessResult {
  hasAccess: boolean;
  method: 'CREDIT' | 'INDIVIDUAL' | 'BALLER_SUBSCRIPTION' | 'NONE';
  creditBalance: number;
  isBaller: boolean;
  creditPackId?: string;
}

export async function verifyCompetitiveAccess(userId: string): Promise<AccessResult> {
  // Check Baller subscription first (real-time against Stripe)
  const subscription = await prisma.ballerSubscription.findUnique({
    where: { userId },
  });

  if (subscription && subscription.status === 'ACTIVE') {
    // Verify against Stripe in real-time
    try {
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      if (stripeSub.status === 'active') {
        return {
          hasAccess: true,
          method: 'BALLER_SUBSCRIPTION',
          creditBalance: 0,
          isBaller: true,
        };
      }
      // Subscription no longer active in Stripe — update local record
      await prisma.ballerSubscription.update({
        where: { id: subscription.id },
        data: { status: stripeSub.status === 'past_due' ? 'PAST_DUE' : 'EXPIRED' },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { isBaller: false },
      });
    } catch {
      // If Stripe call fails, fall through to credits
    }
  }

  // Check credit packs (oldest first)
  const creditPack = await prisma.creditPack.findFirst({
    where: {
      userId,
      creditsRemaining: { gt: 0 },
    },
    orderBy: { purchasedAt: 'asc' },
  });

  const totalCredits = await prisma.creditPack.aggregate({
    where: { userId, creditsRemaining: { gt: 0 } },
    _sum: { creditsRemaining: true },
  });
  const creditBalance = totalCredits._sum.creditsRemaining || 0;

  if (creditPack) {
    return {
      hasAccess: true,
      method: 'CREDIT',
      creditBalance,
      isBaller: false,
      creditPackId: creditPack.id,
    };
  }

  // No access — needs individual payment
  return {
    hasAccess: false,
    method: 'NONE',
    creditBalance: 0,
    isBaller: false,
  };
}

export async function deductCredit(userId: string, creditPackId: string) {
  const idempotencyKey = `credit-deduct-${creditPackId}-${Date.now()}-${crypto.randomUUID()}`;

  const [pack, transaction] = await prisma.$transaction([
    prisma.creditPack.update({
      where: { id: creditPackId },
      data: { creditsRemaining: { decrement: 1 } },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type: 'CREDIT_CONSUMPTION',
        amount: 0, // No monetary charge, credit already purchased
        description: 'Competitive match credit used',
        creditPackId,
        idempotencyKey,
      },
    }),
  ]);

  return { pack, transactionId: transaction.id };
}

export async function createMatchPaymentSession(
  userId: string,
  matchId: string,
  userEmail: string,
) {
  const idempotencyKey = `match-payment-${matchId}-${userId}`;
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
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
    metadata: { matchId, userId, type: 'MATCH_PAYMENT' },
    customer_email: userEmail,
    success_url: `${CLIENT_URL}/matches/${matchId}?payment=success`,
    cancel_url: `${CLIENT_URL}/matches/${matchId}?payment=cancelled`,
  }, { idempotencyKey });

  return session;
}

export async function createCreditPackCheckout(
  userId: string,
  packSize: number,
  userEmail: string,
) {
  const price = CREDIT_PACK_PRICES[packSize];
  if (!price) throw new Error('Invalid pack size');

  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
  const idempotencyKey = `credit-pack-${userId}-${packSize}-${Date.now()}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: `${packSize} Match Credit Pack` },
          unit_amount: price,
        },
        quantity: 1,
      },
    ],
    metadata: { userId, packSize: String(packSize), type: 'CREDIT_PACK' },
    customer_email: userEmail,
    success_url: `${CLIENT_URL}/profile?purchase=success`,
    cancel_url: `${CLIENT_URL}/profile?purchase=cancelled`,
  }, { idempotencyKey });

  return session;
}

export async function createBallerSubscriptionCheckout(userId: string, userEmail: string) {
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

  // Create or get Stripe customer
  const existingSub = await prisma.ballerSubscription.findUnique({ where: { userId } });
  let customerId: string;

  if (existingSub?.stripeCustomerId) {
    customerId = existingSub.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  // Create a Stripe Price for the subscription (or use a pre-created one)
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: 'Balling Baller Subscription' },
          unit_amount: BALLER_MONTHLY_PRICE_CENTS,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    metadata: { userId, type: 'BALLER_SUBSCRIPTION' },
    success_url: `${CLIENT_URL}/profile?subscription=success`,
    cancel_url: `${CLIENT_URL}/profile?subscription=cancelled`,
  });

  return session;
}

export async function refundMatchPayments(match: CompetitiveMatch) {
  const refunds: Promise<unknown>[] = [];

  // Refund player A
  if (match.playerAPaymentMethod === 'CREDIT' && match.playerACreditId) {
    refunds.push(
      prisma.creditPack.update({
        where: { id: match.playerACreditId },
        data: { creditsRemaining: { increment: 1 } },
      })
    );
    refunds.push(
      prisma.transaction.create({
        data: {
          userId: match.playerAId,
          type: 'REFUND',
          amount: 0,
          description: 'Credit refunded due to disputed/cancelled match',
          matchId: match.id,
          creditPackId: match.playerACreditId,
        },
      })
    );
  } else if (match.playerAPaymentMethod === 'INDIVIDUAL' && match.playerATransactionId) {
    // Stripe refund for individual payment
    const tx = await prisma.transaction.findUnique({ where: { id: match.playerATransactionId } });
    if (tx?.stripePaymentId) {
      try {
        await stripe.refunds.create({ payment_intent: tx.stripePaymentId });
      } catch {
        // Log but don't fail the match flow
      }
    }
    refunds.push(
      prisma.transaction.create({
        data: {
          userId: match.playerAId,
          type: 'REFUND',
          amount: -MATCH_PRICE_CENTS,
          description: 'Match payment refunded',
          matchId: match.id,
        },
      })
    );
  }

  // Refund player B
  if (match.playerBId) {
    if (match.playerBPaymentMethod === 'CREDIT' && match.playerBCreditId) {
      refunds.push(
        prisma.creditPack.update({
          where: { id: match.playerBCreditId },
          data: { creditsRemaining: { increment: 1 } },
        })
      );
      refunds.push(
        prisma.transaction.create({
          data: {
            userId: match.playerBId,
            type: 'REFUND',
            amount: 0,
            description: 'Credit refunded due to disputed/cancelled match',
            matchId: match.id,
            creditPackId: match.playerBCreditId,
          },
        })
      );
    } else if (match.playerBPaymentMethod === 'INDIVIDUAL' && match.playerBTransactionId) {
      const tx = await prisma.transaction.findUnique({ where: { id: match.playerBTransactionId } });
      if (tx?.stripePaymentId) {
        try {
          await stripe.refunds.create({ payment_intent: tx.stripePaymentId });
        } catch {
          // Log but don't fail
        }
      }
      refunds.push(
        prisma.transaction.create({
          data: {
            userId: match.playerBId,
            type: 'REFUND',
            amount: -MATCH_PRICE_CENTS,
            description: 'Match payment refunded',
            matchId: match.id,
          },
        })
      );
    }
  }

  await Promise.all(refunds);
}

export { MATCH_PRICE_CENTS, CREDIT_PACK_PRICES, BALLER_MONTHLY_PRICE_CENTS };
