import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { createNotification } from '../lib/notifications.js';
import { createCompetitiveMatchSchema, submitMatchResultSchema } from '../lib/validation.js';
import { updateRatingsAfterMatch } from '../services/rating.js';
import { verifyCompetitiveAccess, deductCredit, refundMatchPayments } from '../services/payments.js';
import crypto from 'crypto';

export const competitiveMatchRouter = Router();

const playerSelect = {
  id: true,
  username: true,
  displayName: true,
  name: true,
  avatarUrl: true,
  isBaller: true,
} as const;

// POST / — create a match
competitiveMatchRouter.post(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createCompetitiveMatchSchema.parse(req.body);
      const userId = req.user!.id;

      // Check if user is banned/suspended
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { bannedAt: true, suspendedUntil: true },
      });
      if (user?.bannedAt || (user?.suspendedUntil && user.suspendedUntil > new Date())) {
        res.status(403).json({ error: 'Your account is suspended' });
        return;
      }

      // Validate opponent exists and is eligible
      if (data.opponentId) {
        if (data.opponentId === userId) {
          res.status(400).json({ error: 'Cannot create a match against yourself' });
          return;
        }

        const opponent = await prisma.user.findUnique({
          where: { id: data.opponentId },
          select: { id: true, bannedAt: true, suspendedUntil: true },
        });

        if (!opponent) {
          res.status(404).json({ error: 'Opponent not found' });
          return;
        }

        if (opponent.bannedAt || (opponent.suspendedUntil && opponent.suspendedUntil > new Date())) {
          res.status(400).json({ error: 'Opponent is currently unavailable' });
          return;
        }
      }

      let paymentMethod: 'CREDIT' | 'INDIVIDUAL' | 'BALLER_SUBSCRIPTION' | 'NONE' = 'NONE';
      let creditId: string | null = null;
      let transactionId: string | null = null;

      // For competitive matches, verify payment access
      if (data.type === 'COMPETITIVE') {
        const access = await verifyCompetitiveAccess(userId);
        if (!access.hasAccess) {
          // Return info so client can trigger payment
          res.status(402).json({
            error: 'Competitive access required',
            needsPayment: true,
            creditBalance: access.creditBalance,
            isBaller: access.isBaller,
          });
          return;
        }
        paymentMethod = access.method;
        if (access.method === 'CREDIT' && access.creditPackId) {
          const result = await deductCredit(userId, access.creditPackId);
          creditId = access.creditPackId;
          transactionId = result.transactionId;
        }
      }

      const match = await prisma.competitiveMatch.create({
        data: {
          type: data.type,
          sport: data.sport,
          format: data.format || 'SINGLES',
          status: data.opponentId ? 'AWAITING_OPPONENT' : 'CREATED',
          playerAId: userId,
          playerAPaymentMethod: paymentMethod,
          playerACreditId: creditId,
          playerATransactionId: transactionId,
          playerBId: data.opponentId || null,
        },
        include: {
          playerA: { select: playerSelect },
          playerB: { select: playerSelect },
        },
      });

      // Notify opponent if specified
      if (data.opponentId) {
        const creator = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, name: true },
        });
        await createNotification(
          data.opponentId,
          'MATCH_READY',
          'Match Invitation',
          `${creator?.username || creator?.name || 'Someone'} invited you to a ${data.type.toLowerCase()} ${data.sport.toLowerCase()} match`,
          { matchId: match.id, type: data.type },
        );
      }

      res.status(201).json(match);
    } catch (err) {
      next(err);
    }
  },
);

