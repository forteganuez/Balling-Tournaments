import { Link } from 'react-router-dom';

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-6xl">❌</div>
        <h1 className="mb-3 text-3xl font-bold text-primary">Payment cancelled</h1>
        <p className="mb-8 text-muted">No charges were made. You can try again whenever you&apos;re ready.</p>
        <Link
          to="/pricing"
          className="inline-block rounded-lg bg-accent px-8 py-3 font-semibold text-white hover:bg-green-600"
        >
          Back to Pricing
        </Link>
      </div>
    </div>
  );
}
