import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../lib/prisma.js';
import { registerSchema, loginSchema, profileUpdateSchema, socialAuthSchema } from '../lib/validation.js';
import { authenticate } from '../middleware/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, `${SERVER_URL}/api/auth/google/callback`);

export const authRouter = Router();

const USER_SELECT = {
  id: true, name: true, email: true, role: true, phone: true,
  avatarUrl: true, bio: true, city: true, dateOfBirth: true,
  level: true, preferredSport: true, authProvider: true,
  skillLevel: true, sports: true, wins: true, losses: true,
  matchesPlayed: true, onboardingDone: true, expoPushToken: true,
  createdAt: true,
};

function setCookie(res: Response, token: string): void {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
  });
}

function signToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

// POST /register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
      },
    });

    const token = signToken(user);
    setCookie(res, token);

    const profile = await prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });
    res.status(201).json({ user: profile, token });
  } catch (err) {
    next(err);
  }
});

// POST /login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken(user);
    setCookie(res, token);

    const profile = await prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });
    res.json({ user: profile, token });
  } catch (err) {
    next(err);
  }
});

interface PendingOAuthEntry {
  redirectUri: string | null;
  token: string | null;
}

// Temporary store for OAuth state → token mapping
const pendingOAuth = new Map<string, PendingOAuthEntry>();

function appendParamsToUrl(
  target: string,
  params: Record<string, string>,
): string {
  const url = new URL(target);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

// GET /google/start — redirect user to Google consent screen
authRouter.get('/google/start', (req: Request, res: Response) => {
  const state = req.query.state as string || '';
  const appRedirectUri =
    typeof req.query.redirect_uri === 'string' && req.query.redirect_uri
      ? req.query.redirect_uri
      : null;
  const googleCallbackUri = `${SERVER_URL}/api/auth/google/callback`;
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'profile', 'email'],
    redirect_uri: googleCallbackUri,
    state,
  });
  if (state) {
    pendingOAuth.set(state, { token: null, redirectUri: appRedirectUri });
    // Clean up after 5 minutes
    setTimeout(() => pendingOAuth.delete(state), 5 * 60 * 1000);
  }
  res.redirect(url);
});

