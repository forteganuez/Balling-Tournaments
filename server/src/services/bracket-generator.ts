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

  if (format === 'DOUBLE_ELIMINATION') {
    return generateDoubleElimination(tournamentId, playerIds);
  }

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

/**
 * Double elimination bracket generator.
 *
 * Structure:
 * - Winners Bracket (WB): W rounds where W = log2(totalSlots)
 * - Losers Bracket (LB): 2*(W-1) rounds
 *   - Odd LB rounds: internal matchup (LB players face each other)
 *   - Even LB rounds: crossover (LB winners vs WB dropdowns)
 * - Grand Final: 1 match (WB champion vs LB champion)
 *
 * Match counts per LB round r: totalSlots / 2^(ceil(r/2) + 1)
 */
async function generateDoubleElimination(tournamentId: string, playerIds: string[]) {
  const playerCount = playerIds.length;
  const totalSlots = nextPowerOf2(playerCount);
  const wbRounds = Math.log2(totalSlots);
  const lbRounds = 2 * (wbRounds - 1);

  type MatchInput = {
    tournamentId: string;
    round: number;
    position: number;
    bracket: string;
    player1Id: string | null;
    player2Id: string | null;
    winnerId: string | null;
  };

  const matchData: MatchInput[] = [];

  // ── Winners Bracket Round 1 ──
  const wbR1Count = totalSlots / 2;
  for (let i = 0; i < wbR1Count; i++) {
    const p1 = i * 2 < playerCount ? playerIds[i * 2] : null;
    const p2 = i * 2 + 1 < playerCount ? playerIds[i * 2 + 1] : null;
    const isBye = p1 !== null && p2 === null;

    matchData.push({
      tournamentId,
      round: 1,
      position: i,
      bracket: 'WINNERS',
      player1Id: p1,
      player2Id: p2,
      winnerId: isBye ? p1 : null,
    });
  }

  // ── Winners Bracket Rounds 2..W ──
  for (let r = 2; r <= wbRounds; r++) {
    const count = totalSlots / Math.pow(2, r);
    for (let pos = 0; pos < count; pos++) {
      matchData.push({
        tournamentId,
        round: r,
        position: pos,
        bracket: 'WINNERS',
        player1Id: null,
        player2Id: null,
        winnerId: null,
      });
    }
  }

  // ── Losers Bracket Rounds 1..2*(W-1) ──
  for (let lbr = 1; lbr <= lbRounds; lbr++) {
    const k = Math.ceil(lbr / 2);
    const count = totalSlots / Math.pow(2, k + 1);
    for (let pos = 0; pos < count; pos++) {
      matchData.push({
        tournamentId,
        round: lbr,
        position: pos,
        bracket: 'LOSERS',
        player1Id: null,
        player2Id: null,
        winnerId: null,
      });
    }
  }

  // ── Grand Final ──
  matchData.push({
    tournamentId,
    round: 1,
    position: 0,
    bracket: 'GRAND_FINAL',
    player1Id: null,
    player2Id: null,
    winnerId: null,
  });

  // Create all matches in the database
  const created = await Promise.all(
    matchData.map((m) => prisma.match.create({ data: m }))
  );

  // ── Process WB Round 1 byes ──
  const wbR1Byes = created.filter(
    (m) => m.bracket === 'WINNERS' && m.round === 1 && m.winnerId !== null
  );

  for (const bye of wbR1Byes) {
    // Advance winner to WB R2
    const nextWBPos = Math.floor(bye.position / 2);
    const isP1Slot = bye.position % 2 === 0;

    const nextWBMatch = created.find(
      (m) => m.bracket === 'WINNERS' && m.round === 2 && m.position === nextWBPos
    );
    if (nextWBMatch) {
      await prisma.match.update({
        where: { id: nextWBMatch.id },
        data: isP1Slot
          ? { player1Id: bye.winnerId }
          : { player2Id: bye.winnerId },
      });
    }
    // No loser to drop to LB from a bye
  }

  // Check for LB R1 byes: if only one player arrives due to WB byes
  // This is handled naturally when WB R1 real results come in and
  // populate LB R1 — if one slot stays null, it becomes a bye.

  return created;
}

/**
 * Advance the winner (and handle the loser) after a double elimination match.
 * Called from the match result endpoints.
 */
