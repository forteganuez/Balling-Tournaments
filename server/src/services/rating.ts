import prisma from '../lib/prisma.js';
import type { Sport } from '@prisma/client';

const K_BASE = 0.8;
const K_CALIBRATION = 1.2;
const CALIBRATION_THRESHOLD = 10;
const INACTIVITY_DAYS = 60;
const DECAY_PER_MONTH = 0.1;
const MAX_DECAY = 1.0;

interface RatingChangeResult {
  delta: number;
  newRating: number;
  multiplier: number;
  expected: number;
}

export function calculateRatingChange(
  playerRating: number,
  opponentRating: number,
  won: boolean,
  matchesPlayed: number = CALIBRATION_THRESHOLD,
): RatingChangeResult {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 3));

  const K = matchesPlayed < CALIBRATION_THRESHOLD ? K_CALIBRATION : K_BASE;
  const score = won ? 1 : 0;
  const baseDelta = K * (score - expected);

  let multiplier: number;
  if (baseDelta > 0) {
    // Gain multiplier — higher at low ratings
    multiplier = 1.8 * Math.pow(1 - playerRating / 10, 1.4) + 0.2;
  } else {
    // Loss multiplier — higher at high ratings
    multiplier = 0.3 + 1.5 * Math.pow(playerRating / 10, 1.3);
  }

  const finalDelta = baseDelta * multiplier;
  const newRating = Math.max(0, Math.min(10, playerRating + finalDelta));

  return {
    delta: parseFloat(finalDelta.toFixed(3)),
    newRating: parseFloat(newRating.toFixed(3)),
    multiplier: parseFloat(multiplier.toFixed(3)),
    expected: parseFloat(expected.toFixed(4)),
  };
}

export function getInitialRating(selfAssessment?: string): number {
  switch (selfAssessment) {
    case 'never_played': return 1.0;
    case 'played_few_times': return 2.5;
    case 'play_regularly': return 4.0;
    case 'play_competitions': return 5.5;
    case 'semi_professional': return 7.0;
    default: return 3.0;
  }
}

export async function getOrCreateRating(userId: string, sport: Sport, initialRating?: number) {
  const existing = await prisma.userSportRating.findUnique({
    where: { userId_sport: { userId, sport } },
  });

  if (existing) return existing;

  const rating = initialRating ?? 3.0;
  return prisma.userSportRating.create({
    data: {
      userId,
      sport,
      rating,
      bestRating: rating,
    },
  });
}

export async function updateRatingsAfterMatch(
  matchId: string,
  winnerId: string,
  loserId: string,
  sport: Sport,
) {
  const [winnerRating, loserRating] = await Promise.all([
    getOrCreateRating(winnerId, sport),
    getOrCreateRating(loserId, sport),
  ]);

  const winnerChange = calculateRatingChange(
    winnerRating.rating,
    loserRating.rating,
    true,
    winnerRating.matchesPlayed,
  );

  const loserChange = calculateRatingChange(
    loserRating.rating,
    winnerRating.rating,
    false,
    loserRating.matchesPlayed,
  );

  const now = new Date();

  await prisma.$transaction([
    // Update winner rating
    prisma.userSportRating.update({
      where: { userId_sport: { userId: winnerId, sport } },
      data: {
        rating: winnerChange.newRating,
        matchesPlayed: { increment: 1 },
        wins: { increment: 1 },
        winStreak: winnerRating.winStreak + 1,
        bestRating: Math.max(winnerRating.bestRating, winnerChange.newRating),
        lastMatchDate: now,
      },
    }),
    // Update loser rating
    prisma.userSportRating.update({
      where: { userId_sport: { userId: loserId, sport } },
      data: {
        rating: loserChange.newRating,
        matchesPlayed: { increment: 1 },
        losses: { increment: 1 },
        winStreak: 0,
        bestRating: Math.max(loserRating.bestRating, loserChange.newRating),
        lastMatchDate: now,
      },
    }),
    // Rating history for winner
    prisma.ratingHistory.create({
      data: {
        userId: winnerId,
        sport,
        opponentId: loserId,
        opponentRating: loserRating.rating,
        result: 'WIN',
        delta: winnerChange.delta,
        newRating: winnerChange.newRating,
        matchId,
      },
    }),
    // Rating history for loser
    prisma.ratingHistory.create({
      data: {
        userId: loserId,
        sport,
        opponentId: winnerId,
        opponentRating: winnerRating.rating,
        result: 'LOSS',
        delta: loserChange.delta,
        newRating: loserChange.newRating,
        matchId,
      },
    }),
  ]);

  return {
    winner: {
      ratingBefore: winnerRating.rating,
      ratingAfter: winnerChange.newRating,
      delta: winnerChange.delta,
    },
    loser: {
      ratingBefore: loserRating.rating,
      ratingAfter: loserChange.newRating,
      delta: loserChange.delta,
    },
  };
}

export async function applyInactivityDecay() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS);

  const inactiveRatings = await prisma.userSportRating.findMany({
    where: {
      lastMatchDate: { lt: cutoffDate },
      rating: { gt: 0 },
    },
  });

  for (const rating of inactiveRatings) {
    const lastDecay = rating.lastDecayDate || rating.lastMatchDate;
    if (!lastDecay) continue;

    const monthsSinceLastDecay = Math.floor(
      (Date.now() - lastDecay.getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    if (monthsSinceLastDecay < 1) continue;

    // Calculate total decay already applied
    const originalRating = rating.bestRating; // approximation
    const totalDecayApplied = originalRating - rating.rating;

    if (totalDecayApplied >= MAX_DECAY) continue;

    const decayAmount = Math.min(DECAY_PER_MONTH, MAX_DECAY - totalDecayApplied);
    const newRating = Math.max(0, rating.rating - decayAmount);

    await prisma.userSportRating.update({
      where: { id: rating.id },
      data: {
        rating: parseFloat(newRating.toFixed(3)),
        lastDecayDate: new Date(),
      },
    });
  }
}
