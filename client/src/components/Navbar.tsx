import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuthContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `transition-colors ${
      isActive(path)
        ? 'text-primary-400 font-semibold'
        : 'text-gray-300 hover:text-white'
    }`;

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight"
            onClick={() => setMobileOpen(false)}
          >
            <span className="text-2xl">🏆</span>
            <span>Balling</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 md:flex">
            <Link to="/tournaments" className={linkClass('/tournaments')}>
              Tournaments
            </Link>

            {user && (
              <Link to="/dashboard" className={linkClass('/dashboard')}>
                My Tournaments
              </Link>
            )}

            {user &&
              (user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
                <Link to="/organizer" className={linkClass('/organizer')}>
                  Organizer
                </Link>
              )}

            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="border-t border-slate-700 bg-slate-900 md:hidden">
          <div className="space-y-1 px-4 py-4">
            <Link
              to="/tournaments"
              className={`block rounded-lg px-3 py-2 ${linkClass('/tournaments')}`}
              onClick={() => setMobileOpen(false)}
            >
              Tournaments
            </Link>

            {user && (
              <Link
                to="/dashboard"
                className={`block rounded-lg px-3 py-2 ${linkClass('/dashboard')}`}
                onClick={() => setMobileOpen(false)}
              >
                My Tournaments
              </Link>
            )}

            {user &&
              (user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
                <Link
                  to="/organizer"
                  className={`block rounded-lg px-3 py-2 ${linkClass('/organizer')}`}
                  onClick={() => setMobileOpen(false)}
                >
                  Organizer
                </Link>
              )}

            <div className="mt-4 border-t border-slate-700 pt-4">
              {user ? (
                <div className="space-y-2">
                  <p className="px-3 text-sm text-gray-400">
                    Signed in as{' '}
                    <span className="font-medium text-white">
                      {user.name}
                    </span>
                  </p>
                  <button
                    onClick={handleLogout}
                    className="w-full rounded-lg border border-gray-600 px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-gray-800"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/login"
                    className="rounded-lg border border-gray-600 px-3 py-2 text-center text-sm text-gray-300 transition-colors hover:bg-gray-800"
                    onClick={() => setMobileOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-lg bg-primary-500 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-600"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