// POST /:id/accept — opponent accepts and pays
competitiveMatchRouter.post(
  '/:id/accept',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await prisma.competitiveMatch.findUnique({
        where: { id: req.params.id },
      });

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      if (match.status !== 'AWAITING_OPPONENT' && match.status !== 'CREATED') {
        res.status(400).json({ error: 'Match is no longer available' });
        return;
      }

      if (match.playerAId === req.user!.id) {
        res.status(400).json({ error: 'Cannot accept your own match' });
        return;
      }

      // Check blocks
      const blocked = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: req.user!.id, blockedId: match.playerAId },
            { blockerId: match.playerAId, blockedId: req.user!.id },
          ],
        },
      });
      if (blocked) {
        res.status(403).json({ error: 'Cannot join this match' });
        return;
      }

      let paymentMethod: 'CREDIT' | 'INDIVIDUAL' | 'BALLER_SUBSCRIPTION' | 'NONE' = 'NONE';
      let creditId: string | null = null;
      let transactionId: string | null = null;

      if (match.type === 'COMPETITIVE') {
        const access = await verifyCompetitiveAccess(req.user!.id);
        if (!access.hasAccess) {
          res.status(402).json({
            error: 'Competitive access required',
            needsPayment: true,
            creditBalance: access.creditBalance,
            isBaller: access.isBaller,
          });
          return;
        }
        paymentMethod = access.method;
      }

      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 24);

      // Wrap accept + credit deduction in a single transaction to prevent TOCTOU:
      // match status check + credit deduction are atomic — if either fails, both roll back.
      const updated = await prisma.$transaction(async (tx) => {
        // Step 1: Atomically check match is still available and assign playerB
        const matchUpdate = await tx.competitiveMatch.updateMany({
          where: {
            id: match.id,
            playerBId: null,
            status: { in: ['AWAITING_OPPONENT', 'CREATED'] },
          },
          data: {
            playerBId: req.user!.id,
            playerBPaymentMethod: paymentMethod,
            status: 'ACTIVE',
            resultDeadline: deadline,
          },
        });

        if (matchUpdate.count === 0) {
          throw Object.assign(new Error('Match already accepted or no longer available'), { statusCode: 409 });
        }

        // Step 2: Deduct credit inside the same transaction (if applicable)
        if (paymentMethod === 'CREDIT') {
          const packUpdate = await tx.creditPack.updateMany({
            where: {
              userId: req.user!.id,
              creditsRemaining: { gt: 0 },
            },
            data: { creditsRemaining: { decrement: 1 } },
          });

          if (packUpdate.count === 0) {
            throw Object.assign(new Error('Insufficient credits'), { statusCode: 402 });
          }

          // Identify which pack was deducted for the transaction record
          const deductedPack = await tx.creditPack.findFirst({
            where: { userId: req.user!.id },
            orderBy: { purchasedAt: 'asc' },
            select: { id: true },
          });

          if (deductedPack) {
            const txRecord = await tx.transaction.create({
              data: {
                userId: req.user!.id,
                type: 'CREDIT_CONSUMPTION',
                amount: 0,
                description: 'Competitive match credit used',
                creditPackId: deductedPack.id,
                idempotencyKey: `credit-deduct-${crypto.randomUUID()}`,
              },
            });
            creditId = deductedPack.id;
            transactionId = txRecord.id;
          }

          // Update match with credit info
          await tx.competitiveMatch.update({
            where: { id: match.id },
            data: {
              playerBCreditId: creditId,
              playerBTransactionId: transactionId,
            },
          });
        }

        return tx.competitiveMatch.findUniqueOrThrow({
          where: { id: match.id },
          include: {
            playerA: { select: playerSelect },
            playerB: { select: playerSelect },
          },
        });
      });

      // Notify player A
      await createNotification(
        match.playerAId,
        'MATCH_READY',
        'Match Accepted',
        'Your match invitation was accepted. Go play!',
        { matchId: match.id },
      );

      res.json(updated);
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 409 || statusCode === 402) {
        res.status(statusCode).json({ error: (err as Error).message });
        return;
      }
      next(err);
    }
  },
);

