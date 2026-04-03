import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const highlights = [
  'Padel, tennis, and squash in one place',
  'Live brackets and real-time results',
  'Built for students competing in Groningen',
];

const features = [
  {
    icon: '🎾',
    title: 'Tournament Play',
    description:
      'Browse student tournaments, register in minutes, and follow every round from first serve to final.',
  },
  {
    icon: '📈',
    title: 'Competitive Progress',
    description:
      'Track your wins, match history, and momentum as you compete across racket sports.',
  },
  {
    icon: '💳',
    title: 'Smooth Entry Flow',
    description:
      'Paid entries go through secure checkout, while free events stay frictionless and instant.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Create your account',
    description:
      'Sign up, set your profile, and get ready to join the local student competition scene.',
  },
  {
    number: '02',
    title: 'Find the right tournament',
    description:
      'Filter by sport, browse formats, and choose events that match your schedule and level.',
  },
  {
    number: '03',
    title: 'Play and follow the bracket',
    description:
      'Register, compete, and keep up with standings, matches, and the road to the final.',
  },
];

const sports = ['PADEL', 'TENNIS', 'SQUASH'];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.02),_transparent)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <div className="mb-6 flex flex-wrap gap-2">
              {sports.map((sport) => (
                <span
                  key={sport}
                  className="rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-muted"
                >
                  {sport}
                </span>
              ))}
            </div>

            <h1 className="text-4xl font-extrabold leading-tight text-primary sm:text-5xl lg:text-6xl">
              Student racket sports,
              <br />
              <span className="text-accent">organised end to end.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Balling helps players discover local tournaments, register online, and
              follow every match and bracket in real time. One platform, built for
              competitive student play.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to={user ? '/tournaments' : '/register'}
                className="rounded-xl bg-accent px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-green-600"
              >
                {user ? 'Browse Tournaments' : 'Create Your Account'}
              </Link>
              <Link
                to="/pricing"
                className="rounded-xl border border-border bg-surface/70 px-6 py-3.5 text-center text-sm font-semibold text-primary transition hover:border-accent"
              >
                See Pricing
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border bg-surface/60 px-4 py-4 text-sm text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:justify-self-end">
            <div className="rounded-3xl border border-border bg-surface/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur">
              <div className="rounded-2xl border border-border bg-base p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                      Live Tournament
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-primary">
                      Groningen Spring Open
                    </h2>
                  </div>
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                    Registration Open
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surface px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Format</p>
                    <p className="mt-2 text-base font-semibold text-primary">
                      Single Elimination
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Entry</p>
                    <p className="mt-2 text-base font-semibold text-primary">€10.00</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">Players</p>
                    <p className="mt-2 text-base font-semibold text-primary">16 spots</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">City</p>
                    <p className="mt-2 text-base font-semibold text-primary">Groningen</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-border bg-[linear-gradient(135deg,_rgba(34,197,94,0.12),_rgba(255,255,255,0.03))] p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    Why players use Balling
                  </p>
                  <ul className="mt-3 space-y-3 text-sm text-primary">
                    <li>Secure checkout for paid entry</li>
                    <li>Clear brackets and match progress</li>
                    <li>One place for discovery, registration, and follow-up</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Core Features
            </p>
            <h2 className="mt-3 text-3xl font-bold text-primary">
              Everything around tournament play, kept simple
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-border bg-surface p-6 transition hover:border-accent/60"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-base text-2xl">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-primary">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                How It Works
              </p>
              <h2 className="mt-3 text-3xl font-bold text-primary">
                From sign-up to final round
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-muted">
              The flow is designed to keep registration light for players and easy to
              manage for organisers.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="rounded-3xl border border-border bg-surface p-6">
                <p className="text-sm font-bold tracking-[0.2em] text-accent">{step.number}</p>
                <h3 className="mt-6 text-xl font-semibold text-primary">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-border bg-[linear-gradient(135deg,_rgba(34,197,94,0.14),_rgba(26,26,26,1))] px-6 py-10 sm:px-10 sm:py-12">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                Ready To Play
              </p>
              <h2 className="mt-3 text-3xl font-bold text-primary sm:text-4xl">
                Join the student competition scene in Groningen.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted">
                Start with upcoming tournaments, follow the bracket live, and keep your
                match history in one place.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                to={user ? '/tournaments' : '/register'}
                className="rounded-xl bg-accent px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-green-600"
              >
                {user ? 'Explore Events' : 'Sign Up Free'}
              </Link>
              <Link
                to="/tournaments"
                className="rounded-xl border border-border bg-base/70 px-6 py-3.5 text-center text-sm font-semibold text-primary transition hover:border-accent"
              >
                View Tournaments
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
