import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface CheckoutResponse {
  checkoutUrl: string;
}

const creditPacks = [
  { packSize: 10, label: 'Starter', credits: 10, price: '€4.50', popular: false },
  { packSize: 25, label: 'Popular', credits: 25, price: '€10', popular: true },
  { packSize: 50, label: 'Best Value', credits: 50, price: '€17.50', popular: false },
] as const;

const ballerBenefits = [
  'Unlimited competitive matches',
  'Baller badge on your profile',
  'Priority matchmaking',
];

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCreditPurchase = async (packSize: 10 | 25 | 50) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoadingKey(`credits_${packSize}`);
    setError('');

    try {
      const response = await api.post<CheckoutResponse>('/api/monetization/buy-credits', {
        packSize,
      });
      window.location.href = response.data.checkoutUrl;
    } catch (purchaseError) {
      setError(
        purchaseError instanceof Error
          ? purchaseError.message
          : 'Payment failed. Please try again.'
      );
      setLoadingKey(null);
    }
  };

  const handleBallerSubscribe = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoadingKey('baller');
    setError('');

    try {
      const response = await api.post<CheckoutResponse>('/api/monetization/subscribe');
      window.location.href = response.data.checkoutUrl;
    } catch (subscribeError) {
      setError(
        subscribeError instanceof Error
          ? subscribeError.message
          : 'Payment failed. Please try again.'
      );
      setLoadingKey(null);
    }
  };

  return (
    <div className="bg-[#f3eee5] text-[#191510]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="mb-12 border-b border-[#ddcfbb] pb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Pricing</p>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <h1 className="font-serif text-5xl leading-[0.96] text-black sm:text-6xl">
                Get credits,
                <br />
                or go Baller.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5a5148]">
                Credits let you join competitive matches on your own rhythm.
                Balling Baller unlocks unlimited competitive play with a cleaner,
                faster route back onto the court.
              </p>
            </div>

            <div className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">At a glance</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[#5a5148]">
                <p>Competitive match entry starts with credits or Baller access.</p>
                <p>Secure checkout redirects are handled by Stripe via the backend.</p>
                <p>Your account updates after payment and webhook confirmation.</p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-8 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mb-14">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Credit Packs</p>
            <h2 className="mt-3 font-serif text-4xl text-black">Play on your own schedule</h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {creditPacks.map((pack) => {
              const key = `credits_${pack.packSize}`;
              const isLoading = loadingKey === key;

              return (
                <div
                  key={pack.packSize}
                  className={`relative rounded-sm border bg-[#f8f4ed] p-7 transition ${
                    pack.popular ? 'border-[#b99763]' : 'border-[#d8ccb9]'
                  }`}
                >
                  {pack.popular && (
                    <div className="absolute -top-3 left-6">
                      <span className="rounded-full border border-[#b99763] bg-[#efe4d2] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#8a6838]">
                        Popular
                      </span>
                    </div>
                  )}

                  <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">{pack.label}</p>
                  <div className="mt-6 font-serif text-5xl text-black">{pack.credits}</div>
                  <p className="mt-2 text-sm text-[#6d6358]">credits for competitive play</p>
                  <p className="mt-8 font-serif text-4xl text-black">{pack.price}</p>
                  <p className="mt-2 text-sm text-[#6d6358]">
                    {pack.packSize === 10
                      ? 'A simple starting point.'
                      : pack.packSize === 25
                        ? 'The most balanced option for active players.'
                        : 'Best suited for frequent competitors.'}
                  </p>

                  <button
                    onClick={() => void handleCreditPurchase(pack.packSize)}
                    disabled={isLoading}
                    className={`mt-8 w-full rounded-sm py-3 text-sm font-medium transition disabled:opacity-60 ${
                      pack.popular
                        ? 'bg-black text-white hover:bg-black/90'
                        : 'border border-[#d0c2ad] text-black hover:border-black'
                    }`}
                  >
                    {isLoading ? 'Redirecting…' : `Buy ${pack.credits} Credits`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Subscription</p>
            <h2 className="mt-3 font-serif text-4xl text-black">Balling Baller</h2>
          </div>

          <div className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-8">
            {user?.isBaller ? (
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">Membership Active</p>
                  <h3 className="mt-4 font-serif text-4xl text-black">You’re already Baller.</h3>
                  <p className="mt-4 text-base leading-8 text-[#5a5148]">
                    Unlimited competitive play is active on your account.
                  </p>
                  {user.ballerExpiresAt && (
                    <p className="mt-3 text-sm text-[#6d6358]">
                      Active until{' '}
                      {new Date(user.ballerExpiresAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                <div className="rounded-sm border border-[#e6dccf] bg-[#fbf7f1] p-6">
                  <ul className="space-y-3 text-sm leading-7 text-[#5a5148]">
                    {ballerBenefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3">
                        <span className="mt-1 text-[#8a6838]">✦</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">Unlimited Access</p>
                  <h3 className="mt-4 font-serif text-4xl text-black">Play without counting credits.</h3>
                  <p className="mt-4 text-base leading-8 text-[#5a5148]">
                    Balling Baller is for players who want the simplest route into
                    competitive play every month.
                  </p>
                  <div className="mt-8 flex items-end gap-2">
                    <span className="font-serif text-5xl text-black">€4.99</span>
                    <span className="pb-2 text-sm text-[#6d6358]">/ month</span>
                  </div>
                </div>

                <div className="rounded-sm border border-[#e6dccf] bg-[#fbf7f1] p-6">
                  <ul className="space-y-3 text-sm leading-7 text-[#5a5148]">
                    {ballerBenefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3">
                        <span className="mt-1 text-[#8a6838]">✦</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => void handleBallerSubscribe()}
                    disabled={loadingKey === 'baller'}
                    className="mt-8 w-full rounded-sm bg-black py-3 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-60"
                  >
                    {loadingKey === 'baller' ? 'Redirecting…' : 'Go Baller'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
