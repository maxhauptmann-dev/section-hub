-- CreateTable
CREATE TABLE "SectionInstallation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sectionHandle" TEXT NOT NULL,
    "installedVersion" TEXT NOT NULL,
    "themeId" TEXT,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SectionInstallation_shop_idx" ON "SectionInstallation"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "SectionInstallation_shop_sectionHandle_key" ON "SectionInstallation"("shop", "sectionHandle");
