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
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export const authRouter = Router();

const USER_SELECT = {
  id: true, name: true, email: true, role: true, phone: true,
  avatarUrl: true, bio: true, city: true, dateOfBirth: true,
  level: true, preferredSport: true, authProvider: true,
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

// POST /google — sign in with Google ID token
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
      },
      select: USER_SELECT,
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});
