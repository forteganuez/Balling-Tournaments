import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-accent' : 'text-muted hover:text-primary'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-base/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 text-xl font-bold text-primary">
          Ball
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white">
            i
          </span>
          ng
        </Link>

        {/* Nav links */}
        <div className="hidden items-center gap-6 sm:flex">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/tournaments" className={navLinkClass}>
            Tournaments
          </NavLink>
          <NavLink to="/pricing" className={navLinkClass}>
            Pricing
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
          )}
          {user?.role === 'ORGANIZER' && (
            <NavLink to="/organizer" className={navLinkClass}>
              Organizer
            </NavLink>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Credits pill */}
              <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium sm:flex">
                <span className="text-accent">⚡</span>
                {user.credits} credits
              </span>

              {/* Account dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-primary hover:border-accent"
                >
                  {user.name.split(' ')[0]}
                  <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-surface shadow-xl">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        void logout();
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-muted hover:text-primary"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary hover:border-accent"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
