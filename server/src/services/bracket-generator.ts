import prisma from '../lib/prisma.js';
import { TournamentFormat } from '@prisma/client';

/**
 * Returns the smallest power of 2 that is >= n.
 */
function nextPowerOf2(n: number): number {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Fisher-Yates shuffle — returns a new shuffled array.
 */
function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate bracket matches for a tournament based on its format.
 */
export async function generateBrackets(
  tournamentId: string,
  format: TournamentFormat
) {
  const registrations = await prisma.registration.findMany({
    where: { tournamentId },
    select: { userId: true },
  });

  const playerIds = shuffle(registrations.map((r) => r.userId));
  const playerCount = playerIds.length;

  if (playerCount < 2) {
    throw new Error('Not enough players to generate brackets');
  }

  if (format === 'SINGLE_ELIMINATION') {
    return generateSingleElimination(tournamentId, playerIds);
  }

  if (format === 'ROUND_ROBIN') {
    return generateRoundRobin(tournamentId, playerIds);
  }

  // DOUBLE_ELIMINATION — fall back to single elimination for now
  return generateSingleElimination(tournamentId, playerIds);
}

async function generateSingleElimination(tournamentId: string, playerIds: string[]) {
  const playerCount = playerIds.length;
  const totalSlots = nextPowerOf2(playerCount);
  const totalRounds = Math.log2(totalSlots);
  const matches: Array<{
    tournamentId: string;
    round: number;
    position: number;
    player1Id: string | null;
    player2Id: string | null;
    winnerId: string | null;
  }> = [];

  // Round 1: assign players, handle byes
  const round1MatchCount = totalSlots / 2;
  for (let i = 0; i < round1MatchCount; i++) {
    const player1Index = i * 2;
    const player2Index = i * 2 + 1;

    const player1Id = player1Index < playerCount ? playerIds[player1Index] : null;
    const player2Id = player2Index < playerCount ? playerIds[player2Index] : null;

    // If only one player, it's a bye — they auto-win
    const isBye = player1Id !== null && player2Id === null;

    matches.push({
      tournamentId,
      round: 1,
      position: i,
      player1Id,
      player2Id,
      winnerId: isBye ? player1Id : null,
    });
  }

  // Rounds 2 through totalRounds: empty matches
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = totalSlots / Math.pow(2, round);
    for (let pos = 0; pos < matchesInRound; pos++) {
      matches.push({
        tournamentId,
        round,
        position: pos,
        player1Id: null,
        player2Id: null,
        winnerId: null,
      });
    }
  }

  // Create all matches in the database
  const createdMatches = await Promise.all(
    matches.map((match) =>
      prisma.match.create({ data: match })
    )
  );

  // For bye matches in round 1, advance winners to round 2
  const byeMatches = createdMatches.filter(
    (m) => m.round === 1 && m.winnerId !== null
  );

  for (const byeMatch of byeMatches) {
    const nextRound = 2;
    const nextPosition = Math.floor(byeMatch.position / 2);
    const isPlayer1Slot = byeMatch.position % 2 === 0;

    const nextMatch = createdMatches.find(
      (m) => m.round === nextRound && m.position === nextPosition
    );

    if (nextMatch) {
      await prisma.match.update({
        where: { id: nextMatch.id },
        data: isPlayer1Slot
          ? { player1Id: byeMatch.winnerId }
          : { player2Id: byeMatch.winnerId },
      });
    }
  }

  return createdMatches;
}

async function generateRoundRobin(tournamentId: string, playerIds: string[]) {
  const matches: Array<{
    tournamentId: string;
    round: number;
    position: number;
    player1Id: string;
    player2Id: string;
  }> = [];

  let position = 0;
  // Distribute across rounds for better scheduling
  let round = 1;
  const matchesPerRound = Math.floor(playerIds.length / 2);

  for (let i = 0; i < playerIds.length; i++) {
    for (let j = i + 1; j < playerIds.length; j++) {
      matches.push({
        tournamentId,
        round,
        position,
        player1Id: playerIds[i],
        player2Id: playerIds[j],
      });

      position++;
      if (matchesPerRound > 0 && position % matchesPerRound === 0) {
        round++;
        position = 0;
      }
    }
  }

  const createdMatches = await Promise.all(
    matches.map((match) =>
      prisma.match.create({ data: match })
    )
  );

  return createdMatches;
}
