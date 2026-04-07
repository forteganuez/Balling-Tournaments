import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { z } from 'zod';
import { paginationQuerySchema, getPaginationParams } from '../lib/validation.js';

const leaderboardQuerySchema = paginationQuerySchema.extend({
  filter: z.enum(['global', 'regional', 'friends']).default('global'),
  region: z.string().max(100).optional(),
});

const historyQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default('30')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, { message: 'limit must be between 1 and 100' }),
});

export const rankingRouter = Router();

// GET /leaderboard/:sport — get leaderboard for a sport
rankingRouter.get(
  '/leaderboard/:sport',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sport = req.params.sport.toUpperCase();
      if (!['TENNIS', 'PADEL', 'SQUASH'].includes(sport)) {
        res.status(400).json({ error: 'Invalid sport' });
        return;
      }

      const { filter, region, page, limit } = leaderboardQuerySchema.parse(req.query);
      const { skip, take } = getPaginationParams({ page, limit });

      let userFilter: Record<string, unknown> = {};

      if (filter === 'friends' && req.user) {
        const friendships = await prisma.friendship.findMany({
          where: {
            OR: [{ requesterId: req.user.id }, { receiverId: req.user.id }],
            status: 'ACCEPTED',
          },
          select: { requesterId: true, receiverId: true },
        });
        const friendIds = friendships.map(f =>
          f.requesterId === req.user!.id ? f.receiverId : f.requesterId
        );
        friendIds.push(req.user.id); // Include self
        userFilter = { userId: { in: friendIds } };
      } else if (filter === 'regional' && region) {
        const usersInRegion = await prisma.user.findMany({
          where: {
            OR: [
              { city: { contains: region, mode: 'insensitive' } },
              { location: { contains: region, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        userFilter = { userId: { in: usersInRegion.map(u => u.id) } };
      }

      // Only show users with 3+ matches (publicly visible rating)
      const where = {
        sport: sport as 'TENNIS' | 'PADEL' | 'SQUASH',
        matchesPlayed: { gte: 3 },
        ...userFilter,
      };

      const [leaderboard, total] = await Promise.all([
        prisma.userSportRating.findMany({
          where,
          include: {
            user: {
              select: {
                id: true, username: true, displayName: true,
                name: true, avatarUrl: true, isBaller: true,
                city: true, showRating: true,
              },
            },
          },
          orderBy: { rating: 'desc' },
          take,
          skip,
        }),
        prisma.userSportRating.count({ where }),
      ]);

      // Filter out users who have hidden their rating
      const filtered = leaderboard
        .filter(entry => entry.user.showRating)
        .map((entry, index) => ({
          rank: (page - 1) * limit + index + 1,
          userId: entry.userId,
          username: entry.user.username,
          displayName: entry.user.displayName,
          name: entry.user.name,
          avatarUrl: entry.user.avatarUrl,
          isBaller: entry.user.isBaller,
          city: entry.user.city,
          rating: entry.rating,
          matchesPlayed: entry.matchesPlayed,
          wins: entry.wins,
          losses: entry.losses,
          winStreak: entry.winStreak,
        }));

      // Find the current user's position
      let myPosition = null;
      if (req.user) {
        const myRating = await prisma.userSportRating.findUnique({
          where: { userId_sport: { userId: req.user.id, sport: sport as 'TENNIS' | 'PADEL' | 'SQUASH' } },
        });
        if (myRating && myRating.matchesPlayed >= 3) {
          const higherCount = await prisma.userSportRating.count({
            where: {
              ...where,
              rating: { gt: myRating.rating },
            },
          });
          myPosition = {
            rank: higherCount + 1,
            rating: myRating.rating,
            matchesPlayed: myRating.matchesPlayed,
            wins: myRating.wins,
            losses: myRating.losses,
          };
        }
      }

      res.json({
        leaderboard: filtered,
        total,
        page,
        limit,
        myPosition,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /my-ratings — get current user's ratings for all sports
rankingRouter.get(
  '/my-ratings',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ratings = await prisma.userSportRating.findMany({
        where: { userId: req.user!.id },
      });

      // Get weekly change for each sport
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const weeklyHistory = await prisma.ratingHistory.findMany({
        where: {
          userId: req.user!.id,
          createdAt: { gte: oneWeekAgo },
        },
        orderBy: { createdAt: 'asc' },
      });

      const weeklyChangeBySport: Record<string, number> = {};
      for (const entry of weeklyHistory) {
        weeklyChangeBySport[entry.sport] = (weeklyChangeBySport[entry.sport] || 0) + entry.delta;
      }

      const result = ratings.map(r => ({
        sport: r.sport,
        rating: r.rating,
        matchesPlayed: r.matchesPlayed,
        wins: r.wins,
        losses: r.losses,
        winStreak: r.winStreak,
        bestRating: r.bestRating,
        lastMatchDate: r.lastMatchDate,
        weeklyChange: parseFloat((weeklyChangeBySport[r.sport] || 0).toFixed(3)),
        isPublic: r.matchesPlayed >= 3,
      }));

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /history/:sport — get rating history (sparkline data)
rankingRouter.get(
  '/history/:sport',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sport = req.params.sport.toUpperCase();
      if (!['TENNIS', 'PADEL', 'SQUASH'].includes(sport)) {
        res.status(400).json({ error: 'Invalid sport' });
        return;
      }

      const { limit } = historyQuerySchema.parse(req.query);

      const history = await prisma.ratingHistory.findMany({
        where: {
          userId: req.user!.id,
          sport: sport as 'TENNIS' | 'PADEL' | 'SQUASH',
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Fetch opponent info
      const opponentIds = [...new Set(history.map(h => h.opponentId))];
      const opponents = await prisma.user.findMany({
        where: { id: { in: opponentIds } },
        select: { id: true, username: true, displayName: true, name: true, avatarUrl: true },
      });
      const opponentMap = new Map(opponents.map(o => [o.id, o]));

      const result = history.reverse().map(h => ({
        date: h.createdAt,
        opponent: opponentMap.get(h.opponentId) || null,
        opponentRating: h.opponentRating,
        result: h.result,
        delta: h.delta,
        newRating: h.newRating,
        matchId: h.matchId,
      }));

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /user/:userId/:sport — get specific user's rating for a sport
rankingRouter.get(
  '/user/:userId/:sport',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sport = req.params.sport.toUpperCase();
      if (!['TENNIS', 'PADEL', 'SQUASH'].includes(sport)) {
        res.status(400).json({ error: 'Invalid sport' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.params.userId },
        select: { showRating: true, profileVisible: true },
      });

      if (!user || !user.profileVisible || !user.showRating) {
        res.status(404).json({ error: 'Rating not available' });
        return;
      }

      const rating = await prisma.userSportRating.findUnique({
        where: {
          userId_sport: {
            userId: req.params.userId,
            sport: sport as 'TENNIS' | 'PADEL' | 'SQUASH',
          },
        },
      });

      if (!rating) {
        res.json({ rating: null, isPublic: false });
        return;
      }

      res.json({
        ...rating,
        isPublic: rating.matchesPlayed >= 3,
      });
    } catch (err) {
      next(err);
    }
  },
);
