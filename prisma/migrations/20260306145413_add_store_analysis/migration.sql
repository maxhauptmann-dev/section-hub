-- CreateTable
CREATE TABLE "StoreAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "storeScore" INTEGER NOT NULL DEFAULT 0,
    "activeCount" INTEGER NOT NULL DEFAULT 0,
    "totalTypes" INTEGER NOT NULL DEFAULT 14,
    "missingCritical" TEXT NOT NULL DEFAULT '[]',
    "missingHigh" TEXT NOT NULL DEFAULT '[]',
    "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreAnalysis_shop_key" ON "StoreAnalysis"("shop");

-- CreateIndex
CREATE INDEX "StoreAnalysis_shop_idx" ON "StoreAnalysis"("shop");
