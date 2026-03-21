import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { createNotification } from '../lib/notifications.js';

export const followsRouter = Router();

// POST /:userId — follow a user
followsRouter.post(
  '/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const followerId = req.user!.id;
      const followingId = req.params.userId;

      if (followerId === followingId) {
        res.status(400).json({ error: 'Cannot follow yourself' });
        return;
      }

      const follow = await prisma.follow.create({
        data: {
          followerId,
          followingId,
        },
      });

      const follower = await prisma.user.findUnique({
        where: { id: followerId },
        select: { name: true },
      });

      await createNotification(
        followingId,
        'FOLLOWED',
        'New Follower',
        `${follower?.name ?? 'Someone'} started following you`,
        { followerId }
      );

      res.status(201).json(follow);
    } catch (err: any) {
      // Handle unique constraint violation (already following)
      if (err?.code === 'P2002') {
        res.status(409).json({ error: 'Already following this user' });
        return;
      }
      next(err);
    }
  }
);

// DELETE /:userId — unfollow a user
followsRouter.delete(
  '/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const followerId = req.user!.id;
      const followingId = req.params.userId;

      await prisma.follow.deleteMany({
        where: {
          followerId,
          followingId,
        },
      });

      res.json({ message: 'Unfollowed successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// GET /following — list who I follow
followsRouter.get(
  '/following',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const follows = await prisma.follow.findMany({
        where: { followerId: req.user!.id },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              city: true,
              skillLevel: true,
            },
          },
        },
      });

      res.json(follows);
    } catch (err) {
      next(err);
    }
  }
);

// GET /followers — who follows me
followsRouter.get(
  '/followers',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const followers = await prisma.follow.findMany({
        where: { followingId: req.user!.id },
        include: {
          follower: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              city: true,
              skillLevel: true,
            },
          },
        },
      });

      res.json(followers);
    } catch (err) {
      next(err);
    }
  }
);
