-- DropIndex
DROP INDEX "SectionPurchase_appPurchaseId_key";

-- CreateIndex
CREATE INDEX "SectionPurchase_appPurchaseId_idx" ON "SectionPurchase"("appPurchaseId");
