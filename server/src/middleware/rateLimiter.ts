import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter: 100 requests per minute per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/**
 * Strict limiter for auth endpoints: 10 attempts per 15 minutes per IP.
 * Prevents brute-force login/register attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

/**
 * Write limiter for mutation endpoints: 30 per minute per IP.
 * Prevents spam (chat messages, friend requests, etc.)
 */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
