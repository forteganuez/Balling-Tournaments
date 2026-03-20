import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMyTournaments } from '../hooks/useTournaments';
import SportIcon from '../components/SportIcon';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  REGISTRATION_OPEN: { bg: 'bg-green-100', text: 'text-green-800', label: 'Open' },
  IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Progress' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
};

export default function Dashboard() {
  const { registrations, loading, error } = useMyTournaments();

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const up: typeof registrations = [];
    const pa: typeof registrations = [];

    for (const reg of registrations) {
      if (!reg.tournament) continue;
      if (new Date(reg.tournament.date) >= now) {
        up.push(reg);
      } else {
        pa.push(reg);
      }
    }

    up.sort(
      (a, b) =>
        new Date(a.tournament!.date).getTime() -
        new Date(b.tournament!.date).getTime()
    );
    pa.sort(
      (a, b) =>
        new Date(b.tournament!.date).getTime() -
        new Date(a.tournament!.date).getTime()
    );

    return { upcoming: up, past: pa };
  }, [registrations]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">
        My Tournaments
      </h1>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {registrations.length === 0 ? (
        <div className="rounded-xl bg-white py-16 text-center shadow-md">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.27.308 6.023 6.023 0 01-2.27-.308"
            />
          </svg>
          <p className="mt-4 text-gray-500">
            You haven&apos;t joined any tournaments yet.
          </p>
          <Link
            to="/tournaments"
            className="mt-4 inline-block rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
          >
            Browse Tournaments
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Upcoming
              </h2>
              <div className="space-y-3">
                {upcoming.map((reg) => {
                  const t = reg.tournament!;
                  const st = statusStyles[t.status] ?? statusStyles.COMPLETED;
                  return (
                    <Link
                      key={reg.id}
                      to={`/tournaments/${t.id}`}
                      className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-md transition-shadow hover:shadow-lg sm:p-5"
                    >
                      <SportIcon sport={t.sport} className="text-2xl" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-gray-900">
                          {t.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(t.date)} &middot; {t.location}
                        </p>
                      </div>
                      <span
                        className={`hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${st.bg} ${st.text}`}
                      >
                        {st.label}
                      </span>
                      <svg
                        className="h-5 w-5 flex-shrink-0 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 4.5l7.5 7.5-7.5 7.5"
                        />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Past
              </h2>
              <div className="space-y-3">
                {past.map((reg) => {
                  const t = reg.tournament!;
                  const st = statusStyles[t.status] ?? statusStyles.COMPLETED;
                  return (
                    <Link
                      key={reg.id}
                      to={`/tournaments/${t.id}`}
                      className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-md transition-shadow hover:shadow-lg sm:p-5"
                    >
                      <SportIcon sport={t.sport} className="text-2xl" />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-gray-900">
                          {t.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(t.date)} &middot; {t.location}
                        </p>
                      </div>
                      <span
                        className={`hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${st.bg} ${st.text}`}
                      >
                        {st.label}
                      </span>
                      <svg
                        className="h-5 w-5 flex-shrink-0 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 4.5l7.5 7.5-7.5 7.5"
                        />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
