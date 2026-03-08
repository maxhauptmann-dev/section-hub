-- CreateTable
CREATE TABLE "SectionPreview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "themeName" TEXT NOT NULL,
    "sectionFileName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "removedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionPreview_shop_sectionId_key" ON "SectionPreview"("shop", "sectionId");

-- CreateIndex
CREATE INDEX "SectionPreview_expiresAt_idx" ON "SectionPreview"("expiresAt");

-- CreateIndex
CREATE INDEX "SectionPreview_removed_idx" ON "SectionPreview"("removed");
