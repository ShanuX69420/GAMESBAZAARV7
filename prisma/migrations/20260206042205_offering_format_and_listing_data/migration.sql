-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "deliveryTimeText" TEXT;
ALTER TABLE "Listing" ADD COLUMN "formatData" JSONB;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameOffering" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formatType" TEXT NOT NULL DEFAULT 'ACCOUNT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameOffering_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameOffering_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GameOffering" ("categoryId", "createdAt", "gameId", "id", "name", "updatedAt") SELECT "categoryId", "createdAt", "gameId", "id", "name", "updatedAt" FROM "GameOffering";
DROP TABLE "GameOffering";
ALTER TABLE "new_GameOffering" RENAME TO "GameOffering";
CREATE INDEX "GameOffering_categoryId_idx" ON "GameOffering"("categoryId");
CREATE UNIQUE INDEX "GameOffering_gameId_categoryId_key" ON "GameOffering"("gameId", "categoryId");
CREATE UNIQUE INDEX "GameOffering_gameId_name_key" ON "GameOffering"("gameId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
