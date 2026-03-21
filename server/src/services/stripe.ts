import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

interface CheckoutParams {
  tournamentId: string;
  tournamentName: string;
  entryFee: number;
  userId: string;
  userEmail: string;
}

export async function createCheckoutSession(params: CheckoutParams) {
  const { tournamentId, tournamentName, entryFee, userId, userEmail } = params;

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
