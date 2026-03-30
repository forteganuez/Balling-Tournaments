import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { createOpenMatchSchema } from '../lib/validation.js';
import { authenticate } from '../middleware/auth.js';
import { createNotification } from '../lib/notifications.js';

export const openMatchesRouter = Router();

const publicUserSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  city: true,
  level: true,
  preferredSport: true,
} as const;

function compareAvailableMatches(
  a: { sport: string; location: string; scheduledFor: Date },
  b: { sport: string; location: string; scheduledFor: Date },
  preferredSport?: string | null,
  city?: string | null,
) {
  const aMatchesSport = preferredSport && a.sport === preferredSport ? 1 : 0;
  const bMatchesSport = preferredSport && b.sport === preferredSport ? 1 : 0;
  if (aMatchesSport !== bMatchesSport) {
    return bMatchesSport - aMatchesSport;
  }

  const aMatchesCity = city && a.location.toLowerCase().includes(city.toLowerCase()) ? 1 : 0;
  const bMatchesCity = city && b.location.toLowerCase().includes(city.toLowerCase()) ? 1 : 0;
  if (aMatchesCity !== bMatchesCity) {
    return bMatchesCity - aMatchesCity;
  }

  return a.scheduledFor.getTime() - b.scheduledFor.getTime();
}

openMatchesRouter.get(
  '/feed',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const viewer = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { preferredSport: true, city: true },
      });

      const [hosting, playing, available] = await Promise.all([
        prisma.openMatch.findMany({
          where: {
            creatorId: req.user!.id,
            status: { in: ['OPEN', 'BOOKED'] },
            scheduledFor: { gte: now },
          },
          include: {
            creator: { select: publicUserSelect },
            opponent: { select: publicUserSelect },
          },
          orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
        }),
        prisma.openMatch.findMany({
          where: {
            opponentId: req.user!.id,
            status: 'BOOKED',
            scheduledFor: { gte: now },
          },
          include: {
            creator: { select: publicUserSelect },
            opponent: { select: publicUserSelect },
          },
          orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
        }),
        prisma.openMatch.findMany({
          where: {
            creatorId: { not: req.user!.id },
            status: 'OPEN',
            scheduledFor: { gte: now },
          },
          include: {
            creator: { select: publicUserSelect },
            opponent: { select: publicUserSelect },
          },
          orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
          take: 20,
        }),
      ]);

      const sortedAvailable = available.sort((a, b) =>
        compareAvailableMatches(a, b, viewer?.preferredSport, viewer?.city),
      );

      res.json({
        hosting,
        playing,
        available: sortedAvailable,
      });
    } catch (err) {
      next(err);
    }
  },
);

openMatchesRouter.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createOpenMatchSchema.parse(req.body);

      const minimumTime = Date.now() + 15 * 60 * 1000; // 15 minutes from now
      if (data.scheduledFor.getTime() < minimumTime) {
        res.status(400).json({ error: 'Match must be scheduled at least 15 minutes in the future.' });
        return;
      }

      const activeHostedCount = await prisma.openMatch.count({
        where: {
          creatorId: req.user!.id,
          status: { in: ['OPEN', 'BOOKED'] },
          scheduledFor: { gte: new Date() },
        },
      });

      if (activeHostedCount >= 3) {
        res.status(400).json({ error: 'You already have 3 active match posts. Cancel one before creating another.' });
        return;
      }

      const match = await prisma.openMatch.create({
        data: {
          creatorId: req.user!.id,
          sport: data.sport,
          location: data.location.trim(),
          venue: data.venue?.trim() || null,
          notes: data.notes?.trim() || null,
          scheduledFor: data.scheduledFor,
        },
        include: {
          creator: { select: publicUserSelect },
          opponent: { select: publicUserSelect },
        },
      });

      res.status(201).json(match);
    } catch (err) {
      next(err);
    }
  },
);

openMatchesRouter.post(
  '/:id/join',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await prisma.openMatch.findUnique({
        where: { id: req.params.id },
        include: {
          creator: { select: publicUserSelect },
          opponent: { select: publicUserSelect },
        },
      });

      if (!match) {
        res.status(404).json({ error: 'Open match not found.' });
        return;
      }

      if (match.creatorId === req.user!.id) {
        res.status(400).json({ error: 'You cannot join your own match post.' });
        return;
      }

      if (match.status !== 'OPEN' || match.opponentId) {
        res.status(400).json({ error: 'This match is no longer available.' });
        return;
      }

      if (match.scheduledFor.getTime() <= Date.now()) {
        res.status(400).json({ error: 'This match time has already passed.' });
        return;
      }

      const joiner = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { name: true },
      });

      const updated = await prisma.openMatch.update({
        where: { id: match.id },
        data: {
          opponentId: req.user!.id,
          status: 'BOOKED',
        },
        include: {
          creator: { select: publicUserSelect },
          opponent: { select: publicUserSelect },
        },
      });

      await createNotification(
        match.creatorId,
        'MATCH_READY',
        'Someone joined your match',
        `${joiner?.name ?? 'A player'} joined your ${match.sport.toLowerCase()} match.`,
        { openMatchId: match.id },
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

openMatchesRouter.post(
  '/:id/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await prisma.openMatch.findUnique({
        where: { id: req.params.id },
      });

      if (!match) {
        res.status(404).json({ error: 'Open match not found.' });
        return;
      }

      if (match.creatorId !== req.user!.id) {
        res.status(403).json({ error: 'Only the host can cancel this match.' });
        return;
      }

      if (match.status === 'CANCELLED') {
        res.status(400).json({ error: 'This match is already cancelled.' });
        return;
      }

      const updated = await prisma.openMatch.update({
        where: { id: match.id },
        data: { status: 'CANCELLED' },
        include: {
          creator: { select: publicUserSelect },
          opponent: { select: publicUserSelect },
        },
      });

      if (match.opponentId) {
        await createNotification(
          match.opponentId,
          'MATCH_READY',
          'Match cancelled',
          'The host cancelled the match you joined.',
          { openMatchId: match.id },
        );
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

openMatchesRouter.post(
  '/:id/leave',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await prisma.openMatch.findUnique({
        where: { id: req.params.id },
      });

      if (!match) {
        res.status(404).json({ error: 'Open match not found.' });
        return;
      }

      if (match.opponentId !== req.user!.id) {
        res.status(403).json({ error: 'You have not joined this match.' });
        return;
      }

      if (match.status !== 'BOOKED') {
        res.status(400).json({ error: 'This match is not currently booked.' });
        return;
      }

      const leaver = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { name: true },
      });

      const updated = await prisma.openMatch.update({
        where: { id: match.id },
        data: {
          opponentId: null,
          status: 'OPEN',
        },
        include: {
          creator: { select: publicUserSelect },
          opponent: { select: publicUserSelect },
        },
      });

      await createNotification(
        match.creatorId,
        'MATCH_READY',
        'A player left your match',
        `${leaver?.name ?? 'A player'} left your match post, so it is open again.`,
        { openMatchId: match.id },
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);
