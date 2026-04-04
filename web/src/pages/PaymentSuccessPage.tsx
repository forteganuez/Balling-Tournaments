import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { BalanceResponse } from '../lib/types';

export default function PaymentSuccessPage() {
  const { refetch } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const reload = async () => {
      try {
        const res = await api.get<BalanceResponse>('/api/monetization/balance');
        setCredits(res.data.credits.total);
        await refetch();
      } catch {
        // non-fatal — page still shows success
      }
    };
    void reload();
  }, [refetch]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-6xl">🎾</div>
        <h1 className="mb-3 text-3xl font-bold text-primary">Payment successful!</h1>
        <p className="mb-2 text-muted">Your account has been updated.</p>
        {credits !== null && (
          <p className="mb-8 text-lg font-semibold text-accent">⚡ {credits} credits available</p>
        )}
        <Link
          to="/dashboard"
          className="inline-block rounded-lg bg-accent px-8 py-3 font-semibold text-white hover:bg-green-600"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
