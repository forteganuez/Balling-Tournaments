import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { webhookRouter } from './routes/webhooks.js';
import { authRouter } from './routes/auth.js';
import { tournamentRouter, myTournamentsHandler } from './routes/tournaments.js';
import { matchRouter } from './routes/matches.js';
import { openMatchesRouter } from './routes/openMatches.js';
import { usersRouter } from './routes/users.js';
import { uploadsRouter } from './routes/uploads.js';
import { friendsRouter } from './routes/friends.js';
import { followsRouter } from './routes/follows.js';
import { notificationsRouter } from './routes/notifications.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe webhook route MUST be mounted before express.json()
// because Stripe needs the raw request body to verify signatures
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookRouter);

// Standard middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/tournaments', tournamentRouter);
app.use('/api/matches', matchRouter);
app.use('/api/open-matches', openMatchesRouter);
app.use('/api/users', usersRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/follows', followsRouter);
app.use('/api/notifications', notificationsRouter);
app.get('/api/my-tournaments', authenticate, myTournamentsHandler);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
