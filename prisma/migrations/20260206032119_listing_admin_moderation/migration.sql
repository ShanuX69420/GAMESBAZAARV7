-- CreateTable
CREATE TABLE "ListingModerationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "nextStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingModerationLog_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ListingModerationLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "offeringId" TEXT,
    "moderatedByAdminId" TEXT,
    "moderatedAt" DATETIME,
    "moderationReason" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pricePkr" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Listing_moderatedByAdminId_fkey" FOREIGN KEY ("moderatedByAdminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Listing_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Listing_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "GameOffering" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Listing" ("categoryId", "createdAt", "description", "gameId", "id", "offeringId", "pricePkr", "sellerId", "status", "title", "updatedAt") SELECT "categoryId", "createdAt", "description", "gameId", "id", "offeringId", "pricePkr", "sellerId", "status", "title", "updatedAt" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_sellerId_createdAt_idx" ON "Listing"("sellerId", "createdAt" DESC);
CREATE INDEX "Listing_gameId_categoryId_idx" ON "Listing"("gameId", "categoryId");
CREATE INDEX "Listing_offeringId_idx" ON "Listing"("offeringId");
CREATE INDEX "Listing_moderatedByAdminId_moderatedAt_idx" ON "Listing"("moderatedByAdminId", "moderatedAt" DESC);
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt" DESC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ListingModerationLog_listingId_createdAt_idx" ON "ListingModerationLog"("listingId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ListingModerationLog_adminId_createdAt_idx" ON "ListingModerationLog"("adminId", "createdAt" DESC);
