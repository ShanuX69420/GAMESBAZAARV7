-- CreateTable
CREATE TABLE "OfferingPackageOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offeringId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OfferingPackageOption_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "GameOffering" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameOffering" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formatType" TEXT NOT NULL DEFAULT 'ACCOUNT',
    "currencyMode" TEXT NOT NULL DEFAULT 'OPEN_QUANTITY',
    "currencyUnitLabel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameOffering_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameOffering_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GameOffering" ("categoryId", "createdAt", "formatType", "gameId", "id", "name", "updatedAt") SELECT "categoryId", "createdAt", "formatType", "gameId", "id", "name", "updatedAt" FROM "GameOffering";
DROP TABLE "GameOffering";
ALTER TABLE "new_GameOffering" RENAME TO "GameOffering";
CREATE INDEX "GameOffering_categoryId_idx" ON "GameOffering"("categoryId");
CREATE UNIQUE INDEX "GameOffering_gameId_categoryId_key" ON "GameOffering"("gameId", "categoryId");
CREATE UNIQUE INDEX "GameOffering_gameId_name_key" ON "GameOffering"("gameId", "name");
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "offeringId" TEXT,
    "packageOptionId" TEXT,
    "moderatedByAdminId" TEXT,
    "moderatedAt" DATETIME,
    "moderationReason" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deliveryTimeText" TEXT,
    "formatData" JSONB,
    "pricePkr" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Listing_moderatedByAdminId_fkey" FOREIGN KEY ("moderatedByAdminId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Listing_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Listing_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "GameOffering" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Listing_packageOptionId_fkey" FOREIGN KEY ("packageOptionId") REFERENCES "OfferingPackageOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Listing" ("categoryId", "createdAt", "deliveryTimeText", "description", "formatData", "gameId", "id", "moderatedAt", "moderatedByAdminId", "moderationReason", "offeringId", "pricePkr", "sellerId", "status", "title", "updatedAt") SELECT "categoryId", "createdAt", "deliveryTimeText", "description", "formatData", "gameId", "id", "moderatedAt", "moderatedByAdminId", "moderationReason", "offeringId", "pricePkr", "sellerId", "status", "title", "updatedAt" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_sellerId_createdAt_idx" ON "Listing"("sellerId", "createdAt" DESC);
CREATE INDEX "Listing_gameId_categoryId_idx" ON "Listing"("gameId", "categoryId");
CREATE INDEX "Listing_offeringId_idx" ON "Listing"("offeringId");
CREATE INDEX "Listing_packageOptionId_idx" ON "Listing"("packageOptionId");
CREATE INDEX "Listing_moderatedByAdminId_moderatedAt_idx" ON "Listing"("moderatedByAdminId", "moderatedAt" DESC);
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt" DESC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OfferingPackageOption_offeringId_amount_idx" ON "OfferingPackageOption"("offeringId", "amount");

-- CreateIndex
CREATE UNIQUE INDEX "OfferingPackageOption_offeringId_amount_key" ON "OfferingPackageOption"("offeringId", "amount");
