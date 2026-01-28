import fs from "fs";
import path from "path";

export interface SectionMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  price: {
    type: "free" | "one_time";
    amount?: number;
    currency?: "EUR" | "USD";
  };
  tags: string[];
  author: string;
  previewColor: string;
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

/**
 * Lädt alle verfügbaren Sections aus dem Dateisystem
 */
export function getAllSections(): SectionMeta[] {
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

  // Sortiere nach updatedAt (neueste zuerst)
  sections.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return sections;
}

/**
 * Lädt eine einzelne Section mit allen Dateien (für Installation)
 */
export function getSectionWithFiles(sectionId: string): SectionWithFiles | null {
  const sectionDir = path.join(SECTIONS_DIR, sectionId);
  const metaPath = path.join(sectionDir, "meta.json");

  if (!fs.existsSync(metaPath)) {
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

    return {
      ...meta,
      liquidContent,
      cssContent,
    };
  } catch (error) {
    console.error(`Error loading section ${sectionId}:`, error);
    return null;
  }
}

/**
 * Gibt die Section-Kategorien zurück
 */
export function getSectionCategories(): string[] {
  const sections = getAllSections();
  const categories = new Set(sections.map((s) => s.category));
  return Array.from(categories).sort();
}

/**
 * Filtert Sections nach Kategorie
 */
export function getSectionsByCategory(category: string): SectionMeta[] {
  const sections = getAllSections();
  if (category === "All") return sections;
  return sections.filter((s) => s.category === category);
}

/**
 * Sucht Sections nach Query
 */
export function searchSections(query: string): SectionMeta[] {
  const sections = getAllSections();
  const q = query.toLowerCase();

  return sections.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)) ||
      s.category.toLowerCase().includes(q)
  );
}
