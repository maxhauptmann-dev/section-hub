-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StoreAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "storeScore" INTEGER NOT NULL DEFAULT 0,
    "activeCount" INTEGER NOT NULL DEFAULT 0,
    "totalTypes" INTEGER NOT NULL DEFAULT 14,
    "missingCritical" TEXT NOT NULL DEFAULT '[]',
    "missingHigh" TEXT NOT NULL DEFAULT '[]',
    "mainThemeName" TEXT NOT NULL DEFAULT 'Unknown',
    "totalThemeSections" INTEGER NOT NULL DEFAULT 0,
    "sectionHubInstalled" INTEGER NOT NULL DEFAULT 0,
    "activeSectionsCount" INTEGER NOT NULL DEFAULT 0,
    "results" TEXT NOT NULL DEFAULT '[]',
    "pageMap" TEXT NOT NULL DEFAULT '{}',
    "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StoreAnalysis" ("activeCount", "analyzedAt", "createdAt", "id", "missingCritical", "missingHigh", "shop", "storeScore", "totalTypes", "updatedAt") SELECT "activeCount", "analyzedAt", "createdAt", "id", "missingCritical", "missingHigh", "shop", "storeScore", "totalTypes", "updatedAt" FROM "StoreAnalysis";
DROP TABLE "StoreAnalysis";
ALTER TABLE "new_StoreAnalysis" RENAME TO "StoreAnalysis";
CREATE UNIQUE INDEX "StoreAnalysis_shop_key" ON "StoreAnalysis"("shop");
CREATE INDEX "StoreAnalysis_shop_idx" ON "StoreAnalysis"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
