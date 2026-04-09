import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const productPillars = [
  'Tournament Brackets',
  'Live Scoring',
  'Event Ticketing',
  'Social Features',
  'Club Management',
];

const products = [
  {
    label: 'Product 01',
    title: 'Tournament Brackets',
    description:
      'Single elimination, double elimination, and round robin formats with clean public views for players and organisers.',
  },
  {
    label: 'Product 02',
    title: 'Live Scoring',
    description:
      'Track match progress and results as tournaments move from registration into active competition.',
  },
  {
    label: 'Product 03',
    title: 'Secure Registration',
    description:
      'Free events stay instant. Paid events run through secure checkout and webhook-backed confirmation.',
  },
];

const steps = [
  {
    number: 'About',
    title: 'Building the future of student racket sports',
    description:
      'Balling brings together tournament discovery, registration, brackets, and event operations in one calm, usable platform.',
  },
  {
    number: 'Mission',
    title: 'Made for real communities',
    description:
      'The focus is not just on software. It is on helping clubs, organisers, and players run smoother competitions and better event days.',
  },
  {
    number: 'Approach',
    title: 'Simple where it matters',
    description:
      'The interface stays light and readable so attention stays on matches, brackets, registrations, and community.',
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="bg-[#f3eee5] text-[#191510]">
      <section
        className="relative min-h-[72vh] overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(rgba(35, 22, 10, 0.22), rgba(35, 22, 10, 0.28)), url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=80')",
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="mx-auto flex min-h-[72vh] max-w-7xl items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
          <div className="max-w-4xl text-white">
            <p className="text-sm font-medium uppercase tracking-[0.35em] text-white/85">
              Dutch Sports Platform
            </p>
            <h1 className="mt-8 font-serif text-5xl leading-[0.95] sm:text-6xl lg:text-8xl">
              Where Competition
              <br />
              Meets Community
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-white/82 sm:text-lg">
              Balling is building a calmer, stronger digital home for student padel,
              tennis, and squash. Register for tournaments, follow live brackets, and
              keep the competition moving.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={user ? '/tournaments' : '/register'}
                className="rounded-sm border border-white/60 px-8 py-3 text-center text-sm font-medium text-white transition hover:bg-white hover:text-[#191510]"
              >
                {user ? 'Explore Tournaments' : 'Get Started'}
              </Link>
              <Link
                to="/pricing"
                className="rounded-sm bg-black px-8 py-3 text-center text-sm font-medium text-white transition hover:bg-black/90"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e2d7c7] bg-[#f7f2ea]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 sm:px-8 lg:grid-cols-5 lg:px-8">
          {productPillars.map((pillar) => (
            <div
              key={pillar}
              className="text-sm font-medium uppercase tracking-[0.22em] text-[#3c362f]"
            >
              {pillar}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f7f2ea] py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">About</p>
              <h2 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.02] text-black sm:text-6xl">
                Building the Future
                <br />
                of Sports & Events
              </h2>

              <div className="mt-10 max-w-2xl space-y-7 text-lg leading-9 text-[#4f473e]">
                <p>
                  Balling is a Dutch sports platform focused on tournaments,
                  competition, and the social side of student play. We build digital
                  tools that help organisers and players move through events with less
                  friction and more clarity.
                </p>
                <p>
                  From registration and secure payment to brackets, results, and public
                  updates, the aim is to make event operations feel intuitive rather
                  than heavy. The experience should stay elegant even when the
                  tournament itself gets intense.
                </p>
                <p>
                  We believe good software should step back and let the event shine,
                  whether that moment is a registration rush, a semifinal result, or a
                  club final watched by friends on the side of the court.
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div
                className="min-h-[520px] rounded-sm border border-[#ddcfbb] bg-cover bg-center shadow-[0_24px_60px_rgba(34,25,16,0.12)]"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80')",
                }}
              />

              <div className="grid gap-6 md:grid-cols-3">
                {products.map((product) => (
                  <div key={product.title} className="border-t border-[#d8ccb9] pt-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">
                      {product.label}
                    </p>
                    <h3 className="mt-3 font-serif text-2xl text-black">{product.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#5a5148]">{product.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#e2d7c7] bg-[#f3eee5] py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-8">
          <div className="mb-14 max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Perspective</p>
            <h2 className="mt-6 font-serif text-4xl leading-tight text-black sm:text-5xl">
              Thoughtful software for organisers, clubs, and players
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="min-h-[260px] rounded-sm border border-[#ded2bf] bg-[#f8f4ed] p-8"
              >
                <p className="text-xs uppercase tracking-[0.26em] text-[#c4a47a]">{step.number}</p>
                <h3 className="mt-5 font-serif text-3xl leading-tight text-black">{step.title}</h3>
                <p className="mt-5 text-base leading-8 text-[#5a5148]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#e2d7c7] bg-[#efe6d7] py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-sm border border-[#d5c7b2] bg-[#f7f2ea] px-6 py-12 sm:px-10 sm:py-14">
            <div className="max-w-3xl text-center sm:text-left">
              <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">
                Ready To Play
              </p>
              <h2 className="mt-6 font-serif text-4xl leading-tight text-black sm:text-5xl">
                Bring your next tournament online with a calmer, clearer experience.
              </h2>
              <p className="mt-5 text-base leading-8 text-[#5a5148]">
                Explore upcoming events, manage registrations, and keep participants
                close to the action from sign-up to final result.
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to={user ? '/tournaments' : '/register'}
                className="rounded-sm bg-black px-8 py-3 text-center text-sm font-medium text-white transition hover:bg-black/90"
              >
                {user ? 'Explore Events' : 'Create Account'}
              </Link>
              <Link
                to="/tournaments"
                className="rounded-sm border border-black/20 px-8 py-3 text-center text-sm font-medium text-black transition hover:border-black"
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
