import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { updateUserRoleSchema } from '../lib/validation.js';

export const usersRouter = Router();

const publicUserSearchSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  city: true,
  skillLevel: true,
  sports: true,
} as const;

// GET /search?q= — search users by name
usersRouter.get(
  '/search',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string) || '';

      const users = await prisma.user.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
        },
        select: publicUserSearchSelect,
        take: 20,
      });

      res.json(users);
    } catch (err) {
      next(err);
    }
  }
);

// GET /admin/search?q= — admin user search for role management
usersRouter.get(
  '/admin/search',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

      const users = await prisma.user.findMany({
        where: q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
              ],
            }
          : undefined,
        select: {
          ...publicUserSearchSelect,
          role: true,
          createdAt: true,
        },
        orderBy: [{ role: 'desc' }, { createdAt: 'desc' }],
        take: 25,
      });

      res.json(users);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /:id/role — admin updates a user's role
usersRouter.put(
  '/:id/role',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateUserRoleSchema.parse(req.body);

      if (req.params.id === req.user!.id && data.role !== 'ADMIN') {
        res.status(400).json({ error: 'Admins cannot remove their own admin access from the app.' });
        return;
      }

      const existingUser = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });

      if (!existingUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data: { role: data.role },
        select: {
          ...publicUserSearchSelect,
          role: true,
          createdAt: true,
        },
      });

      res.json(updatedUser);
    } catch (err) {
      next(err);
    }
  },
);

// GET /:id — get public profile
usersRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
          city: true,
          skillLevel: true,
          sports: true,
          wins: true,
          losses: true,
          matchesPlayed: true,
          level: true,
          preferredSport: true,
          createdAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /profile — update own profile
usersRouter.put(
  '/profile',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        bio,
        skillLevel,
        city,
        avatarUrl,
        sports,
        phone,
        level,
        preferredSport,
        onboardingDone,
        expoPushToken,
      } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          ...(name !== undefined && { name }),
          ...(bio !== undefined && { bio }),
          ...(skillLevel !== undefined && { skillLevel }),
          ...(city !== undefined && { city }),
          ...(avatarUrl !== undefined && { avatarUrl }),
          ...(sports !== undefined && { sports }),
          ...(phone !== undefined && { phone }),
          ...(level !== undefined && { level }),
          ...(preferredSport !== undefined && { preferredSport }),
          ...(onboardingDone !== undefined && { onboardingDone }),
          ...(expoPushToken !== undefined && { expoPushToken }),
        },
      });

      res.json(updatedUser);
    } catch (err) {
      next(err);
    }
  }
);

// GET /:id/stats — get user stats
usersRouter.get(
  '/:id/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          wins: true,
          losses: true,
          matchesPlayed: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const tournamentCount = await prisma.registration.count({
        where: { userId: req.params.id },
      });

      res.json({
        wins: user.wins,
        losses: user.losses,
        matchesPlayed: user.matchesPlayed,
        tournamentCount,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /:id/tournaments — get user tournament registrations
usersRouter.get(
  '/:id/tournaments',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registrations = await prisma.registration.findMany({
        where: { userId: req.params.id },
        include: { tournament: true },
        orderBy: { tournament: { date: 'desc' } },
      });

      res.json(registrations);
    } catch (err) {
      next(err);
    }
  }
);
