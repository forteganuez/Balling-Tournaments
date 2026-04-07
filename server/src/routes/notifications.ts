import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { paginationQuerySchema, getPaginationParams } from '../lib/validation.js';

export const notificationsRouter = Router();

// GET / — list my notifications
notificationsRouter.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = paginationQuerySchema.parse(req.query);
      const { skip, take } = getPaginationParams(query);
      const where = { userId: req.user!.id };

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip,
          take,
        }),
        prisma.notification.count({ where }),
      ]);

      res.json({
        data: notifications,
        pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /read-all — mark all my notifications as read
// NOTE: This must be defined BEFORE /:id/read to avoid route conflicts
notificationsRouter.put(
  '/read-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id, read: false },
        data: { read: true },
      });

      res.json({ message: 'All notifications marked as read' });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /:id/read — mark single notification as read
notificationsRouter.put(
  '/:id/read',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: req.params.id },
      });

      if (!notification || notification.userId !== req.user!.id) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      const updated = await prisma.notification.update({
        where: { id: req.params.id },
        data: { read: true },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /:id — delete notification
notificationsRouter.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: req.params.id },
      });

      if (!notification || notification.userId !== req.user!.id) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      await prisma.notification.delete({
        where: { id: req.params.id },
      });

      res.json({ message: 'Notification deleted' });
    } catch (err) {
      next(err);
    }
  }
);
