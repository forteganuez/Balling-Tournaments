import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';
import { captureSentryException } from '../lib/sentry.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (process.env.NODE_ENV !== 'production') {
    logger.error(err.message || 'Unknown error');
  }

  // Application errors with an explicit HTTP status (e.g. thrown inside $transaction)
  if ('statusCode' in err && typeof (err as { statusCode: unknown }).statusCode === 'number') {
    const statusCode = (err as { statusCode: number }).statusCode;
    res.status(statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError || err.name === 'ZodError') {
    const zodErr = err as ZodError;
    if (process.env.NODE_ENV === 'production') {
      // Only expose field paths and generic messages, not internal schema details
      res.status(400).json({
        error: 'Validation error',
        details: zodErr.errors.map(e => ({
          path: e.path,
          message: e.message,
        })),
      });
    } else {
      res.status(400).json({
        error: 'Validation error',
        details: zodErr.errors,
      });
    }
    return;
  }

  // Report unexpected errors to Sentry
  if (process.env.SENTRY_DSN) {
    captureSentryException(err);
  }

  // Never leak internal error details in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(500).json({ error: message });
}
