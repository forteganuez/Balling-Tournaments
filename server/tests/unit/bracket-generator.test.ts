import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock prisma before importing the module under test
const mockCreate = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockFindMany = jest.fn<any>();
const mockFindUnique = jest.fn<any>();

jest.unstable_mockModule('../../src/lib/prisma.js', () => ({
  default: {
    registration: { findMany: mockFindMany },
    match: {
      create: mockCreate,
      update: mockUpdate,
      findMany: jest.fn(),
      findUnique: mockFindUnique,
    },
  },
}));

const { generateBrackets } = await import('../../src/services/bracket-generator.js');

describe('Bracket Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // By default, create returns the match data + an id
    mockCreate.mockImplementation(async ({ data }: any) => ({
      id: `match-${data.bracket ?? 'SE'}-${data.round}-${data.position}`,
      ...data,
    }));
    mockUpdate.mockImplementation(async ({ where, data }: any) => ({
      id: where.id,
      ...data,
    }));
  });

  describe('Single Elimination', () => {
    it('rejects fewer than 2 players', async () => {
      mockFindMany.mockResolvedValue([{ userId: 'p1' }]);
      await expect(generateBrackets('t1', 'SINGLE_ELIMINATION'))
        .rejects.toThrow('Not enough players');
    });

    it('generates correct matches for 4 players', async () => {
      mockFindMany.mockResolvedValue([
        { userId: 'p1' }, { userId: 'p2' },
        { userId: 'p3' }, { userId: 'p4' },
      ]);

      await generateBrackets('t1', 'SINGLE_ELIMINATION');

      // 4 players = 2 round-1 matches + 1 round-2 match = 3 total
      expect(mockCreate).toHaveBeenCalledTimes(3);

      const createdMatches = mockCreate.mock.calls.map((c: any) => c[0].data);

      // Round 1: 2 matches with players assigned
      const r1 = createdMatches.filter((m: any) => m.round === 1);
      expect(r1).toHaveLength(2);
      expect(r1[0].player1Id).toBeTruthy();
      expect(r1[0].player2Id).toBeTruthy();
      expect(r1[0].winnerId).toBeNull();

      // Round 2: 1 empty match (final)
      const r2 = createdMatches.filter((m: any) => m.round === 2);
      expect(r2).toHaveLength(1);
      expect(r2[0].player1Id).toBeNull();
      expect(r2[0].player2Id).toBeNull();
    });

    it('handles byes for 3 players (padded to 4 slots)', async () => {
      mockFindMany.mockResolvedValue([
        { userId: 'p1' }, { userId: 'p2' }, { userId: 'p3' },
      ]);

      await generateBrackets('t1', 'SINGLE_ELIMINATION');

      const createdMatches = mockCreate.mock.calls.map((c: any) => c[0].data);
      const r1 = createdMatches.filter((m: any) => m.round === 1);

      // One match should be a bye (player1 set, player2 null, winnerId set)
      const byes = r1.filter((m: any) => m.winnerId !== null);
      expect(byes.length).toBeGreaterThanOrEqual(1);
      expect(byes[0].player2Id).toBeNull();

      // Bye winner should be advanced to round 2
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('generates correct matches for 8 players', async () => {
      const players = Array.from({ length: 8 }, (_, i) => ({ userId: `p${i + 1}` }));
      mockFindMany.mockResolvedValue(players);

      await generateBrackets('t1', 'SINGLE_ELIMINATION');

      // 8 players: 4 R1 + 2 R2 + 1 R3 = 7 matches
      expect(mockCreate).toHaveBeenCalledTimes(7);

      const createdMatches = mockCreate.mock.calls.map((c: any) => c[0].data);
      expect(createdMatches.filter((m: any) => m.round === 1)).toHaveLength(4);
      expect(createdMatches.filter((m: any) => m.round === 2)).toHaveLength(2);
      expect(createdMatches.filter((m: any) => m.round === 3)).toHaveLength(1);
    });
  });

  describe('Round Robin', () => {
    it('generates n*(n-1)/2 matches for n players', async () => {
      const players = Array.from({ length: 4 }, (_, i) => ({ userId: `p${i + 1}` }));
      mockFindMany.mockResolvedValue(players);

      await generateBrackets('t1', 'ROUND_ROBIN');

      // 4 players: C(4,2) = 6 matches
      expect(mockCreate).toHaveBeenCalledTimes(6);

      const createdMatches = mockCreate.mock.calls.map((c: any) => c[0].data);

      // Every match should have both players assigned
      for (const m of createdMatches) {
        expect(m.player1Id).toBeTruthy();
        expect(m.player2Id).toBeTruthy();
        expect(m.player1Id).not.toBe(m.player2Id);
      }
    });

    it('generates correct count for 6 players', async () => {
      const players = Array.from({ length: 6 }, (_, i) => ({ userId: `p${i + 1}` }));
      mockFindMany.mockResolvedValue(players);

      await generateBrackets('t1', 'ROUND_ROBIN');

      // 6 players: C(6,2) = 15 matches
      expect(mockCreate).toHaveBeenCalledTimes(15);
    });

    it('ensures every pair plays exactly once', async () => {
      const players = Array.from({ length: 5 }, (_, i) => ({ userId: `p${i + 1}` }));
      mockFindMany.mockResolvedValue(players);

      await generateBrackets('t1', 'ROUND_ROBIN');

      const createdMatches = mockCreate.mock.calls.map((c: any) => c[0].data);
      const pairs = new Set<string>();

      for (const m of createdMatches) {
        const pair = [m.player1Id, m.player2Id].sort().join('-');
        expect(pairs.has(pair)).toBe(false);
        pairs.add(pair);
      }

      // C(5,2) = 10 unique pairs
      expect(pairs.size).toBe(10);
    });
  });

  describe('Double Elimination', () => {
    it('generates WB, LB, and Grand Final matches for 4 players', async () => {
      const players = Array.from({ length: 4 }, (_, i) => ({ userId: `p${i + 1}` }));
      mockFindMany.mockResolvedValue(players);

      await generateBrackets('t1', 'DOUBLE_ELIMINATION');

      const createdMatches = mockCreate.mock.calls.map((c: any) => c[0].data);

      const wb = createdMatches.filter((m: any) => m.bracket === 'WINNERS');
      const lb = createdMatches.filter((m: any) => m.bracket === 'LOSERS');
      const gf = createdMatches.filter((m: any) => m.bracket === 'GRAND_FINAL');

      // 4 players, totalSlots=4, W=2
      // WB: R1=2 matches, R2=1 match = 3
      expect(wb).toHaveLength(3);

      // LB: 2*(W-1) = 2 rounds. LB R1: 1 match, LB R2: 1 match = 2
      expect(lb).toHaveLength(2);

      // Grand Final: 1 match
      expect(gf).toHaveLength(1);
    });

    it('generates correct structure for 8 players', async () => {
      const players = Array.from({ length: 8 }, (_, i) => ({ userId: `p${i + 1}` }));
      mockFindMany.mockResolvedValue(players);

      await generateBrackets('t1', 'DOUBLE_ELIMINATION');

      const createdMatches = mockCreate.mock.calls.map((c: any) => c[0].data);

      const wb = createdMatches.filter((m: any) => m.bracket === 'WINNERS');
      const lb = createdMatches.filter((m: any) => m.bracket === 'LOSERS');
      const gf = createdMatches.filter((m: any) => m.bracket === 'GRAND_FINAL');

      // 8 players, totalSlots=8, W=3
      // WB: R1=4, R2=2, R3=1 = 7
      expect(wb).toHaveLength(7);

      // LB: 2*(3-1) = 4 rounds
      // LB R1: 8/4=2, LB R2: 2, LB R3: 1, LB R4: 1 = 6
      expect(lb).toHaveLength(6);

      // Grand Final: 1
      expect(gf).toHaveLength(1);

      // Total: 7 + 6 + 1 = 14
      expect(createdMatches).toHaveLength(14);
    });

    it('assigns players only to WB round 1', async () => {
      const players = Array.from({ length: 4 }, (_, i) => ({ userId: `p${i + 1}` }));
      mockFindMany.mockResolvedValue(players);

      await generateBrackets('t1', 'DOUBLE_ELIMINATION');

      const createdMatches = mockCreate.mock.calls.map((c: any) => c[0].data);

      // WB R1 matches should have players
      const wbR1 = createdMatches.filter(
        (m: any) => m.bracket === 'WINNERS' && m.round === 1
      );
      for (const m of wbR1) {
        expect(m.player1Id).toBeTruthy();
        expect(m.player2Id).toBeTruthy();
      }

      // All other matches should have null players
      const others = createdMatches.filter(
        (m: any) => !(m.bracket === 'WINNERS' && m.round === 1)
      );
      for (const m of others) {
        expect(m.player1Id).toBeNull();
        expect(m.player2Id).toBeNull();
      }
    });

    it('handles byes in WB round 1 for 3 players', async () => {
      const players = [{ userId: 'p1' }, { userId: 'p2' }, { userId: 'p3' }];
      mockFindMany.mockResolvedValue(players);
      mockFindUnique.mockResolvedValue(null); // for bye check

      await generateBrackets('t1', 'DOUBLE_ELIMINATION');

      const createdMatches = mockCreate.mock.calls.map((c: any) => c[0].data);

      // 3 players → 4 slots → WB R1 has 2 matches, one is a bye
      const wbR1 = createdMatches.filter(
        (m: any) => m.bracket === 'WINNERS' && m.round === 1
      );
      const byes = wbR1.filter((m: any) => m.winnerId !== null);
      expect(byes.length).toBeGreaterThanOrEqual(1);

      // Bye winner should be advanced to WB R2
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});
