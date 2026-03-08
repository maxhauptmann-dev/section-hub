import fs from "fs";
import path from "path";

export interface SectionPreview {
  src: string;       // relative path or URL to image
  alt: string;       // description of this variant
  label?: string;    // e.g. "Dark Mode", "Minimal", "With Icons"
}

export interface ChangelogEntry {
  version: string;       // e.g. "1.1.0"
  date: string;          // e.g. "2026-03-04"
  changes: string[];     // list of changes
}

export interface SectionMeta {
  id: string;
  name: string;
  description: string;
  category: string | string[];
  version: string;
  price: {
    type: "free" | "one_time";
    amount?: number;
    currency?: "EUR" | "USD";
  };
  tags: string[];
  author: string;
  previewColor: string;
  previews?: SectionPreview[];  // multiple preview images showing different variants
  changelog?: ChangelogEntry[]; // version history
  compatibility: {
    themes: string[];
    os2: boolean;
  };
  files: {
    liquid: string;
    css: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SectionWithFiles extends SectionMeta {
  liquidContent: string;
  cssContent: string;
}

const SECTIONS_DIR = path.join(process.cwd(), "app", "sections");

// ── In-memory cache ──
// Sections only change on deploy, so we read once and cache for the lifetime
// of the process. This eliminates ~22 fs.readFileSync calls per request.
let _cachedSections: SectionMeta[] | null = null;

function loadSectionsFromDisk(): SectionMeta[] {
  const sections: SectionMeta[] = [];

  if (!fs.existsSync(SECTIONS_DIR)) {
    console.warn("Sections directory not found:", SECTIONS_DIR);
    return sections;
  }

  const folders = fs.readdirSync(SECTIONS_DIR, { withFileTypes: true });

  for (const folder of folders) {
    if (!folder.isDirectory()) continue;

    const metaPath = path.join(SECTIONS_DIR, folder.name, "meta.json");

    if (fs.existsSync(metaPath)) {
      try {
        const metaContent = fs.readFileSync(metaPath, "utf-8");
        const meta = JSON.parse(metaContent) as SectionMeta;
        sections.push(meta);
      } catch (error) {
        console.error(`Error loading section ${folder.name}:`, error);
      }
    }
  }

  // Sort by updatedAt (newest first)
  sections.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

  return sections;
}

/**
 * Loads all available sections – cached in memory after the first call.
 */
export function getAllSections(): SectionMeta[] {
  if (!_cachedSections) {
    _cachedSections = loadSectionsFromDisk();
    console.log(`[sections] Cached ${_cachedSections.length} sections in memory`);
  }
  return _cachedSections;
}

// ── File-content cache for getSectionWithFiles ──
const _cachedSectionFiles = new Map<string, SectionWithFiles | null>();

/**
 * Loads a single section with all files (for installation) – cached.
 */
export function getSectionWithFiles(sectionId: string): SectionWithFiles | null {
  if (_cachedSectionFiles.has(sectionId)) {
    return _cachedSectionFiles.get(sectionId)!;
  }

  const sectionDir = path.join(SECTIONS_DIR, sectionId);
  const metaPath = path.join(sectionDir, "meta.json");

  if (!fs.existsSync(metaPath)) {
    _cachedSectionFiles.set(sectionId, null);
    return null;
  }

  try {
    const metaContent = fs.readFileSync(metaPath, "utf-8");
    const meta = JSON.parse(metaContent) as SectionMeta;

    const liquidPath = path.join(sectionDir, meta.files.liquid);
    const cssPath = path.join(sectionDir, meta.files.css);

    const liquidContent = fs.existsSync(liquidPath)
      ? fs.readFileSync(liquidPath, "utf-8")
      : "";

    const cssContent = fs.existsSync(cssPath)
      ? fs.readFileSync(cssPath, "utf-8")
      : "";

    const result: SectionWithFiles = { ...meta, liquidContent, cssContent };
    _cachedSectionFiles.set(sectionId, result);
    return result;
  } catch (error) {
    console.error(`Error loading section ${sectionId}:`, error);
    _cachedSectionFiles.set(sectionId, null);
    return null;
  }
}

/**
 * Returns the section categories
 */
export function getSectionCategories(): string[] {
  const sections = getAllSections();
  const categories = new Set<string>();
  for (const s of sections) {
    const cats = Array.isArray(s.category) ? s.category : [s.category];
    for (const c of cats) categories.add(c);
  }
  return Array.from(categories).sort();
}

/**
 * Filters sections by category
 */
export function getSectionsByCategory(category: string): SectionMeta[] {
  const sections = getAllSections();
  if (category === "All") return sections;
  return sections.filter((s) => {
    const cats = Array.isArray(s.category) ? s.category : [s.category];
    return cats.some((c) => c.toLowerCase() === category.toLowerCase());
  });
}

/**
 * Searches sections by query
 */
export function searchSections(query: string): SectionMeta[] {
  const sections = getAllSections();
  const q = query.toLowerCase();

  return sections.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)) ||
      (Array.isArray(s.category) ? s.category : [s.category]).some((c) => c.toLowerCase().includes(q))
  );
}

// ── Eager pre-warm on module load ──
// This runs once when the server starts, so the very first request
// doesn't pay the filesystem cost.
getAllSections();
