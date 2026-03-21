import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { AuthProvider, UserRole } from '@prisma/client';
import prisma from '../src/lib/prisma.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@balling.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'BallingAdmin123!';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Balling Admin';

async function ensureAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      role: UserRole.ADMIN,
      authProvider: AuthProvider.LOCAL,
      providerId: null,
      passwordHash,
      onboardingDone: true,
    },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: UserRole.ADMIN,
      authProvider: AuthProvider.LOCAL,
      providerId: null,
      passwordHash,
      onboardingDone: true,
    },
  });

  console.log(`Admin ready: ${user.email}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
}

ensureAdmin()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
