import prisma from './prisma.js';
import type { NotificationType } from '@prisma/client';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, data: data ?? undefined },
  });

  // Send push notification if user has a push token
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expoPushToken: true },
  });

  if (user?.expoPushToken) {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.expoPushToken,
          title,
          body,
          data: { ...data, notificationId: notification.id },
        }),
      });
    } catch {
      // Push notification delivery is best-effort
    }
  }

  return notification;
}
