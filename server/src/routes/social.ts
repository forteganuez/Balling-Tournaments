import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { createReportSchema, blockUserSchema } from '../lib/validation.js';
import { createNotification } from '../lib/notifications.js';

export const socialRouter = Router();

const MAX_FRIENDS = 500;

// ── Blocking ──

// POST /block/:userId — block a user
socialRouter.post(
  '/block/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const blockerId = req.user!.id;
      const blockedId = req.params.userId;

      if (blockerId === blockedId) {
        res.status(400).json({ error: 'Cannot block yourself' });
        return;
      }

      const data = blockUserSchema.parse(req.body);

      // Check if already blocked
      const existing = await prisma.block.findUnique({
        where: { blockerId_blockedId: { blockerId, blockedId } },
      });
      if (existing) {
        res.status(409).json({ error: 'User already blocked' });
        return;
      }

      // Create block and remove any existing friendship
      await prisma.$transaction([
        prisma.block.create({
          data: { blockerId, blockedId, reason: data.reason || null },
        }),
        // Remove friendships in both directions
        prisma.friendship.deleteMany({
          where: {
            OR: [
              { requesterId: blockerId, receiverId: blockedId },
              { requesterId: blockedId, receiverId: blockerId },
            ],
          },
        }),
        // Remove follows in both directions
        prisma.follow.deleteMany({
          where: {
            OR: [
              { followerId: blockerId, followingId: blockedId },
              { followerId: blockedId, followingId: blockerId },
            ],
          },
        }),
      ]);

      res.json({ message: 'User blocked' });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /block/:userId — unblock a user
socialRouter.delete(
  '/block/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const block = await prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: req.user!.id,
            blockedId: req.params.userId,
          },
        },
      });

      if (!block) {
        res.status(404).json({ error: 'Block not found' });
        return;
      }

      await prisma.block.delete({ where: { id: block.id } });
      res.json({ message: 'User unblocked' });
    } catch (err) {
      next(err);
    }
  },
);

// GET /blocked — list blocked users
socialRouter.get(
  '/blocked',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const blocks = await prisma.block.findMany({
        where: { blockerId: req.user!.id },
        include: {
          blocked: {
            select: { id: true, username: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(blocks.map(b => ({ ...b.blocked, blockedAt: b.createdAt })));
    } catch (err) {
      next(err);
    }
  },
);

// ── Reporting ──

// POST /report/:userId — report a user
socialRouter.post(
  '/report/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reporterId = req.user!.id;
      const reportedId = req.params.userId;

      if (reporterId === reportedId) {
        res.status(400).json({ error: 'Cannot report yourself' });
        return;
      }

      const data = createReportSchema.parse(req.body);

      // Rate limit: max 5 reports per user per day
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const recentReports = await prisma.report.count({
        where: {
          reporterId,
          createdAt: { gte: todayStart },
        },
      });
      if (recentReports >= 5) {
        res.status(429).json({ error: 'Too many reports today. Try again tomorrow.' });
        return;
      }

      const report = await prisma.report.create({
        data: {
          reporterId,
          reportedId,
          reason: data.reason,
          description: data.description || null,
        },
      });

      // Check if user has 3+ confirmed (resolved) reports — auto-suspend
      const confirmedReports = await prisma.report.count({
        where: { reportedId, resolved: true },
      });

      if (confirmedReports >= 3) {
        const suspendUntil = new Date();
        suspendUntil.setDate(suspendUntil.getDate() + 7);
        await prisma.user.update({
          where: { id: reportedId },
          data: { suspendedUntil: suspendUntil },
        });
      }

      res.status(201).json({ message: 'Report submitted', id: report.id });
    } catch (err) {
      next(err);
    }
  },
);

// GET /reports — admin: list unresolved reports
socialRouter.get(
  '/reports',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reports = await prisma.report.findMany({
        where: { resolved: false },
        include: {
          reporter: { select: { id: true, username: true, name: true } },
          reported: { select: { id: true, username: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.json(reports);
    } catch (err) {
      next(err);
    }
  },
);

// POST /reports/:id/resolve — admin: resolve a report
socialRouter.post(
  '/reports/:id/resolve',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await prisma.report.update({
        where: { id: req.params.id },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: req.user!.id,
        },
      });

      res.json(report);
    } catch (err) {
      next(err);
    }
  },
);

// ── Head-to-head stats ──

// GET /head-to-head/:userId — compare stats with another user
socialRouter.get(
  '/head-to-head/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const myId = req.user!.id;
      const theirId = req.params.userId;

      // Get all completed competitive matches between these two players
      const matches = await prisma.competitiveMatch.findMany({
        where: {
          status: 'COMPLETED',
          OR: [
            { playerAId: myId, playerBId: theirId },
            { playerAId: theirId, playerBId: myId },
          ],
        },
        select: {
          sport: true,
          winnerId: true,
          completedAt: true,
          score: true,
        },
        orderBy: { completedAt: 'desc' },
      });

      // Aggregate by sport
      const stats: Record<string, { wins: number; losses: number; matches: number }> = {};
      let totalWins = 0;
      let totalLosses = 0;

      for (const match of matches) {
        if (!stats[match.sport]) {
          stats[match.sport] = { wins: 0, losses: 0, matches: 0 };
        }
        stats[match.sport].matches++;
        if (match.winnerId === myId) {
          stats[match.sport].wins++;
          totalWins++;
        } else {
          stats[match.sport].losses++;
          totalLosses++;
        }
      }

      res.json({
        opponent: theirId,
        total: { wins: totalWins, losses: totalLosses, matches: matches.length },
        bySport: stats,
        recentMatches: matches.slice(0, 10),
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── Looking for match ──

// GET /looking-for-match — get friends looking for a match
socialRouter.get(
  '/looking-for-match',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const myId = req.user!.id;

      // Get friend IDs
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [{ requesterId: myId }, { receiverId: myId }],
          status: 'ACCEPTED',
        },
        select: { requesterId: true, receiverId: true },
      });

      const friendIds = friendships.map(f =>
        f.requesterId === myId ? f.receiverId : f.requesterId
      );

      // Get friends who are looking for a match
      const lookingFriends = await prisma.user.findMany({
        where: {
          id: { in: friendIds },
          lookingForMatch: true,
          bannedAt: null,
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          name: true,
          avatarUrl: true,
          lookingForMatchSport: true,
          sportRatings: {
            select: { sport: true, rating: true, matchesPlayed: true },
          },
        },
      });

      res.json(lookingFriends);
    } catch (err) {
      next(err);
    }
  },
);
