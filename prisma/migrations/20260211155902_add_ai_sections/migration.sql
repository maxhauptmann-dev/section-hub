-- CreateTable
CREATE TABLE "AiSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "colorScheme" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "liquidCode" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "installed" BOOLEAN NOT NULL DEFAULT false,
    "installedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSection_shop_slug_key" ON "AiSection"("shop", "slug");

-- CreateIndex
CREATE INDEX "AiSection_shop_idx" ON "AiSection"("shop");
