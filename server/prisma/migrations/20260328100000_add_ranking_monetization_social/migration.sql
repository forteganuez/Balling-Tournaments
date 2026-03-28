-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('CASUAL', 'COMPETITIVE');

-- CreateEnum
CREATE TYPE "MatchFormat" AS ENUM ('SINGLES', 'DOUBLES');

-- CreateEnum
CREATE TYPE "CompetitiveMatchStatus" AS ENUM ('CREATED', 'AWAITING_OPPONENT', 'ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT', 'INDIVIDUAL', 'BALLER_SUBSCRIPTION', 'NONE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'OFFENSIVE_BEHAVIOR', 'FAKE_ACCOUNT', 'MATCH_MANIPULATION');

-- AlterEnum
ALTER TYPE "FriendshipStatus" ADD VALUE 'BLOCKED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "isBaller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "lookingForMatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lookingForMatchSport" "Sport",
ADD COLUMN     "profileVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showMatchHistory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showRating" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "username" TEXT,
ADD COLUMN     "usernameChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserSportRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "winStreak" INTEGER NOT NULL DEFAULT 0,
    "bestRating" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "lastMatchDate" TIMESTAMP(3),
    "lastDecayDate" TIMESTAMP(3),

    CONSTRAINT "UserSportRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "opponentId" TEXT NOT NULL,
    "opponentRating" DOUBLE PRECISION NOT NULL,
    "result" TEXT NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "newRating" DOUBLE PRECISION NOT NULL,
    "matchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitiveMatch" (
    "id" TEXT NOT NULL,
    "type" "MatchType" NOT NULL,
    "sport" "Sport" NOT NULL,
    "format" "MatchFormat" NOT NULL DEFAULT 'SINGLES',
    "status" "CompetitiveMatchStatus" NOT NULL DEFAULT 'CREATED',
    "playerAId" TEXT NOT NULL,
    "playerARatingBefore" DOUBLE PRECISION,
    "playerARatingAfter" DOUBLE PRECISION,
    "playerAPaymentMethod" "PaymentMethod" NOT NULL DEFAULT 'NONE',
    "playerACreditId" TEXT,
    "playerATransactionId" TEXT,
    "playerAConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "playerBId" TEXT,
    "playerBRatingBefore" DOUBLE PRECISION,
    "playerBRatingAfter" DOUBLE PRECISION,
    "playerBPaymentMethod" "PaymentMethod" NOT NULL DEFAULT 'NONE',
    "playerBCreditId" TEXT,
    "playerBTransactionId" TEXT,
    "playerBConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "winnerId" TEXT,
    "disputed" BOOLEAN NOT NULL DEFAULT false,
    "score" TEXT,
    "resultDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CompetitiveMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditPack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "creditsRemaining" INTEGER NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "stripeTransactionId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BallerSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BallerSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "matchId" TEXT,
    "creditPackId" TEXT,
    "stripePaymentId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSportRating_sport_rating_idx" ON "UserSportRating"("sport", "rating" DESC);

-- CreateIndex
CREATE INDEX "UserSportRating_userId_idx" ON "UserSportRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSportRating_userId_sport_key" ON "UserSportRating"("userId", "sport");

-- CreateIndex
CREATE INDEX "RatingHistory_userId_sport_createdAt_idx" ON "RatingHistory"("userId", "sport", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CompetitiveMatch_playerAId_status_idx" ON "CompetitiveMatch"("playerAId", "status");

-- CreateIndex
CREATE INDEX "CompetitiveMatch_playerBId_status_idx" ON "CompetitiveMatch"("playerBId", "status");

-- CreateIndex
CREATE INDEX "CompetitiveMatch_sport_status_idx" ON "CompetitiveMatch"("sport", "status");

-- CreateIndex
CREATE INDEX "CompetitiveMatch_status_createdAt_idx" ON "CompetitiveMatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "Report_reportedId_resolved_idx" ON "Report"("reportedId", "resolved");

-- CreateIndex
CREATE INDEX "Report_resolved_createdAt_idx" ON "Report"("resolved", "createdAt");

-- CreateIndex
CREATE INDEX "CreditPack_userId_idx" ON "CreditPack"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BallerSubscription_userId_key" ON "BallerSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Transaction_matchId_idx" ON "Transaction"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- AddForeignKey
ALTER TABLE "UserSportRating" ADD CONSTRAINT "UserSportRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatch" ADD CONSTRAINT "CompetitiveMatch_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitiveMatch" ADD CONSTRAINT "CompetitiveMatch_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditPack" ADD CONSTRAINT "CreditPack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallerSubscription" ADD CONSTRAINT "BallerSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
