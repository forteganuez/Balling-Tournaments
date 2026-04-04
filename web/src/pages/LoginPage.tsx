import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const inputClass =
  'w-full rounded-sm border border-[#d5c7b2] bg-[#fbf7f1] px-4 py-3 text-[#191510] outline-none transition placeholder:text-[#8f8272] focus:border-black';

export default function LoginPage() {
  const { user, isLoading, refetch } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!data.session) {
        throw new Error('Login succeeded, but no active session was returned.');
      }

      await refetch();
      navigate('/dashboard');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to log in'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-137px)] bg-[#f3eee5] text-[#191510]">
      <div className="mx-auto grid min-h-[calc(100vh-137px)] max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-0">
        <section className="flex items-center py-10 lg:py-16">
          <div className="max-w-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Welcome Back</p>
            <h1 className="mt-6 font-serif text-5xl leading-[0.98] text-black sm:text-6xl">
              Step back into
              <br />
              the bracket.
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-[#5a5148]">
              Log in to manage your registrations, follow tournament progress, and
              keep up with the student competition scene.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="border-t border-[#d7cab8] pt-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">Tournaments</p>
                <p className="mt-3 text-sm leading-7 text-[#5a5148]">
                  Browse live events, view formats, and follow the path to the final.
                </p>
              </div>
              <div className="border-t border-[#d7cab8] pt-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">Payments</p>
                <p className="mt-3 text-sm leading-7 text-[#5a5148]">
                  Secure registration for paid events, with your history and access in one place.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center py-4 lg:justify-end lg:py-16">
          <div className="w-full max-w-md rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-8 shadow-[0_24px_60px_rgba(34,25,16,0.08)] sm:p-10">
            <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">Login</p>
            <h2 className="mt-4 font-serif text-4xl text-black">Welcome back</h2>
            <p className="mt-3 text-sm leading-7 text-[#5a5148]">
              Log in to your Balling account and continue where you left off.
            </p>

            {error && (
              <div className="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#4f473e]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@student.rug.nl"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4f473e]">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-sm bg-black py-3 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-60"
              >
                {submitting ? 'Logging in…' : 'Log in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#5a5148]">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-medium text-black underline-offset-4 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