// POST /:id/submit-result — player submits their result
competitiveMatchRouter.post(
  '/:id/submit-result',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = submitMatchResultSchema.parse(req.body);
      const match = await prisma.competitiveMatch.findUnique({
        where: { id: req.params.id },
      });

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      if (match.status !== 'ACTIVE') {
        res.status(400).json({ error: 'Match is not active' });
        return;
      }

      const isPlayerA = match.playerAId === req.user!.id;
      const isPlayerB = match.playerBId === req.user!.id;
      if (!isPlayerA && !isPlayerB) {
        res.status(403).json({ error: 'You are not a participant in this match' });
        return;
      }

      // Validate winnerId is one of the players
      if (data.winnerId !== match.playerAId && data.winnerId !== match.playerBId) {
        res.status(400).json({ error: 'Winner must be one of the match participants' });
        return;
      }

      // Update the player's confirmation
      const updateData: Prisma.CompetitiveMatchUpdateInput = {};
      if (isPlayerA) {
        if (match.playerAConfirmed) {
          res.status(400).json({ error: 'You already submitted a result' });
          return;
        }
        updateData.playerAConfirmed = true;
      } else {
        if (match.playerBConfirmed) {
          res.status(400).json({ error: 'You already submitted a result' });
          return;
        }
        updateData.playerBConfirmed = true;
      }

      // Check if both players have now submitted
      const otherConfirmed = isPlayerA ? match.playerBConfirmed : match.playerAConfirmed;

      if (otherConfirmed) {
        // Both have submitted — check if they agree on the winner
        // We need to check what the other player submitted
        // For simplicity, we store winnerId on first submission, then compare
        if (match.winnerId && match.winnerId !== data.winnerId) {
          // DISPUTE — players disagree
          updateData.disputed = true;
          updateData.status = 'DISPUTED';
          updateData.winnerId = null;
          updateData.completedAt = new Date();

          // Refund both players
          if (match.type === 'COMPETITIVE') {
            await refundMatchPayments(match);
          }

          // Notify both players
          const notifyIds = [match.playerAId, match.playerBId!].filter(id => id !== req.user!.id);
          for (const id of notifyIds) {
            await createNotification(id, 'RESULT_DISPUTED', 'Match Disputed',
              'The match result is disputed. No rating changes will be applied.',
              { matchId: match.id });
          }
        } else {
          // AGREEMENT — complete the match
          const winnerId = data.winnerId;
          const loserId = winnerId === match.playerAId ? match.playerBId! : match.playerAId;
          updateData.winnerId = winnerId;
          updateData.status = 'COMPLETED';
          updateData.completedAt = new Date();
          if (data.score) updateData.score = data.score;

          // Update ratings for competitive matches
          if (match.type === 'COMPETITIVE') {
            const ratingResult = await updateRatingsAfterMatch(match.id, winnerId, loserId, match.sport);
            updateData.playerARatingBefore = match.playerAId === winnerId
              ? ratingResult.winner.ratingBefore : ratingResult.loser.ratingBefore;
            updateData.playerARatingAfter = match.playerAId === winnerId
              ? ratingResult.winner.ratingAfter : ratingResult.loser.ratingAfter;
            updateData.playerBRatingBefore = match.playerBId === winnerId
              ? ratingResult.winner.ratingBefore : ratingResult.loser.ratingBefore;
            updateData.playerBRatingAfter = match.playerBId === winnerId
              ? ratingResult.winner.ratingAfter : ratingResult.loser.ratingAfter;
          }

          // Update user-level stats
          await prisma.$transaction([
            prisma.user.update({
              where: { id: winnerId },
              data: { wins: { increment: 1 }, matchesPlayed: { increment: 1 }, lastActiveAt: new Date() },
            }),
            prisma.user.update({
              where: { id: loserId },
              data: { losses: { increment: 1 }, matchesPlayed: { increment: 1 }, lastActiveAt: new Date() },
            }),
          ]);

          // Notify the other player
          const otherId = winnerId === req.user!.id ? loserId : winnerId;
          await createNotification(otherId, 'RESULT_CONFIRMED', 'Match Completed',
            'Both players confirmed the match result.',
            { matchId: match.id, winnerId });
        }
      } else {
        // First submission — store the claimed winner
        updateData.winnerId = data.winnerId;
        if (data.score) updateData.score = data.score;

        // Notify the other player to submit their result
        const otherId = isPlayerA ? match.playerBId! : match.playerAId;
        await createNotification(otherId, 'MATCH_READY', 'Confirm Match Result',
          'Your opponent submitted a match result. Please confirm.',
          { matchId: match.id });
      }

      const updated = await prisma.competitiveMatch.update({
        where: { id: match.id },
        data: updateData,
        include: {
          playerA: { select: playerSelect },
          playerB: { select: playerSelect },
        },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// POST /:id/cancel — cancel a match
competitiveMatchRouter.post(
  '/:id/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await prisma.competitiveMatch.findUnique({
        where: { id: req.params.id },
      });

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      if (match.playerAId !== req.user!.id) {
        res.status(403).json({ error: 'Only the match creator can cancel' });
        return;
      }

      if (match.status === 'COMPLETED' || match.status === 'CANCELLED') {
        res.status(400).json({ error: 'Cannot cancel this match' });
        return;
      }

      // Refund if competitive
      if (match.type === 'COMPETITIVE') {
        await refundMatchPayments(match);
      }

      const updated = await prisma.competitiveMatch.update({
        where: { id: match.id },
        data: { status: 'CANCELLED' },
        include: {
          playerA: { select: playerSelect },
          playerB: { select: playerSelect },
        },
      });

      if (match.playerBId) {
        await createNotification(match.playerBId, 'MATCH_READY', 'Match Cancelled',
          'A match you were in was cancelled.',
          { matchId: match.id });
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// GET /my — get user's competitive matches
competitiveMatchRouter.get(
  '/my',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

      const where: Prisma.CompetitiveMatchWhereInput = {
        OR: [
          { playerAId: req.user!.id },
          { playerBId: req.user!.id },
        ],
      };
      if (status) {
        where.status = status as Prisma.EnumCompetitiveMatchStatusFilter;
      }

      const [matches, total] = await Promise.all([
        prisma.competitiveMatch.findMany({
          where,
          include: {
            playerA: { select: playerSelect },
            playerB: { select: playerSelect },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.competitiveMatch.count({ where }),
      ]);

      res.json({ matches, total, page, limit });
    } catch (err) {
      next(err);
    }
  },
);

// GET /:id — get single match details (participants only)
competitiveMatchRouter.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const match = await prisma.competitiveMatch.findUnique({
        where: { id: req.params.id },
        include: {
          playerA: { select: playerSelect },
          playerB: { select: playerSelect },
        },
      });

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      const userId = req.user!.id;
      if (match.playerAId !== userId && match.playerBId !== userId) {
        res.status(403).json({ error: 'You are not a participant in this match' });
        return;
      }

      res.json(match);
    } catch (err) {
      next(err);
    }
  },
);
