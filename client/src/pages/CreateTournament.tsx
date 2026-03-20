import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { createTournament } from '../lib/api';
import type { Sport, TournamentFormat } from '../lib/types';

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  sport: z.enum(['PADEL', 'TENNIS', 'SQUASH'], {
    errorMap: () => ({ message: 'Please select a sport' }),
  }),
  format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN'], {
    errorMap: () => ({ message: 'Please select a format' }),
  }),
  date: z.string().min(1, 'Please select a date'),
  location: z.string().min(2, 'Location is required'),
  venue: z.string().optional(),
  maxPlayers: z.number().min(2, 'Minimum 2 players').max(128, 'Maximum 128 players'),
  entryFeeEuros: z.number().min(0, 'Entry fee cannot be negative'),
  description: z.string().optional(),
});

export default function CreateTournament() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [sport, setSport] = useState<Sport | ''>('');
  const [format, setFormat] = useState<TournamentFormat | ''>('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [venue, setVenue] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [entryFeeEuros, setEntryFeeEuros] = useState(0);
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError('');

    const result = schema.safeParse({
      name,
      sport,
      format,
      date,
      location,
      venue: venue || undefined,
      maxPlayers,
      entryFeeEuros,
      description: description || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const tournament = await createTournament({
        name,
        sport: sport as Sport,
        format: format as TournamentFormat,
        date: new Date(date).toISOString(),
        location,
        venue: venue || undefined,
        maxPlayers,
        entryFee: Math.round(entryFeeEuros * 100), // Convert euros to cents
        description: description || undefined,
      });
      navigate(`/organizer/tournament/${tournament.id}`);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to create tournament'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        Create Tournament
      </h1>

      <div className="rounded-xl bg-white p-6 shadow-md sm:p-8">
        {submitError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Tournament Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring Padel Championship"
              className={inputClass('name')}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Sport & Format row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sport" className="mb-1 block text-sm font-medium text-gray-700">
                Sport
              </label>
              <select
                id="sport"
                value={sport}
                onChange={(e) => setSport(e.target.value as Sport)}
                className={inputClass('sport')}
              >
                <option value="">Select sport...</option>
                <option value="PADEL">Padel</option>
                <option value="TENNIS">Tennis</option>
                <option value="SQUASH">Squash</option>
              </select>
              {errors.sport && <p className="mt-1 text-xs text-red-600">{errors.sport}</p>}
            </div>

            <div>
              <label htmlFor="format" className="mb-1 block text-sm font-medium text-gray-700">
                Format
              </label>
              <select
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value as TournamentFormat)}
                className={inputClass('format')}
              >
                <option value="">Select format...</option>
                <option value="SINGLE_ELIMINATION">Single Elimination</option>
                <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                <option value="ROUND_ROBIN">Round Robin</option>
              </select>
              {errors.format && <p className="mt-1 text-xs text-red-600">{errors.format}</p>}
            </div>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="mb-1 block text-sm font-medium text-gray-700">
              Date &amp; Time
            </label>
            <input
              id="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass('date')}
            />
            {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date}</p>}
          </div>

          {/* Location & Venue row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="location" className="mb-1 block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Madrid, Spain"
                className={inputClass('location')}
              />
              {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
            </div>

            <div>
              <label htmlFor="venue" className="mb-1 block text-sm font-medium text-gray-700">
                Venue <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="venue"
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Club Deportivo Central"
                className={inputClass('venue')}
              />
            </div>
          </div>

          {/* Max Players & Entry Fee row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="maxPlayers" className="mb-1 block text-sm font-medium text-gray-700">
                Max Players
              </label>
              <input
                id="maxPlayers"
                type="number"
                min={2}
                max={128}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 0)}
                className={inputClass('maxPlayers')}
              />
              {errors.maxPlayers && (
                <p className="mt-1 text-xs text-red-600">{errors.maxPlayers}</p>
              )}
            </div>

            <div>
              <label htmlFor="entryFee" className="mb-1 block text-sm font-medium text-gray-700">
                Entry Fee (EUR)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  &euro;
                </span>
                <input
                  id="entryFee"
                  type="number"
                  min={0}
                  step={0.01}
                  value={entryFeeEuros}
                  onChange={(e) => setEntryFeeEuros(parseFloat(e.target.value) || 0)}
                  className={`${inputClass('entryFeeEuros')} pl-8`}
                />
              </div>
              {errors.entryFeeEuros && (
                <p className="mt-1 text-xs text-red-600">{errors.entryFeeEuros}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700">
              Description <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Tell players about this tournament..."
              className={inputClass('description')}
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={() => navigate('/organizer')}
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create Tournament'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
