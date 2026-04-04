import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const isEditorialShell =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/pricing';

  const navClass = isEditorialShell
    ? 'sticky top-0 z-50 border-b border-[#c8b498] bg-[#d6c1a0]/95 backdrop-blur-sm'
    : 'sticky top-0 z-50 border-b border-border bg-base/90 backdrop-blur-sm';

  const navLinkClass = ({ isActive }: { isActive: boolean }) => {
    if (isEditorialShell) {
      return `text-sm font-medium transition-colors ${
        isActive ? 'text-black' : 'text-black/70 hover:text-black'
      }`;
    }

    return `text-sm font-medium transition-colors ${
      isActive ? 'text-accent' : 'text-muted hover:text-primary'
    }`;
  };

  const logoClass = isEditorialShell
    ? 'flex items-center gap-1.5 text-xl font-bold text-black'
    : 'flex items-center gap-1.5 text-xl font-bold text-primary';

  const logoBadgeClass = isEditorialShell
    ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs text-[#d6c1a0]'
    : 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white';

  const creditsClass = isEditorialShell
    ? 'hidden items-center gap-1.5 rounded-full border border-black/10 bg-white/40 px-3 py-1 text-sm font-medium text-black sm:flex'
    : 'hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium sm:flex';

  const accountButtonClass = isEditorialShell
    ? 'flex items-center gap-2 rounded-lg border border-black/10 bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90'
    : 'flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-primary hover:border-accent';

  const dropdownClass = isEditorialShell
    ? 'absolute right-0 mt-2 w-40 rounded-lg border border-black/10 bg-[#efe4d2] shadow-xl'
    : 'absolute right-0 mt-2 w-40 rounded-lg border border-border bg-surface shadow-xl';

  const loginClass = isEditorialShell
    ? 'rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-black hover:border-black'
    : 'rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary hover:border-accent';

  const signupClass = isEditorialShell
    ? 'rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-black/90'
    : 'rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-green-600';

  return (
    <nav className={navClass}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className={logoClass}>
          Ball
          <span className={logoBadgeClass}>
            i
          </span>
          ng
        </Link>

        {/* Nav links */}
        <div className={`hidden items-center sm:flex ${isEditorialShell ? 'gap-8' : 'gap-6'}`}>
          <NavLink to="/" end className={navLinkClass}>
            {isEditorialShell ? 'About' : 'Home'}
          </NavLink>
          <NavLink to="/tournaments" className={navLinkClass}>
            {isEditorialShell ? 'Products' : 'Tournaments'}
          </NavLink>
          <NavLink to="/pricing" className={navLinkClass}>
            Pricing
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={navLinkClass}>
              {isEditorialShell ? 'Account' : 'Dashboard'}
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
              <span className={creditsClass}>
                <span className={isEditorialShell ? 'text-black' : 'text-accent'}>⚡</span>
                {user.credits} credits
              </span>

              {/* Account dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className={accountButtonClass}
                >
                  {user.name.split(' ')[0]}
                  <svg
                    className={`h-4 w-4 ${isEditorialShell ? 'text-white/70' : 'text-muted'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className={dropdownClass}>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        void logout();
                      }}
                      className={`block w-full px-4 py-2.5 text-left text-sm ${
                        isEditorialShell ? 'text-black/70 hover:text-black' : 'text-muted hover:text-primary'
                      }`}
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
                className={loginClass}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className={signupClass}
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
