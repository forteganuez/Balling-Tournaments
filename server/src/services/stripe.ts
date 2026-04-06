import type Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PLACEHOLDER_VALUE_PATTERN = /placeholder/i;

let stripeClientPromise: Promise<Stripe> | null = null;

function hasUsableStripeSecretKey() {
  return Boolean(
    STRIPE_SECRET_KEY.trim() &&
    !PLACEHOLDER_VALUE_PATTERN.test(STRIPE_SECRET_KEY),
  );
}

function getNodeMajorVersion() {
  const [major] = process.versions.node.split('.');
  return Number(major) || 0;
}

export function isStripeConfigured() {
  return hasUsableStripeSecretKey();
}

export async function getStripe(): Promise<Stripe> {
  if (!hasUsableStripeSecretKey()) {
    throw new Error(
      'Stripe is not configured. Set a real STRIPE_SECRET_KEY in server/.env to enable payment routes.',
    );
  }

  if (getNodeMajorVersion() >= 25) {
    throw new Error(
      `Stripe runtime is disabled on Node ${process.versions.node}. Use Node 22 or 24 for payment flows.`,
    );
  }

  if (!stripeClientPromise) {
    stripeClientPromise = import('stripe').then(
      ({ default: StripeClient }) =>
        new StripeClient(STRIPE_SECRET_KEY, {
          apiVersion: '2025-02-24.acacia',
        }),
    );
  }

  return stripeClientPromise;
}

interface CheckoutParams {
  tournamentId: string;
  tournamentName: string;
  entryFee: number;
  userId: string;
  userEmail: string;
}

export async function createCheckoutSession(params: CheckoutParams) {
  const { tournamentId, tournamentName, entryFee, userId, userEmail } = params;
  const stripe = await getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${tournamentName} - Entry Fee`,
          },
          unit_amount: entryFee,
        },
        quantity: 1,
      },
    ],
    metadata: {
      tournamentId,
      userId,
    },
    customer_email: userEmail,
    success_url: `${CLIENT_URL}/tournaments/${tournamentId}?payment=success`,
    cancel_url: `${CLIENT_URL}/tournaments/${tournamentId}?payment=cancelled`,
  });

  return session;
}