// GET /google/callback — Google redirects here with auth code
authRouter.get('/google/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const pending = state ? pendingOAuth.get(state) : null;
    const providerError = typeof req.query.error === 'string' ? req.query.error : '';

    if (providerError) {
      if (pending?.redirectUri) {
        res.redirect(appendParamsToUrl(pending.redirectUri, { state, error: providerError }));
        return;
      }

      res.status(400).send('Google sign in was cancelled or failed.');
      return;
    }

    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    const redirectUri = `${SERVER_URL}/api/auth/google/callback`;
    const { tokens } = await googleClient.getToken({ code, redirect_uri: redirectUri });

    if (!tokens.id_token) {
      res.status(401).json({ error: 'Failed to get ID token from Google' });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { authProvider: 'GOOGLE', providerId: payload.sub },
          { email: payload.email },
        ],
      },
    });

    if (user) {
      if (user.authProvider === 'LOCAL') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { authProvider: 'GOOGLE', providerId: payload.sub, avatarUrl: user.avatarUrl || payload.picture },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          name: payload.name || payload.email.split('@')[0],
          email: payload.email,
          authProvider: 'GOOGLE',
          providerId: payload.sub,
          avatarUrl: payload.picture,
        },
      });
    }

    const token = signToken(user);

    // Store token for polling, keyed by state
    if (state && pending) {
      pendingOAuth.set(state, { ...pending, token });

      if (pending.redirectUri) {
        res.redirect(appendParamsToUrl(pending.redirectUri, { state, provider: 'google' }));
        return;
      }
    }

    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="font-family:sans-serif;text-align:center;padding:60px 20px;"><h2>Signed in!</h2><p>Return to the Balling app.</p></body></html>`);
  } catch (err) {
    next(err);
  }
});

// GET /google/poll — mobile app polls for the token
authRouter.get('/google/poll', (req: Request, res: Response) => {
  const state = req.query.state as string;
  if (!state || !pendingOAuth.has(state)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const entry = pendingOAuth.get(state);
  const token = entry?.token;
  if (token) {
    pendingOAuth.delete(state);
    res.json({ token });
  } else {
    res.json({ token: null });
  }
});

// POST /google — sign in with Google ID token (kept for direct token flow)
authRouter.post('/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = socialAuthSchema.parse(req.body);

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { authProvider: 'GOOGLE', providerId: payload.sub },
          { email: payload.email },
        ],
      },
    });

    if (user) {
      if (user.authProvider === 'LOCAL') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { authProvider: 'GOOGLE', providerId: payload.sub, avatarUrl: user.avatarUrl || payload.picture },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          name: payload.name || payload.email.split('@')[0],
          email: payload.email,
          authProvider: 'GOOGLE',
          providerId: payload.sub,
          avatarUrl: payload.picture,
        },
      });
    }

    const token = signToken(user);
    setCookie(res, token);

    const profile = await prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });
    res.json({ user: profile, token });
  } catch (err) {
    next(err);
  }
});

// POST /apple — sign in with Apple identity token
authRouter.post('/apple', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken, name, email: appleEmail } = req.body;

    if (!idToken) {
      res.status(400).json({ error: 'idToken is required' });
      return;
    }

    // Decode Apple identity token (JWT) to get sub and email
    const decoded = jwt.decode(idToken) as { sub?: string; email?: string } | null;
    if (!decoded || !decoded.sub) {
      res.status(401).json({ error: 'Invalid Apple token' });
      return;
    }

    const email = decoded.email || appleEmail;
    if (!email) {
      res.status(400).json({ error: 'Email is required for Apple sign in' });
      return;
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { authProvider: 'APPLE', providerId: decoded.sub },
          { email },
        ],
      },
    });

    if (user) {
      if (user.authProvider === 'LOCAL') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { authProvider: 'APPLE', providerId: decoded.sub },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          name: name || email.split('@')[0],
          email,
          authProvider: 'APPLE',
          providerId: decoded.sub,
        },
      });
    }

    const token = signToken(user);
    setCookie(res, token);

    const profile = await prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });
    res.json({ user: profile, token });
  } catch (err) {
    next(err);
  }
});

// POST /microsoft — sign in with Microsoft access token
authRouter.post('/microsoft', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      res.status(400).json({ error: 'accessToken is required' });
      return;
    }

    // Fetch user profile from Microsoft Graph
    const msResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!msResponse.ok) {
      res.status(401).json({ error: 'Invalid Microsoft token' });
      return;
    }

    const msProfile = await msResponse.json() as {
      id: string;
      displayName?: string;
      mail?: string;
      userPrincipalName?: string;
    };

    const email = msProfile.mail || msProfile.userPrincipalName;
    if (!email) {
      res.status(400).json({ error: 'Could not retrieve email from Microsoft' });
      return;
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { authProvider: 'MICROSOFT', providerId: msProfile.id },
          { email },
        ],
      },
    });

    if (user) {
      if (user.authProvider === 'LOCAL') {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { authProvider: 'MICROSOFT', providerId: msProfile.id },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          name: msProfile.displayName || email.split('@')[0],
          email,
          authProvider: 'MICROSOFT',
          providerId: msProfile.id,
        },
      });
    }

    const token = signToken(user);
    setCookie(res, token);

    const profile = await prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });
    res.json({ user: profile, token });
  } catch (err) {
    next(err);
  }
});

// POST /logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// GET /me
authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: USER_SELECT,
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PUT /profile
authRouter.put('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = profileUpdateSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
        ...(data.level !== undefined && { level: data.level }),
        ...(data.preferredSport !== undefined && { preferredSport: data.preferredSport }),
        ...(data.skillLevel !== undefined && { skillLevel: data.skillLevel }),
        ...(data.sports !== undefined && { sports: data.sports }),
        ...(data.onboardingDone !== undefined && { onboardingDone: data.onboardingDone }),
        ...(data.expoPushToken !== undefined && { expoPushToken: data.expoPushToken }),
      },
      select: USER_SELECT,
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});
