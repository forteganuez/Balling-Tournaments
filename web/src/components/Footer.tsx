import { Link } from 'react-router-dom';

export default function Footer() {
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
