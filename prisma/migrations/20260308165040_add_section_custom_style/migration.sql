-- Migration was previously applied but has been reverted by fix migration 20260308180000
-- Keeping this file as a placeholder so prisma migrate deploy doesn't fail
-- The actual changes from this migration are undone in 20260308180000_fix_restore_analyzed_at

-- CreateTable
CREATE TABLE IF NOT EXISTS "SectionCustomStyle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sectionHandle" TEXT NOT NULL,
    "customCSS" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- This migration originally dropped analyzedAt, which is restored in the next migration
