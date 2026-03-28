-- CreateIndex
CREATE INDEX "Match_tournamentId_round_position_idx" ON "Match"("tournamentId", "round", "position");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Registration_tournamentId_idx" ON "Registration"("tournamentId");

-- CreateIndex
CREATE INDEX "Tournament_date_idx" ON "Tournament"("date");

-- CreateIndex
CREATE INDEX "Tournament_sport_status_idx" ON "Tournament"("sport", "status");

-- CreateIndex
CREATE INDEX "Tournament_organizerId_idx" ON "Tournament"("organizerId");

-- CreateIndex
CREATE INDEX "TournamentChat_tournamentId_createdAt_idx" ON "TournamentChat"("tournamentId", "createdAt");