export async function advanceDoubleElimination(
  match: { id: string; tournamentId: string; round: number; position: number; bracket: string | null },
  winnerId: string,
  loserId: string | null,
) {
  const allMatches = await prisma.match.findMany({
    where: { tournamentId: match.tournamentId },
  });

  const totalWBMatches = allMatches.filter((m) => m.bracket === 'WINNERS');
  const wbRounds = Math.max(...totalWBMatches.map((m) => m.round));
  const lbRounds = 2 * (wbRounds - 1);

  if (match.bracket === 'WINNERS') {
    // ── Winner advances to next WB round ──
    const nextWBRound = match.round + 1;
    if (nextWBRound <= wbRounds) {
      const nextPos = Math.floor(match.position / 2);
      const isP1 = match.position % 2 === 0;
      const nextMatch = allMatches.find(
        (m) => m.bracket === 'WINNERS' && m.round === nextWBRound && m.position === nextPos
      );
      if (nextMatch) {
        await prisma.match.update({
          where: { id: nextMatch.id },
          data: isP1 ? { player1Id: winnerId } : { player2Id: winnerId },
        });
      }
    } else {
      // WB Final winner goes to Grand Final as player1
      const gf = allMatches.find((m) => m.bracket === 'GRAND_FINAL');
      if (gf) {
        await prisma.match.update({
          where: { id: gf.id },
          data: { player1Id: winnerId },
        });
      }
    }

    // ── Loser drops to Losers Bracket ──
    if (loserId) {
      if (match.round === 1) {
        // WB R1 losers go to LB R1
        const lbPos = Math.floor(match.position / 2);
        const isP1 = match.position % 2 === 0;
        const lbMatch = allMatches.find(
          (m) => m.bracket === 'LOSERS' && m.round === 1 && m.position === lbPos
        );
        if (lbMatch) {
          const updated = await prisma.match.update({
            where: { id: lbMatch.id },
            data: isP1 ? { player1Id: loserId } : { player2Id: loserId },
          });
          // Check if LB match is now a bye (one player, other slot null from WB bye)
          await checkAndAdvanceLBBye(updated, allMatches, wbRounds);
        }
      } else {
        // WB Rn (n>=2) losers go to LB round 2*(n-1) as player2
        const lbRound = 2 * (match.round - 1);
        const lbMatch = allMatches.find(
          (m) => m.bracket === 'LOSERS' && m.round === lbRound && m.position === match.position
        );
        if (lbMatch) {
          const updated = await prisma.match.update({
            where: { id: lbMatch.id },
            data: { player2Id: loserId },
          });
          await checkAndAdvanceLBBye(updated, allMatches, wbRounds);
        }
      }
    }
  } else if (match.bracket === 'LOSERS') {
    const isLastLBRound = match.round === lbRounds;

    if (isLastLBRound) {
      // LB Final winner goes to Grand Final as player2
      const gf = allMatches.find((m) => m.bracket === 'GRAND_FINAL');
      if (gf) {
        await prisma.match.update({
          where: { id: gf.id },
          data: { player2Id: winnerId },
        });
      }
    } else if (match.round % 2 === 1) {
      // Odd LB round (internal): winner goes to next LB round (crossover) as player1
      const nextLBRound = match.round + 1;
      const nextMatch = allMatches.find(
        (m) => m.bracket === 'LOSERS' && m.round === nextLBRound && m.position === match.position
      );
      if (nextMatch) {
        await prisma.match.update({
          where: { id: nextMatch.id },
          data: { player1Id: winnerId },
        });
      }
    } else {
      // Even LB round (crossover): winner goes to next LB round (internal)
      const nextLBRound = match.round + 1;
      const nextPos = Math.floor(match.position / 2);
      const isP1 = match.position % 2 === 0;
      const nextMatch = allMatches.find(
        (m) => m.bracket === 'LOSERS' && m.round === nextLBRound && m.position === nextPos
      );
      if (nextMatch) {
        await prisma.match.update({
          where: { id: nextMatch.id },
          data: isP1 ? { player1Id: winnerId } : { player2Id: winnerId },
        });
      }
    }
    // Loser is eliminated — no further action
  }
  // GRAND_FINAL: no advancement needed, tournament is complete
}

/**
 * Check if a losers bracket match became a bye (one player, one null)
 * and auto-advance if so.
 */
async function checkAndAdvanceLBBye(
  match: { id: string; tournamentId: string; round: number; position: number; bracket: string | null; player1Id: string | null; player2Id: string | null },
  allMatches: Array<{ id: string; bracket: string | null; round: number; position: number }>,
  wbRounds: number,
) {
  // Re-fetch to get latest state
  const current = await prisma.match.findUnique({ where: { id: match.id } });
  if (!current) return;

  const hasP1 = current.player1Id !== null;
  const hasP2 = current.player2Id !== null;

  // Only one player = bye
  if ((hasP1 && !hasP2) || (!hasP1 && hasP2)) {
    // Check if this match's other slot will ever be filled
    // For LB R1: fed by two WB R1 matches. If one was a bye, only one loser comes.
    // We need to determine if the missing slot will be filled later.
    // For odd rounds (internal): both slots come from the same bracket round results
    // For even rounds (crossover): player1 from LB, player2 from WB
    // A slot won't be filled if the feeder was a bye (already resolved with no loser)

    // For LB R1: check if the corresponding WB R1 match was a bye
    if (current.round === 1 && current.bracket === 'LOSERS') {
      // This LB R1 match at position p is fed by WB R1 matches at positions 2p and 2p+1
      const wbPos1 = current.position * 2;
      const wbPos2 = current.position * 2 + 1;
      const wbMatch1 = allMatches.find(
        (m) => m.bracket === 'WINNERS' && m.round === 1 && m.position === wbPos1
      );
      const wbMatch2 = allMatches.find(
        (m) => m.bracket === 'WINNERS' && m.round === 1 && m.position === wbPos2
      );

      // If both WB matches exist and one was a bye (no player2), the LB match is a bye
      if (wbMatch1 && wbMatch2) {
        const wbM1 = await prisma.match.findUnique({ where: { id: wbMatch1.id } });
        const wbM2 = await prisma.match.findUnique({ where: { id: wbMatch2.id } });
        const feeder1IsBye = wbM1 && wbM1.winnerId !== null && wbM1.player2Id === null;
        const feeder2IsBye = wbM2 && wbM2.winnerId !== null && wbM2.player2Id === null;

        if (feeder1IsBye || feeder2IsBye) {
          // This is a legit bye — advance the solo player
          const byeWinner = current.player1Id ?? current.player2Id;
          if (byeWinner) {
            await prisma.match.update({
              where: { id: current.id },
              data: { winnerId: byeWinner, completedAt: new Date() },
            });
            await advanceDoubleElimination(
              { ...current, bracket: current.bracket ?? 'LOSERS' },
              byeWinner,
              null,
            );
          }
        }
      }
    }
  }
}
