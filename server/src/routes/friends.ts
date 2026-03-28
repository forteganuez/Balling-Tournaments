import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { createNotification } from '../lib/notifications.js';

export const friendsRouter = Router();

const MAX_FRIENDS = 500;

// POST /request/:userId — send friend request
friendsRouter.post(
  '/request/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const receiverId = req.params.userId;
      const requesterId = req.user!.id;

      if (receiverId === requesterId) {
        res.status(400).json({ error: 'Cannot send friend request to yourself' });
        return;
      }

      // Check if either user has blocked the other
      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: requesterId, blockedId: receiverId },
            { blockerId: receiverId, blockedId: requesterId },
          ],
        },
      });
      if (block) {
        res.status(403).json({ error: 'Cannot send friend request to this user' });
        return;
      }

      // Check friend limit for requester
      const requesterFriendCount = await prisma.friendship.count({
        where: {
          OR: [{ requesterId }, { receiverId: requesterId }],
          status: 'ACCEPTED',
        },
      });
      if (requesterFriendCount >= MAX_FRIENDS) {
        res.status(400).json({ error: `You have reached the maximum of ${MAX_FRIENDS} friends` });
        return;
      }

      // Check if friendship already exists in either direction
      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId, receiverId },
            { requesterId: receiverId, receiverId: requesterId },
          ],
        },
      });

      if (existing) {
        res.status(409).json({ error: 'Friend request already exists or you are already friends' });
        return;
      }

      const friendship = await prisma.friendship.create({
        data: {
          requesterId,
          receiverId,
          status: 'PENDING',
        },
      });

      const requester = await prisma.user.findUnique({
        where: { id: requesterId },
        select: { username: true, name: true },
      });

      await createNotification(
        receiverId,
        'FRIEND_REQUEST',
        'New Friend Request',
        `${requester?.username ?? requester?.name ?? 'Someone'} wants to be your friend`,
        { requesterId }
      );

      res.status(201).json(friendship);
    } catch (err) {
      next(err);
    }
  }
);

// POST /accept/:userId — accept friend request
friendsRouter.post(
  '/accept/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requesterId = req.params.userId;
      const receiverId = req.user!.id;

      const friendship = await prisma.friendship.findFirst({
        where: {
          requesterId,
          receiverId,
          status: 'PENDING',
        },
      });

      if (!friendship) {
        res.status(404).json({ error: 'Pending friend request not found' });
        return;
      }

      const updated = await prisma.friendship.update({
        where: { id: friendship.id },
        data: { status: 'ACCEPTED' },
      });

      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { name: true },
      });

      await createNotification(
        requesterId,
        'FRIEND_ACCEPTED',
        'Friend Request Accepted',
        `${receiver?.name ?? 'Someone'} accepted your friend request`,
        { receiverId }
      );

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// POST /decline/:userId — decline friend request
friendsRouter.post(
  '/decline/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requesterId = req.params.userId;
      const receiverId = req.user!.id;

      const friendship = await prisma.friendship.findFirst({
        where: {
          requesterId,
          receiverId,
          status: 'PENDING',
        },
      });

      if (!friendship) {
        res.status(404).json({ error: 'Pending friend request not found' });
        return;
      }

      const updated = await prisma.friendship.update({
        where: { id: friendship.id },
        data: { status: 'DECLINED' },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /:userId — remove friend
friendsRouter.delete(
  '/:userId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const me = req.user!.id;
      const them = req.params.userId;

      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: me, receiverId: them },
            { requesterId: them, receiverId: me },
          ],
          status: 'ACCEPTED',
        },
      });

      if (!friendship) {
        res.status(404).json({ error: 'Friendship not found' });
        return;
      }

      await prisma.friendship.delete({
        where: { id: friendship.id },
      });

      res.json({ message: 'Friend removed' });
    } catch (err) {
      next(err);
    }
  }
);

// GET / — list accepted friends
friendsRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const me = req.user!.id;

      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { requesterId: me },
            { receiverId: me },
          ],
          status: 'ACCEPTED',
        },
        include: {
          requester: true,
          receiver: true,
        },
      });

      // Return the "other" user for each friendship
      const friends = friendships.map((f) =>
        f.requesterId === me ? f.receiver : f.requester
      );

      res.json(friends);
    } catch (err) {
      next(err);
    }
  }
);

// GET /requests — incoming pending requests
friendsRouter.get(
  '/requests',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const me = req.user!.id;

      const requests = await prisma.friendship.findMany({
        where: {
          receiverId: me,
          status: 'PENDING',
        },
        include: {
          requester: true,
        },
      });

      res.json(requests);
    } catch (err) {
      next(err);
    }
  }
);
