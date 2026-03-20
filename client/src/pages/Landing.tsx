import { Link } from 'react-router-dom';
import { useTournaments } from '../hooks/useTournaments';
import TournamentCard from '../components/TournamentCard';

const sports = [
  { emoji: '\u{1F3D3}', label: 'Padel' },
  { emoji: '\u{1F3BE}', label: 'Tennis' },
  { emoji: '\u{1F3F8}', label: 'Squash' },
];

export default function Landing() {
  const { tournaments, loading } = useTournaments({
    status: 'REGISTRATION_OPEN',
  });

  const upcoming = tournaments.slice(0, 6);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Join Local Racket Sports{' '}
            <span className="text-primary-400">Tournaments</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-300 sm:text-xl">
            Compete in padel, tennis, and squash tournaments in your city.
            Register, pay, and track your matches — all in one place.
          </p>

          {/* Sport pills */}
          <div className="mt-8 flex items-center justify-center gap-4">
            {sports.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-700/60 px-4 py-2 text-sm font-medium text-gray-200"
              >
                <span className="text-lg">{s.emoji}</span>
                {s.label}
              </span>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/tournaments"
              className="rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-primary-600"
            >
              Browse Tournaments
            </Link>
            <Link
              to="/register"
              className="rounded-lg border border-gray-500 bg-white/10 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/20"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Tournaments */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Upcoming Tournaments
          </h2>
          <Link
            to="/tournaments"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View All &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-xl bg-gray-200"
              />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="rounded-xl bg-white py-16 text-center shadow-md">
            <p className="text-gray-500">
              No upcoming tournaments right now. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">
            How It Works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Find a Tournament',
                desc: 'Browse tournaments by sport, location, and date.',
              },
              {
                step: '2',
                title: 'Register & Pay',
                desc: 'Secure your spot with easy online payment via Stripe.',
              },
              {
                step: '3',
                title: 'Compete & Win',
                desc: 'Track brackets, scores, and climb the leaderboard.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
