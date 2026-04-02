import { useState, useEffect } from 'react';

interface Props {
  targetDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-surface text-xl font-bold text-primary sm:h-16 sm:w-16 sm:text-2xl">
        {String(value).padStart(2, '0')}
      </div>
      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
    </div>
  );
}

export default function Countdown({ targetDate }: Props) {
  const target = new Date(targetDate);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    calcTimeLeft(target)
  );

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft(new Date(targetDate))), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!timeLeft) {
    const isPast = new Date(targetDate).getTime() < Date.now() - 24 * 60 * 60 * 1000;
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-3 text-center text-sm font-medium text-muted">
        {isPast ? 'Tournament completed' : 'Tournament has started!'}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <TimeUnit value={timeLeft.days} label="Days" />
      <span className="text-2xl font-bold text-muted">:</span>
      <TimeUnit value={timeLeft.hours} label="Hours" />
      <span className="text-2xl font-bold text-muted">:</span>
      <TimeUnit value={timeLeft.minutes} label="Min" />
      <span className="text-2xl font-bold text-muted">:</span>
      <TimeUnit value={timeLeft.seconds} label="Sec" />
    </div>
  );
}
