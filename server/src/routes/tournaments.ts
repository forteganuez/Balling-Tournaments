import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { createTournamentSchema, updateTournamentSchema, chatMessageSchema, announcementSchema, tournamentQuerySchema, doublesRegistrationSchema } from '../lib/validation.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleCheck.js';
import { generateBrackets } from '../services/bracket-generator.js';
import { createCheckoutSession } from '../services/stripe.js';
import { Prisma } from '@prisma/client';
import { createNotification } from '../lib/notifications.js';
import { logAudit } from '../lib/audit.js';

export const tournamentRouter = Router();

// GET /my — must be defined BEFORE /:id
tournamentRouter.get('/my', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registrations = await prisma.registration.findMany({
      where: { userId: req.user!.id },
      include: {
        tournament: {
          include: {
            organizer: { select: { id: true, name: true } },
            _count: { select: { registrations: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(registrations);
  } catch (err) {
    next(err);
  }
});

// Also export the handler for mounting at /api/my-tournaments in index.ts
export async function myTournamentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const registrations = await prisma.registration.findMany({
      where: { userId: req.user!.id },
      include: {
        tournament: {
          include: {
            organizer: { select: { id: true, name: true } },
            _count: { select: { registrations: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(registrations);
  } catch (err) {
    next(err);
  }
}

// GET / — list tournaments
tournamentRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = tournamentQuerySchema.parse(req.query);

    const where: Prisma.TournamentWhereInput = {};

    if (query.sport) {
      where.sport = query.sport;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 25;
    const skip = (page - 1) * limit;

    const tournaments = await prisma.tournament.findMany({
      where,
      include: {
        organizer: { select: { id: true, name: true } },
        _count: { select: { registrations: true } },
      },
      orderBy: { date: 'asc' },
      take: limit,
      skip,
    });

    res.json(tournaments);
  } catch (err) {
    next(err);
  }
});

// GET /:id — tournament detail
tournamentRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: {
        organizer: { select: { id: true, name: true } },
        registrations: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        matches: {
          orderBy: [{ round: 'asc' }, { position: 'asc' }],
        },
      },
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    res.json(tournament);
  } catch (err) {
    next(err);
  }
});

// POST / — create tournament
tournamentRouter.post(
  '/',
  authenticate,
  requireRole('ORGANIZER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createTournamentSchema.parse(req.body);

      const tournament = await prisma.tournament.create({
        data: {
          ...data,
          organizerId: req.user!.id,
        },
      });

      res.status(201).json(tournament);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /:id — update tournament
tournamentRouter.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (tournament.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const data = updateTournamentSchema.parse(req.body);

    const updated = await prisma.tournament.update({
      where: { id: req.params.id },
      data,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — delete tournament and related records
tournamentRouter.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      select: { id: true, organizerId: true },
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (tournament.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const matches = await tx.match.findMany({
        where: { tournamentId: req.params.id },
        select: { id: true },
      });
      const matchIds = matches.map((match) => match.id);

      if (matchIds.length > 0) {
        await tx.matchResult.deleteMany({
          where: { matchId: { in: matchIds } },
        });
      }

      await tx.tournamentChat.deleteMany({
        where: { tournamentId: req.params.id },
      });
      await tx.tournamentAnnouncement.deleteMany({
        where: { tournamentId: req.params.id },
      });
      await tx.doublesTeam.deleteMany({
        where: { tournamentId: req.params.id },
      });
      await tx.registration.deleteMany({
        where: { tournamentId: req.params.id },
      });
      await tx.match.deleteMany({
        where: { tournamentId: req.params.id },
      });
      await tx.tournament.delete({
        where: { id: req.params.id },
      });
    });

    await logAudit({
      userId: req.user!.id,
      action: 'TOURNAMENT_DELETE',
      targetType: 'TOURNAMENT',
      targetId: req.params.id,
      details: { organizerId: tournament.organizerId },
    });

    res.json({ message: 'Tournament deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /:id/close-registration — close registration and generate bracket
tournamentRouter.post(
  '/:id/close-registration',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tournament = await prisma.tournament.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { registrations: true } } },
      });

      if (!tournament) {
        res.status(404).json({ error: 'Tournament not found' });
        return;
      }

      if (tournament.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      if (tournament.status !== 'REGISTRATION_OPEN') {
        res.status(400).json({ error: 'Registration is not open for this tournament' });
        return;
      }

      if (tournament._count.registrations < 2) {
        res.status(400).json({ error: 'At least 2 players must be registered before starting the tournament' });
        return;
      }

      await prisma.tournament.update({
        where: { id: req.params.id },
        data: { status: 'IN_PROGRESS' },
      });

      await generateBrackets(req.params.id, tournament.format);

      await logAudit({
        userId: req.user!.id,
        action: 'REGISTRATION_CLOSED',
        targetType: 'TOURNAMENT',
        targetId: req.params.id,
        details: { format: tournament.format },
      });

      const updatedTournament = await prisma.tournament.findUnique({
        where: { id: req.params.id },
        include: {
          matches: { orderBy: [{ round: 'asc' }, { position: 'asc' }] },
          registrations: {
            include: { user: { select: { id: true, name: true } } },
          },
          organizer: { select: { id: true, name: true } },
        },
      });

      res.json(updatedTournament);
    } catch (err) {
      next(err);
    }
  }
);

// POST /:id/cancel — cancel tournament
tournamentRouter.post('/:id/cancel', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (tournament.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const updated = await prisma.tournament.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    await logAudit({
      userId: req.user!.id,
      action: 'TOURNAMENT_CANCEL',
      targetType: 'TOURNAMENT',
      targetId: req.params.id,
      details: { previousStatus: tournament.status },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /:id/join — join tournament (creates Stripe checkout)
tournamentRouter.post('/:id/join', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { registrations: true } } },
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      res.status(400).json({ error: 'Tournament is not open for registration' });
      return;
    }

    if (tournament._count.registrations >= tournament.maxPlayers) {
      res.status(400).json({ error: 'Tournament is full' });
      return;
    }

    const existingRegistration = await prisma.registration.findUnique({
      where: {
        userId_tournamentId: {
          userId: req.user!.id,
          tournamentId: req.params.id,
        },
      },
    });

    if (existingRegistration) {
      res.status(409).json({ error: 'You are already registered for this tournament' });
      return;
    }

    // If entry fee is 0, register directly without Stripe
    if (tournament.entryFee === 0) {
      await prisma.registration.create({
        data: {
          userId: req.user!.id,
          tournamentId: req.params.id,
          paidAt: new Date(),
        },
      });

      res.json({ url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/tournaments/${req.params.id}?payment=success` });
      return;
    }

    const session = await createCheckoutSession({
      tournamentId: req.params.id,
      tournamentName: tournament.name,
      entryFee: tournament.entryFee,
      userId: req.user!.id,
      userEmail: req.user!.email,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /:id/announce — organizer sends announcement
tournamentRouter.post('/:id/announce', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: req.params.id },
      include: { registrations: true },
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (tournament.organizerId !== req.user!.id) {
      res.status(403).json({ error: 'Only the tournament organizer can post announcements' });
      return;
    }

    const { message } = announcementSchema.parse(req.body);

    const announcement = await prisma.tournamentAnnouncement.create({
      data: {
        tournamentId: req.params.id,
        organizerId: req.user!.id,
        message,
      },
    });

    // Notify all registrants (not the organizer)
    for (const reg of tournament.registrations) {
      if (reg.userId !== req.user!.id) {
        await createNotification(
          reg.userId,
          'TOURNAMENT_ANNOUNCEMENT',
          `Announcement: ${tournament.name}`,
          message,
          { tournamentId: tournament.id, announcementId: announcement.id }
        );
      }
    }

    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
});

// GET /:id/announcements — get all announcements for a tournament
tournamentRouter.get('/:id/announcements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const announcements = await prisma.tournamentAnnouncement.findMany({
      where: { tournamentId: req.params.id },
      include: {
        organizer: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(announcements);
  } catch (err) {
    next(err);
  }
});

// POST /:id/chat — send chat message
tournamentRouter.post('/:id/chat', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (!tournament.chatEnabled) {
      res.status(403).json({ error: 'Chat is disabled for this tournament' });
      return;
    }

    const registration = await prisma.registration.findUnique({
      where: {
        userId_tournamentId: {
          userId: req.user!.id,
          tournamentId: req.params.id,
        },
      },
    });

    if (!registration) {
      res.status(403).json({ error: 'You must be registered in the tournament to send messages' });
      return;
    }

    const { message } = chatMessageSchema.parse(req.body);

    const chatMessage = await prisma.tournamentChat.create({
      data: {
        tournamentId: req.params.id,
        userId: req.user!.id,
        message,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    res.status(201).json(chatMessage);
  } catch (err) {
    next(err);
  }
});

// GET /:id/chat — get chat messages
tournamentRouter.get('/:id/chat', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    // Verify user is registered or is the organizer
    const isOrganizer = tournament.organizerId === req.user!.id;

    if (!isOrganizer) {
      const registration = await prisma.registration.findUnique({
        where: {
          userId_tournamentId: {
            userId: req.user!.id,
            tournamentId: req.params.id,
          },
        },
      });

      if (!registration) {
        res.status(403).json({ error: 'You must be registered or be the organizer to view chat' });
        return;
      }
    }

    const messages = await prisma.tournamentChat.findMany({
      where: { tournamentId: req.params.id },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// POST /:id/invite/:userId — invite friend to tournament
tournamentRouter.post('/:id/invite/:userId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const invitedUser = await prisma.user.findUnique({ where: { id: req.params.userId } });

    if (!invitedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await createNotification(
      req.params.userId,
      'TOURNAMENT_INVITE',
      'Tournament Invitation',
      `You have been invited to join ${tournament.name}`,
      { tournamentId: tournament.id, invitedBy: req.user!.id }
    );

    res.status(201).json({ message: 'Invitation sent' });
  } catch (err) {
    next(err);
  }
});

// POST /:id/doubles — register as doubles team
tournamentRouter.post('/:id/doubles', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (!tournament.allowDoubles) {
      res.status(400).json({ error: 'This tournament does not allow doubles' });
      return;
    }

    const { partnerId } = doublesRegistrationSchema.parse(req.body);

    if (partnerId === req.user!.id) {
      res.status(400).json({ error: 'You cannot be your own doubles partner' });
      return;
    }

    // Check for existing doubles team with same players
    const existingTeam = await prisma.doublesTeam.findFirst({
      where: {
        tournamentId: req.params.id,
        OR: [
          { player1Id: req.user!.id },
          { player2Id: req.user!.id },
          { player1Id: partnerId },
          { player2Id: partnerId },
        ],
      },
    });

    if (existingTeam) {
      res.status(409).json({ error: 'One or both players are already on a doubles team in this tournament' });
      return;
    }

    // Verify both players are registered
    const [player1Reg, player2Reg] = await Promise.all([
      prisma.registration.findUnique({
        where: {
          userId_tournamentId: {
            userId: req.user!.id,
            tournamentId: req.params.id,
          },
        },
      }),
      prisma.registration.findUnique({
        where: {
          userId_tournamentId: {
            userId: partnerId,
            tournamentId: req.params.id,
          },
        },
      }),
    ]);

    if (!player1Reg) {
      res.status(400).json({ error: 'You must be registered in the tournament' });
      return;
    }

    if (!player2Reg) {
      res.status(400).json({ error: 'Your partner must be registered in the tournament' });
      return;
    }

    const doublesTeam = await prisma.doublesTeam.create({
      data: {
        tournamentId: req.params.id,
        player1Id: req.user!.id,
        player2Id: partnerId,
      },
    });

    res.status(201).json(doublesTeam);
  } catch (err) {
    next(err);
  }
});
