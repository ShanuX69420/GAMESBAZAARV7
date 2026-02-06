-- CreateTable
CREATE TABLE "GameOffering" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameOffering_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameOffering_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "GameOffering" ("id", "gameId", "categoryId", "name", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(16))),
    gc."gameId",
    gc."categoryId",
    trim(g."name" || ' ' || c."name"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "GameCategory" gc
INNER JOIN "Game" g ON g."id" = gc."gameId"
INNER JOIN "Category" c ON c."id" = gc."categoryId";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "offeringId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pricePkr" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Listing_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Listing_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "GameOffering" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Listing" ("categoryId", "createdAt", "description", "gameId", "id", "pricePkr", "sellerId", "status", "title", "updatedAt") SELECT "categoryId", "createdAt", "description", "gameId", "id", "pricePkr", "sellerId", "status", "title", "updatedAt" FROM "Listing";
DROP TABLE "Listing";
ALTER TABLE "new_Listing" RENAME TO "Listing";
CREATE INDEX "Listing_sellerId_createdAt_idx" ON "Listing"("sellerId", "createdAt" DESC);
CREATE INDEX "Listing_gameId_categoryId_idx" ON "Listing"("gameId", "categoryId");
CREATE INDEX "Listing_offeringId_idx" ON "Listing"("offeringId");
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt" DESC);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GameOffering_categoryId_idx" ON "GameOffering"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "GameOffering_gameId_categoryId_key" ON "GameOffering"("gameId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "GameOffering_gameId_name_key" ON "GameOffering"("gameId", "name");
