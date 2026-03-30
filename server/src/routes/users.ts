import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { updateUserRoleSchema } from '../lib/validation.js';
import { logAudit } from '../lib/audit.js';

export const usersRouter = Router();

const publicUserSearchSelect = {
  id: true,
  username: true,
  displayName: true,
  name: true,
  avatarUrl: true,
  city: true,
  skillLevel: true,
  sports: true,
  lookingForMatch: true,
  lookingForMatchSport: true,
  isBaller: true,
  profileVisible: true,
} as const;

// GET /search?q= — search users by username or name
usersRouter.get(
  '/search',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (raw.length < 1 || raw.length > 100) {
        res.status(400).json({ error: 'Search query must be between 1 and 100 characters' });
        return;
      }
      const q = raw;

      // Check blocked users to exclude them
      const blocks = await prisma.block.findMany({
        where: {
          OR: [
            { blockerId: req.user!.id },
            { blockedId: req.user!.id },
          ],
        },
        select: { blockerId: true, blockedId: true },
      });
      const blockedIds = new Set(
        blocks.map(b => b.blockerId === req.user!.id ? b.blockedId : b.blockerId)
      );

      const users = await prisma.user.findMany({
        where: {
          AND: [
            { profileVisible: true },
            { bannedAt: null },
            {
              OR: [
                { username: { contains: q.toLowerCase(), mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
                { displayName: { contains: q, mode: 'insensitive' } },
              ],
            },
            ...(blockedIds.size > 0 ? [{ id: { notIn: Array.from(blockedIds) } }] : []),
          ],
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
      const raw = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      const q = raw.slice(0, 100);

      if (!q) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
          ],
        },
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

      const targetUser = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { id: true, role: true },
      });

      if (!targetUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Prevent admins from removing their own admin access
      if (req.params.id === req.user!.id && data.role !== 'ADMIN') {
        res.status(400).json({ error: 'Admins cannot remove their own admin access from the app.' });
        return;
      }

      // Prevent admins from modifying another admin's role
      if (targetUser.role === 'ADMIN' && req.params.id !== req.user!.id) {
        res.status(403).json({ error: 'Cannot modify another admin\'s role' });
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

      await logAudit({
        userId: req.user!.id,
        action: 'ROLE_CHANGE',
        targetType: 'USER',
        targetId: req.params.id,
        details: { previousRole: targetUser.role, newRole: data.role },
      });

      res.json(updatedUser);
    } catch (err) {
      next(err);
    }
  },
);

// GET /me/payments — get current user's payment history
usersRouter.get(
  '/me/payments',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registrations = await prisma.registration.findMany({
        where: { userId: req.user!.id },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              sport: true,
              entryFee: true,
              date: true,
              location: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const payments = registrations.map((reg) => ({
        id: reg.id,
        tournamentId: reg.tournamentId,
        tournamentName: reg.tournament.name,
        sport: reg.tournament.sport,
        entryFee: reg.tournament.entryFee,
        tournamentDate: reg.tournament.date,
        location: reg.tournament.location,
        paidAt: reg.paidAt,
        registeredAt: reg.createdAt,
      }));

      res.json(payments);
    } catch (err) {
      next(err);
    }
  }
);

// GET /by-username/:username — get profile by username
usersRouter.get(
  '/by-username/:username',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { username: req.params.username.toLowerCase() },
        select: {
          id: true, username: true, displayName: true, name: true,
          avatarUrl: true, bio: true, city: true, location: true,
          skillLevel: true, sports: true, wins: true, losses: true,
          matchesPlayed: true, level: true, preferredSport: true,
          isBaller: true, lookingForMatch: true, lookingForMatchSport: true,
          profileVisible: true, showRating: true, showMatchHistory: true,
          createdAt: true,
        },
      });

      if (!user || !user.profileVisible) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Fetch sport ratings if the user allows it
      let sportRatings = null;
      if (user.showRating) {
        sportRatings = await prisma.userSportRating.findMany({
          where: { userId: user.id },
          select: {
            sport: true, rating: true, matchesPlayed: true,
            wins: true, losses: true, winStreak: true, bestRating: true,
          },
        });
      }

      res.json({ ...user, sportRatings });
    } catch (err) {
      next(err);
    }
  }
);

// GET /:id — get public profile
usersRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true, username: true, displayName: true, name: true,
          avatarUrl: true, bio: true, city: true, location: true,
          skillLevel: true, sports: true, wins: true, losses: true,
          matchesPlayed: true, level: true, preferredSport: true,
          isBaller: true, lookingForMatch: true, lookingForMatchSport: true,
          profileVisible: true, showRating: true, showMatchHistory: true,
          createdAt: true,
        },
      });

      if (!user || !user.profileVisible) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      let sportRatings = null;
      if (user.showRating) {
        sportRatings = await prisma.userSportRating.findMany({
          where: { userId: user.id },
          select: {
            sport: true, rating: true, matchesPlayed: true,
            wins: true, losses: true, winStreak: true, bestRating: true,
          },
        });
      }

      res.json({ ...user, sportRatings });
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
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 25));

      const registrations = await prisma.registration.findMany({
        where: { userId: req.params.id },
        include: { tournament: true },
        orderBy: { tournament: { date: 'desc' } },
        take: limit,
        skip: (page - 1) * limit,
      });

      res.json(registrations);
    } catch (err) {
      next(err);
    }
  }
);

