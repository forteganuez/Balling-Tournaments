import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { profileUpdateSchema } from '../lib/validation.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();

const USER_SELECT = {
  id: true, username: true, displayName: true, name: true, email: true,
  role: true, phone: true, avatarUrl: true, bio: true, city: true,
  location: true, dateOfBirth: true, level: true, preferredSport: true,
  authProvider: true, skillLevel: true, sports: true, wins: true,
  losses: true, matchesPlayed: true, onboardingDone: true,
  expoPushToken: true, isBaller: true, lookingForMatch: true,
  lookingForMatchSport: true, lastActiveAt: true,
  profileVisible: true, showRating: true, showMatchHistory: true,
  createdAt: true,
};

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

// GET /check-username/:username — real-time uniqueness check
authRouter.get('/check-username/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username.toLowerCase();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      res.json({ available: false, reason: 'Invalid format' });
      return;
    }

    const { RESERVED_USERNAMES } = await import('../lib/validation.js');
    if (RESERVED_USERNAMES.includes(username)) {
      res.json({ available: false, reason: 'Reserved username' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    res.json({ available: !existing });
  } catch (err) {
    next(err);
  }
});

// PUT /profile
authRouter.put('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = profileUpdateSchema.parse(req.body);

    // Handle username change with 90-day restriction
    if (data.username !== undefined) {
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { username: true, usernameChangedAt: true },
      });

      if (currentUser?.usernameChangedAt && currentUser?.username) {
        const daysSinceChange = (Date.now() - currentUser.usernameChangedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceChange < 90) {
          const daysRemaining = Math.ceil(90 - daysSinceChange);
          res.status(400).json({ error: `You can change your username again in ${daysRemaining} days` });
          return;
        }
      }

      const usernameLower = data.username.toLowerCase();
      if (usernameLower !== currentUser?.username) {
        const existing = await prisma.user.findUnique({ where: { username: usernameLower } });
        if (existing) {
          res.status(409).json({ error: 'Username already taken' });
          return;
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.username !== undefined && {
          username: data.username.toLowerCase(),
          usernameChangedAt: new Date(),
        }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
        ...(data.level !== undefined && { level: data.level }),
        ...(data.preferredSport !== undefined && { preferredSport: data.preferredSport }),
        ...(data.skillLevel !== undefined && { skillLevel: data.skillLevel }),
        ...(data.sports !== undefined && { sports: data.sports }),
        ...(data.onboardingDone !== undefined && { onboardingDone: data.onboardingDone }),
        ...(data.expoPushToken !== undefined && { expoPushToken: data.expoPushToken }),
        ...(data.lookingForMatch !== undefined && { lookingForMatch: data.lookingForMatch }),
        ...(data.lookingForMatchSport !== undefined && { lookingForMatchSport: data.lookingForMatchSport }),
        ...(data.profileVisible !== undefined && { profileVisible: data.profileVisible }),
        ...(data.showRating !== undefined && { showRating: data.showRating }),
        ...(data.showMatchHistory !== undefined && { showMatchHistory: data.showMatchHistory }),
        lastActiveAt: new Date(),
      },
      select: USER_SELECT,
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});
