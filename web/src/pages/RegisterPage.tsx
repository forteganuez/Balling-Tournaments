import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const inputClass =
  'w-full rounded-sm border border-[#d5c7b2] bg-[#fbf7f1] px-4 py-3 text-[#191510] outline-none transition placeholder:text-[#8f8272] focus:border-black';

export default function RegisterPage() {
  const { user, isLoading, refetch } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const setField =
    (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          data: {
            name: result.data.name,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!data.session) {
        throw new Error(
          'Account created. Please check your email to confirm your account before logging in.'
        );
      }

      await refetch(data.session.access_token);
      navigate('/dashboard');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to create account'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-137px)] bg-[#f3eee5] text-[#191510]">
      <div className="mx-auto grid min-h-[calc(100vh-137px)] max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-0">
        <section className="flex items-center py-10 lg:py-16">
          <div className="max-w-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Join Balling</p>
            <h1 className="mt-6 font-serif text-5xl leading-[0.98] text-black sm:text-6xl">
              Create an account
              <br />
              for the next match.
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-[#5a5148]">
              Join the Groningen racket sports community and keep tournaments,
              registrations, and live brackets close at hand.
            </p>

            <div className="mt-10 space-y-5">
              <div className="border-t border-[#d7cab8] pt-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">For Players</p>
                <p className="mt-3 text-sm leading-7 text-[#5a5148]">
                  Discover events, sign up quickly, and follow progress from registration to final result.
                </p>
              </div>
              <div className="border-t border-[#d7cab8] pt-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">For Organisers</p>
                <p className="mt-3 text-sm leading-7 text-[#5a5148]">
                  Share your tournaments with a cleaner public presence and a simpler participant flow.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center py-4 lg:justify-end lg:py-16">
          <div className="w-full max-w-lg rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-8 shadow-[0_24px_60px_rgba(34,25,16,0.08)] sm:p-10">
            <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">Register</p>
            <h2 className="mt-4 font-serif text-4xl text-black">Create your account</h2>
            <p className="mt-3 text-sm leading-7 text-[#5a5148]">
              Join Balling and start exploring upcoming student tournaments.
            </p>

            {error && (
              <div className="mt-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-4">
              {(
                [
                  {
                    key: 'name',
                    label: 'Full Name',
                    type: 'text',
                    placeholder: 'Your name',
                  },
                  {
                    key: 'email',
                    label: 'Email',
                    type: 'email',
                    placeholder: 'you@student.rug.nl',
                  },
                  {
                    key: 'password',
                    label: 'Password',
                    type: 'password',
                    placeholder: '••••••••',
                  },
                  {
                    key: 'confirmPassword',
                    label: 'Confirm Password',
                    type: 'password',
                    placeholder: '••••••••',
                  },
                ] as const
              ).map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="mb-2 block text-sm font-medium text-[#4f473e]">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={setField(key)}
                    placeholder={placeholder}
                    className={inputClass}
                    required
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-sm bg-black py-3 text-sm font-medium text-white transition hover:bg-black/90 disabled:opacity-60"
              >
                {submitting ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-[#d8ccb9]" />
                <span className="mx-4 text-xs uppercase tracking-[0.2em] text-[#8f8272]">or</span>
                <div className="flex-1 border-t border-[#d8ccb9]" />
              </div>
              <button
                type="button"
                onClick={() => void supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } })}
                className="mt-4 flex w-full items-center justify-center gap-3 rounded-sm border border-[#d5c7b2] bg-white py-3 text-sm font-medium text-[#191510] transition hover:bg-[#f8f4ed]"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-[#5a5148]">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-black underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
