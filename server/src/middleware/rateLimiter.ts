import type { NextFunction, Request, Response } from 'express';

interface LimiterOptions {
  windowMs: number;
  max: number;
  message: { error: string };
}

interface CounterEntry {
  count: number;
  resetAt: number;
}

function createRateLimiter({ windowMs, max, message }: LimiterOptions) {
  const counters = new Map<string, CounterEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const existing = counters.get(key);

    let entry: CounterEntry;
    if (!existing || existing.resetAt <= now) {
      entry = { count: 1, resetAt: now + windowMs };
      counters.set(key, entry);
    } else {
      existing.count += 1;
      entry = existing;
    }

    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));
      res.status(429).json(message);
      return;
    }

    next();
  };
}

/**
 * General API rate limiter: 100 requests per minute per IP.
 */
export const generalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});

/**
 * Strict limiter for auth endpoints: 10 attempts per 15 minutes per IP.
 * Prevents brute-force login/register attacks.
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

/**
 * Write limiter for mutation endpoints: 30 per minute per IP.
 * Prevents spam (chat messages, friend requests, etc.)
 */
export const writeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please slow down.' },
});
