-- CreateEnum
CREATE TYPE "OpenMatchStatus" AS ENUM ('OPEN', 'BOOKED', 'CANCELLED');

-- CreateTable
CREATE TABLE "OpenMatch" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "opponentId" TEXT,
    "sport" "Sport" NOT NULL,
    "location" TEXT NOT NULL,
    "venue" TEXT,
    "notes" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "OpenMatchStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpenMatch_status_scheduledFor_idx" ON "OpenMatch"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "OpenMatch_creatorId_status_idx" ON "OpenMatch"("creatorId", "status");

-- CreateIndex
CREATE INDEX "OpenMatch_opponentId_status_idx" ON "OpenMatch"("opponentId", "status");

-- AddForeignKey
ALTER TABLE "OpenMatch" ADD CONSTRAINT "OpenMatch_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenMatch" ADD CONSTRAINT "OpenMatch_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
