import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { matchResultSchema, playerSubmitResultSchema } from '../lib/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { createNotification } from '../lib/notifications.js';
import { advanceDoubleElimination } from '../services/bracket-generator.js';

export const matchRouter = Router();

/**
 * After a match result is confirmed, check if the tournament should auto-complete.
 * For Round Robin: all matches done → COMPLETED.
 * For Double Elimination: Grand Final done → COMPLETED.
 * For Single Elimination: final round done → COMPLETED.
 */
async function checkTournamentCompletion(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament || tournament.status !== 'IN_PROGRESS') return;

  const allMatches = await prisma.match.findMany({
    where: { tournamentId },
  });

  const allDone = allMatches.every((m) => m.winnerId !== null);

  if (allDone && allMatches.length > 0) {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED' },
    });
  }
}

/**
 * Advance winner based on tournament format.
 */
async function advanceWinner(
  match: { id: string; tournamentId: string; round: number; position: number; bracket: string | null },
  winnerId: string,
  loserId: string | null,
  format: string,
) {
  if (format === 'SINGLE_ELIMINATION') {
    const nextRound = match.round + 1;
    const nextPosition = Math.floor(match.position / 2);

    const nextMatch = await prisma.match.findFirst({
      where: {
        tournamentId: match.tournamentId,
        round: nextRound,
        position: nextPosition,
        bracket: null, // SE matches have no bracket field
      },
    });

    if (nextMatch) {
      const isPlayer1 = match.position % 2 === 0;
      await prisma.match.update({
        where: { id: nextMatch.id },
        data: isPlayer1
          ? { player1Id: winnerId }
          : { player2Id: winnerId },
      });
    }
  } else if (format === 'DOUBLE_ELIMINATION') {
    await advanceDoubleElimination(match, winnerId, loserId);
  }
  // ROUND_ROBIN: no advancement needed

  await checkTournamentCompletion(match.tournamentId);
}

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

      // Determine loser
      const loserId = data.winnerId === match.player1Id ? match.player2Id : match.player1Id;

      // Auto-advance based on format
      await advanceWinner(
        { id: match.id, tournamentId: match.tournamentId, round: match.round, position: match.position, bracket: match.bracket },
        data.winnerId,
        loserId,
        match.tournament.format,
      );

      res.json(updatedMatch);
    } catch (err) {
      next(err);
    }
  }
);

// POST /:id/submit-result — player submits who won
matchRouter.post('/:id/submit-result', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { tournament: true },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    // Verify user is player1 or player2
    if (match.player1Id !== req.user!.id && match.player2Id !== req.user!.id) {
      res.status(403).json({ error: 'You are not a player in this match' });
      return;
    }

    const { winnerId, score } = playerSubmitResultSchema.parse(req.body);

    if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
      res.status(400).json({ error: 'Winner must be one of the match players' });
      return;
    }

    // Upsert the result (unique on matchId + submittedBy)
    const result = await prisma.matchResult.upsert({
      where: {
        matchId_submittedBy: {
          matchId: req.params.id,
          submittedBy: req.user!.id,
        },
      },
      update: { winnerId, score: score ?? null },
      create: {
        matchId: req.params.id,
        submittedBy: req.user!.id,
        winnerId,
        score: score ?? null,
      },
    });

    // Notify opponent that result was submitted
    const opponentId = match.player1Id === req.user!.id ? match.player2Id : match.player1Id;
    if (opponentId) {
      await createNotification(
        opponentId,
        'MATCH_READY',
        'Match Result Submitted',
        'Your opponent has submitted a match result. Please confirm or dispute.',
        { matchId: match.id, tournamentId: match.tournamentId }
      );
    }

    // Check if both players have submitted
    const allResults = await prisma.matchResult.findMany({
      where: { matchId: req.params.id },
    });

    if (allResults.length === 2) {
      const [result1, result2] = allResults;

      if (result1.winnerId === result2.winnerId) {
        // Both agree on the winner
        const agreedWinnerId = result1.winnerId;
        const loserId = match.player1Id === agreedWinnerId ? match.player2Id : match.player1Id;

        // Update match
        await prisma.match.update({
          where: { id: req.params.id },
          data: {
            winnerId: agreedWinnerId,
            score: result1.score || result2.score || null,
            completedAt: new Date(),
          },
        });

        // Update winner stats
        await prisma.user.update({
          where: { id: agreedWinnerId },
          data: { wins: { increment: 1 }, matchesPlayed: { increment: 1 } },
        });

        // Update loser stats
        if (loserId) {
          await prisma.user.update({
            where: { id: loserId },
            data: { losses: { increment: 1 }, matchesPlayed: { increment: 1 } },
          });
        }

        // Notify both players of confirmation
        for (const playerId of [match.player1Id, match.player2Id]) {
          if (playerId) {
            await createNotification(
              playerId,
              'RESULT_CONFIRMED',
              'Match Result Confirmed',
              'Both players agreed on the match result.',
              { matchId: match.id, tournamentId: match.tournamentId, winnerId: agreedWinnerId }
            );
          }
        }

        // Auto-advance based on format
        await advanceWinner(
          { id: match.id, tournamentId: match.tournamentId, round: match.round, position: match.position, bracket: match.bracket },
          agreedWinnerId,
          loserId,
          match.tournament.format,
        );
      } else {
        // Dispute — notify tournament organizer
        await createNotification(
          match.tournament.organizerId,
          'RESULT_DISPUTED',
          'Match Result Disputed',
          'Players submitted conflicting results and need organizer review.',
          { matchId: match.id, tournamentId: match.tournamentId }
        );
      }
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /:id/results — get submitted results for a match
matchRouter.get('/:id/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const results = await prisma.matchResult.findMany({
      where: { matchId: req.params.id },
      include: {
        submitter: { select: { id: true, name: true } },
      },
    });

    res.json(results);
  } catch (err) {
    next(err);
  }
});
