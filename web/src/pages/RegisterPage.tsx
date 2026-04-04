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

      await refetch();
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
