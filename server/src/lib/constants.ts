import type { Prisma } from '@prisma/client';

/**
 * Safe user fields for public/semi-public exposure.
 * Explicitly excludes: email, passwordHash, providerId, expoPushToken,
 * isMuted, isBanned, profileVisible, showMatchHistory, and other sensitive fields.
 */
export const SAFE_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  name: true,
  avatarUrl: true,
  isBaller: true,
  wins: true,
  losses: true,
  matchesPlayed: true,
} satisfies Prisma.UserSelect;
