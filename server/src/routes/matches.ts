import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { matchResultSchema } from '../lib/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';

export const matchRouter = Router();

// PUT /:id/result — record match result and auto-advance winner
matchRouter.put(
  '/:id/result',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = matchResultSchema.parse(req.body);

      const match = await prisma.match.findUnique({
        where: { id: req.params.id },
        include: { tournament: true },
      });

      if (!match) {
        res.status(404).json({ error: 'Match not found' });
        return;
      }

      // Verify the user is the organizer of this tournament or an ADMIN
      if (match.tournament.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Verify winnerId is one of the players
      if (data.winnerId !== match.player1Id && data.winnerId !== match.player2Id) {
        res.status(400).json({ error: 'Winner must be one of the match players' });
        return;
      }

      // Update the match with result
      const updatedMatch = await prisma.match.update({
        where: { id: req.params.id },
        data: {
          score: data.score,
          winnerId: data.winnerId,
          completedAt: new Date(),
        },
      });

      // Auto-advance winner for single elimination
      if (match.tournament.format === 'SINGLE_ELIMINATION') {
        const nextRound = match.round + 1;
        const nextPosition = Math.floor(match.position / 2);

        const nextMatch = await prisma.match.findFirst({
          where: {
            tournamentId: match.tournamentId,
            round: nextRound,
            position: nextPosition,
          },
        });

        if (nextMatch) {
          // Determine if winner goes to player1 or player2 slot
          // Even position in current round -> player1 in next match
          // Odd position in current round -> player2 in next match
          const isPlayer1 = match.position % 2 === 0;

          await prisma.match.update({
            where: { id: nextMatch.id },
            data: isPlayer1
              ? { player1Id: data.winnerId }
              : { player2Id: data.winnerId },
          });
        }
      }

      res.json(updatedMatch);
    } catch (err) {
      next(err);
    }
  }
);
