import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

declare global {
  namespace Express {
    interface Request {
      tournament?: {
        id: string;
        organizerId: string;
        name: string;
        status: string;
      };
    }
  }
}

/**
 * Verifies the authenticated user is the tournament organizer or an admin.
 * Attaches req.tournament on success so handlers don't need to re-fetch.
 */
export const requireTournamentOrganizerOrAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { id: true, organizerId: true, name: true, status: true },
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const isOrganizer = tournament.organizerId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOrganizer && !isAdmin) {
      res.status(403).json({ error: 'Only the tournament organizer or an admin can perform this action' });
      return;
    }

    req.tournament = tournament;
    next();
  } catch (err) {
    logger.error('Tournament authorization check failed', { err });
    res.status(500).json({ error: 'Authorization check failed' });
  }
};
