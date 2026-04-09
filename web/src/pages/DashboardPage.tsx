import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const stats = [
    { label: 'Credits', value: user.credits, icon: '⚡' },
    { label: 'Matches Played', value: user.matchesPlayed, icon: '🎾' },
    { label: 'Wins', value: user.wins, icon: '🏆' },
    { label: 'Losses', value: user.losses, icon: '📉' },
  ];

  const actions = [
    {
      label: 'Find a Match',
      description: 'Coming soon',
      to: '#',
      disabled: true,
    },
    {
      label: 'Browse Tournaments',
      description: 'Join the next tournament',
      to: '/tournaments',
      disabled: false,
    },
    {
      label: 'Buy Credits',
      description: 'Top up your credit balance',
      to: '/pricing',
      disabled: false,
    },
  ];

  return (
    <div className="bg-[#f3eee5] text-[#191510]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-8 border-b border-[#ddcfbb] pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Dashboard</p>
            <h1 className="mt-6 font-serif text-5xl leading-[0.98] text-black sm:text-6xl">
              Welcome back,
              <br />
              {user.name.split(' ')[0]}.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5a5148]">
              Keep an eye on your credits, activity, and upcoming next steps from one quiet control room.
            </p>
          </div>

          <div className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">Account Status</p>
                <p className="mt-3 font-serif text-3xl text-black">
                  {user.isBaller ? 'Baller Active' : 'Standard Access'}
                </p>
              </div>
              {user.isBaller && (
                <span className="inline-flex rounded-full border border-[#ceb38f] bg-[#efe4d2] px-3 py-1 text-sm font-medium text-[#8a6838]">
                  Baller
                </span>
              )}
            </div>
            <p className="mt-4 text-sm leading-7 text-[#5a5148]">
              {user.isBaller
                ? 'Unlimited competitive play is active on your account.'
                : 'Use credits or individual payments to enter competitive play.'}
            </p>
            <p className="mt-2 text-sm text-[#7a6f63]">{user.email}</p>
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Overview</p>
              <h2 className="mt-3 font-serif text-4xl text-black">Your Stats</h2>
            </div>
            <p className="text-sm text-[#6d6358]">A quick read on your current profile activity.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6 transition hover:border-[#c4a47a]"
              >
                <div className="text-2xl">{stat.icon}</div>
                <div className="mt-5 font-serif text-4xl text-black">{stat.value}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.22em] text-[#6d6358]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Actions</p>
            <h2 className="mt-3 font-serif text-4xl text-black">Quick Actions</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {actions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={`rounded-sm border bg-[#f8f4ed] p-6 transition ${
                  action.disabled
                    ? 'cursor-not-allowed border-[#ddd2c2] opacity-60'
                    : 'border-[#d8ccb9] hover:border-[#c4a47a]'
                }`}
                onClick={action.disabled ? (event) => event.preventDefault() : undefined}
              >
                <div className="text-xs uppercase tracking-[0.22em] text-[#c4a47a]">Action</div>
                <div className="mt-4 font-serif text-3xl leading-tight text-black">{action.label}</div>
                <div className="mt-3 text-sm leading-7 text-[#5a5148]">{action.description}</div>
              </Link>
            ))}
          </div>
        </section>

        {(user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
          <section className="mb-10">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Organizer</p>
              <h2 className="mt-3 font-serif text-4xl text-black">Manage Tournaments</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                to="/tournaments/new"
                className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6 transition hover:border-[#c4a47a]"
              >
                <div className="text-xs uppercase tracking-[0.22em] text-[#c4a47a]">Create</div>
                <div className="mt-4 font-serif text-3xl leading-tight text-black">+ New Tournament</div>
                <div className="mt-3 text-sm leading-7 text-[#5a5148]">Set up brackets, entry fee, and registration.</div>
              </Link>
              <Link
                to="/organizer"
                className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6 transition hover:border-[#c4a47a]"
              >
                <div className="text-xs uppercase tracking-[0.22em] text-[#c4a47a]">Manage</div>
                <div className="mt-4 font-serif text-3xl leading-tight text-black">Organizer Dashboard</div>
                <div className="mt-3 text-sm leading-7 text-[#5a5148]">View and manage all your tournaments.</div>
              </Link>
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] px-6 py-12 lg:px-8">
            <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Activity</p>
            <h2 className="mt-4 font-serif text-4xl text-black">Recent Activity</h2>
            <p className="mt-6 text-base leading-8 text-[#5a5148]">No recent activity yet.</p>
            <p className="mt-2 text-sm leading-7 text-[#6d6358]">
              Play your first match or join a tournament to start building your timeline.
            </p>
          </div>

          <div className="rounded-sm border border-[#d8ccb9] bg-[#f8f4ed] p-6 lg:p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-[#c4a47a]">Next Steps</p>
            <h2 className="mt-4 font-serif text-4xl text-black">What to do next</h2>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-[#5a5148]">
              <li className="border-b border-[#e6dccf] pb-4">
                Explore upcoming tournaments and choose your next event.
              </li>
              <li className="border-b border-[#e6dccf] pb-4">
                Keep your credit balance ready for paid competitive entries.
              </li>
              <li>
                Come back later for a fuller history of matches, progress, and results.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
