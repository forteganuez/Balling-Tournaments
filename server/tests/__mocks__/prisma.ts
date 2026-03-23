import { jest } from '@jest/globals';

// Deep mock of PrismaClient — each model returns jest.fn() for all operations
function createModelMock() {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  };
}

const prisma = {
  user: createModelMock(),
  tournament: createModelMock(),
  registration: createModelMock(),
  match: createModelMock(),
  matchResult: createModelMock(),
  friendship: createModelMock(),
  follow: createModelMock(),
  notification: createModelMock(),
  tournamentAnnouncement: createModelMock(),
  tournamentChat: createModelMock(),
  doublesTeam: createModelMock(),
  openMatch: createModelMock(),
  auditLog: createModelMock(),
  $transaction: jest.fn((fn: any) => fn(prisma)),
};

export default prisma;
