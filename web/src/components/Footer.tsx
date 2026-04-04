import { Link, useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();
  const isEditorialShell =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/pricing';

  if (isEditorialShell) {
    return (
      <footer className="border-t border-[#ddcfbb] bg-[#f3eee5] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.28em] text-[#c4a47a]">Balling</p>
              <p className="mt-4 font-serif text-3xl leading-tight text-black sm:text-4xl">
                Software for tournaments,
                <br />
                communities, and match days.
              </p>
            </div>

            <div className="grid gap-8 text-sm text-[#5a5148] sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">Navigate</p>
                <div className="mt-3 space-y-2">
                  <div><Link to="/" className="hover:text-black">Home</Link></div>
                  <div><Link to="/tournaments" className="hover:text-black">Tournaments</Link></div>
                  <div><Link to="/pricing" className="hover:text-black">Pricing</Link></div>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">Access</p>
                <div className="mt-3 space-y-2">
                  <div><Link to="/login" className="hover:text-black">Log in</Link></div>
                  <div><Link to="/register" className="hover:text-black">Sign up</Link></div>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#c4a47a]">Location</p>
                <div className="mt-3 space-y-2">
                  <p>Groningen, Netherlands</p>
                  <p>&copy; {new Date().getFullYear()} Balling</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border bg-base py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} Balling. Built for students in Groningen.
          </p>
          <div className="flex gap-6 text-sm text-muted">
            <Link to="/pricing" className="hover:text-primary">Pricing</Link>
            <Link to="/tournaments" className="hover:text-primary">Tournaments</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
