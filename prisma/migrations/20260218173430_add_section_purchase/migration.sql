-- CreateTable
CREATE TABLE "SectionPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sectionHandle" TEXT NOT NULL,
    "appPurchaseId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionPurchase_appPurchaseId_key" ON "SectionPurchase"("appPurchaseId");

-- CreateIndex
CREATE INDEX "SectionPurchase_shop_idx" ON "SectionPurchase"("shop");

-- CreateIndex
CREATE INDEX "SectionPurchase_sectionHandle_idx" ON "SectionPurchase"("sectionHandle");
