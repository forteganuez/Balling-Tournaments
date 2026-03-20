import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.match.deleteMany()
  await prisma.registration.deleteMany()
  await prisma.tournament.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = bcrypt.hashSync('password123', 10)

  // Create admin
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@balling.com',
      passwordHash,
      role: 'ADMIN',
    },
  })

  // Create organizer
  const organizer = await prisma.user.create({
    data: {
      name: 'María García',
      email: 'maria@balling.com',
      passwordHash,
      role: 'ORGANIZER',
    },
  })

  // Create players
  const carlos = await prisma.user.create({
    data: { name: 'Carlos López', email: 'carlos@example.com', passwordHash, role: 'PLAYER' },
  })
  const ana = await prisma.user.create({
    data: { name: 'Ana Martín', email: 'ana@example.com', passwordHash, role: 'PLAYER' },
  })
  const pablo = await prisma.user.create({
    data: { name: 'Pablo Ruiz', email: 'pablo@example.com', passwordHash, role: 'PLAYER' },
  })
  const lucia = await prisma.user.create({
    data: { name: 'Lucía Fernández', email: 'lucia@example.com', passwordHash, role: 'PLAYER' },
  })
  const diego = await prisma.user.create({
    data: { name: 'Diego Torres', email: 'diego@example.com', passwordHash, role: 'PLAYER' },
  })
  const elena = await prisma.user.create({
    data: { name: 'Elena Sánchez', email: 'elena@example.com', passwordHash, role: 'PLAYER' },
  })

  // Create tournaments
  const padelTournament = await prisma.tournament.create({
    data: {
      name: 'Madrid Open Padel',
      sport: 'PADEL',
      format: 'SINGLE_ELIMINATION',
      status: 'REGISTRATION_OPEN',
      description: 'Compete with the best padel players in Madrid. A single elimination tournament for all skill levels.',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      location: 'Madrid',
      venue: 'Club de Pádel Madrid',
      maxPlayers: 16,
      entryFee: 2500,
      organizerId: organizer.id,
    },
  })

  const tennisTournament = await prisma.tournament.create({
    data: {
      name: 'Barcelona Tennis Cup',
      sport: 'TENNIS',
      format: 'ROUND_ROBIN',
      status: 'REGISTRATION_OPEN',
      description: 'A classic round robin tennis tournament in the heart of Barcelona. Every player faces every other player.',
      date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      location: 'Barcelona',
      venue: 'Real Club de Tenis Barcelona',
      maxPlayers: 8,
      entryFee: 3000,
      organizerId: organizer.id,
    },
  })

  const squashTournament = await prisma.tournament.create({
    data: {
      name: 'Valencia Squash Open',
      sport: 'SQUASH',
      format: 'SINGLE_ELIMINATION',
      status: 'REGISTRATION_OPEN',
      description: 'An exciting squash tournament in Valencia. Fast-paced single elimination action.',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      location: 'Valencia',
      venue: 'Valencia Squash Center',
      maxPlayers: 8,
      entryFee: 2000,
      organizerId: organizer.id,
    },
  })

  // Register players for padel tournament
  const now = new Date()
  for (const player of [carlos, ana, pablo, lucia, diego]) {
    await prisma.registration.create({
      data: {
        userId: player.id,
        tournamentId: padelTournament.id,
        paidAt: now,
      },
    })
  }

  // Register players for tennis tournament
  for (const player of [carlos, ana, pablo]) {
    await prisma.registration.create({
      data: {
        userId: player.id,
        tournamentId: tennisTournament.id,
        paidAt: now,
      },
    })
  }

  console.log('Seed completed successfully!')
  console.log(`  - ${1} admin, ${1} organizer, ${6} players created`)
  console.log(`  - ${3} tournaments created`)
  console.log(`  - ${5} padel registrations, ${3} tennis registrations created`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
