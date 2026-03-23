import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.message || err);
  }

  if (err instanceof ZodError || err.name === 'ZodError') {
    res.status(400).json({
      error: 'Validation error',
      details: (err as ZodError).errors,
    });
    return;
  }

  // Report unexpected errors to Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
  }

  // Never leak internal error details in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(500).json({ error: message });
}
