import 'dotenv/config';
import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { webhookRouter } from './routes/webhooks.js';
import { authRouter } from './routes/auth.js';
import { tournamentRouter, myTournamentsHandler } from './routes/tournaments.js';
import { matchRouter } from './routes/matches.js';
import { openMatchesRouter } from './routes/openMatches.js';
import { competitiveMatchRouter } from './routes/competitiveMatches.js';
import { usersRouter } from './routes/users.js';
import { uploadsRouter } from './routes/uploads.js';
import { friendsRouter } from './routes/friends.js';
import { followsRouter } from './routes/follows.js';
import { notificationsRouter } from './routes/notifications.js';
import { socialRouter } from './routes/social.js';
import { rankingRouter } from './routes/ranking.js';
import { monetizationRouter } from './routes/monetization.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './lib/logger.js';
import { authenticate } from './middleware/auth.js';
import { generalLimiter, authLimiter, writeLimiter } from './middleware/rateLimiter.js';

// ── Sentry (only in production with a DSN) ──
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
  });
}

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──
app.use(helmet());

// Stripe webhook route MUST be mounted before express.json()
// because Stripe needs the raw request body to verify signatures
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRouter);

// Standard middleware
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// ── Rate limiting ──
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);

// Write limiter on mutation-heavy routes
app.use('/api/friends', writeLimiter);
app.use('/api/follows', writeLimiter);
app.use('/api/tournaments', writeLimiter);
app.use('/api/matches', writeLimiter);
app.use('/api/open-matches', writeLimiter);
app.use('/api/competitive-matches', writeLimiter);
app.use('/api/notifications', writeLimiter);
app.use('/api/social', writeLimiter);
app.use('/api/monetization', writeLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/tournaments', tournamentRouter);
app.use('/api/matches', matchRouter);
app.use('/api/open-matches', openMatchesRouter);
app.use('/api/competitive-matches', competitiveMatchRouter);
app.use('/api/users', usersRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/follows', followsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/social', socialRouter);
app.use('/api/ranking', rankingRouter);
app.use('/api/monetization', monetizationRouter);
app.get('/api/my-tournaments', authenticate, myTournamentsHandler);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

export default app;
