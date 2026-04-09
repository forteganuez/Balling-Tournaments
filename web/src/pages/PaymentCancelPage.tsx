import { Link } from 'react-router-dom';

export default function PaymentCancelPage() {
  return (
    <div className="bg-[#f3eee5] text-[#191510] flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-6xl">❌</div>
        <h1 className="mb-3 text-3xl font-bold text-black">Payment cancelled</h1>
        <p className="mb-8 text-[#5a5148]">No charges were made. You can try again whenever you&apos;re ready.</p>
        <Link
          to="/pricing"
          className="inline-block rounded-sm bg-black px-8 py-3 font-semibold text-white hover:bg-black/90"
        >
          Back to Pricing
        </Link>
      </div>
    </div>
  );
}
