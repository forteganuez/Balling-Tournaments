import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { api } from '../api/client';
import type { Tournament } from '../lib/types';

const createSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  sport: z.enum(['PADEL', 'TENNIS', 'SQUASH']),
  format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']),
  date: z.string().min(1, 'Date is required'),
  location: z.string().min(2, 'Location is required'),
  venue: z.string().optional(),
  maxPlayers: z.coerce.number().min(4).max(128),
  entryFeeEuros: z.coerce.number().min(0),
  description: z.string().optional(),
});

// Keep form state as strings; Zod coerce handles conversion at submit time
interface FormState {
  name: string;
  sport: 'PADEL' | 'TENNIS' | 'SQUASH';
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN';
  date: string;
  location: string;
  venue: string;
  maxPlayers: string;
  entryFeeEuros: string;
  description: string;
}

const inputClass =
  'w-full rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] px-4 py-3 text-black placeholder-[#6d6358] outline-none focus:border-[#c4a47a]';
const labelClass = 'mb-1.5 block text-sm font-medium text-[#6d6358]';
const selectClass =
  'w-full rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] px-4 py-3 text-black outline-none focus:border-[#c4a47a]';

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    name: '', sport: 'PADEL', format: 'SINGLE_ELIMINATION',
    date: '', location: '', venue: '', maxPlayers: '16',
    entryFeeEuros: '0', description: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = createSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    const { entryFeeEuros, venue, description, ...rest } = result.data;

    setSubmitting(true);
    try {
      const res = await api.post<Tournament>('/api/tournaments', {
        ...rest,
        entryFee: Math.round(entryFeeEuros * 100), // convert to cents
        venue: venue || undefined,
        description: description || undefined,
      });
      navigate(`/tournaments/${res.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f3eee5] text-[#191510] mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link to="/organizer" className="mb-6 inline-flex items-center gap-1 text-sm text-[#6d6358] hover:text-black">
        ← Back to Organizer Dashboard
      </Link>
      <h1 className="mb-8 text-2xl font-bold text-black">Create Tournament</h1>

      {error && (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div>
          <label className={labelClass}>Tournament Name</label>
          <input type="text" value={form.name} onChange={set('name')} placeholder="Spring Padel Championship" className={inputClass} required />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Sport</label>
            <select value={form.sport} onChange={set('sport')} className={selectClass}>
              <option value="PADEL">Padel</option>
              <option value="TENNIS">Tennis</option>
              <option value="SQUASH">Squash</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Format</label>
            <select value={form.format} onChange={set('format')} className={selectClass}>
              <option value="SINGLE_ELIMINATION">Single Elimination</option>
              <option value="DOUBLE_ELIMINATION">Double Elimination</option>
              <option value="ROUND_ROBIN">Round Robin</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Date &amp; Time</label>
          <input type="datetime-local" value={form.date} onChange={set('date')} className={inputClass} required />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Location (City)</label>
            <input type="text" value={form.location} onChange={set('location')} placeholder="Groningen" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Venue (optional)</label>
            <input type="text" value={form.venue} onChange={set('venue')} placeholder="Padel Park Noord" className={inputClass} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Max Players</label>
            <input type="number" value={form.maxPlayers} onChange={set('maxPlayers')} min={4} max={128} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Entry Fee (€, 0 = free)</label>
            <input type="number" value={form.entryFeeEuros} onChange={set('entryFeeEuros')} min={0} step={0.01} className={inputClass} required />
          </div>
        </div>

        <div>
          <label className={labelClass}>Description (optional)</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            placeholder="Tell players what to expect…"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-sm bg-black py-3 font-semibold text-white hover:bg-black/90 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create Tournament'}
        </button>
      </form>
    </div>
  );
}
