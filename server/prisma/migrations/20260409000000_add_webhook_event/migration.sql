-- CreateTable
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_stripeEventId_key" ON "WebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WebhookEvent_stripeEventId_idx" ON "WebhookEvent"("stripeEventId");

-- CreateIndex (CreditPack)
CREATE UNIQUE INDEX IF NOT EXISTS "CreditPack_stripeTransactionId_key" ON "CreditPack"("stripeTransactionId");
