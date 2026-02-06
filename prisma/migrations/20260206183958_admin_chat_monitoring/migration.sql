-- CreateTable
CREATE TABLE "AdminConversationViewLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminConversationViewLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdminConversationViewLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AdminConversationViewLog_conversationId_viewedAt_idx" ON "AdminConversationViewLog"("conversationId", "viewedAt" DESC);

-- CreateIndex
CREATE INDEX "AdminConversationViewLog_adminId_viewedAt_idx" ON "AdminConversationViewLog"("adminId", "viewedAt" DESC);
