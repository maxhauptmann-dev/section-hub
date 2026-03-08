import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllSections } from "../lib/sections.server";
import type { SectionMeta } from "../lib/sections.server";
import prisma from "../db.server";
import { checkIsPremium } from "../lib/is-premium.server";
import {
  Page,
  Card,
  Text,
  BlockStack,
  Badge,
  Button,
  Spinner,
} from "@shopify/polaris";

interface PageRule {
  sectionType: string;
  label: string;
  icon: string;
  importance: "must" | "should" | "nice";
  reason: string;
}

interface PageBlueprint {
  key: string;
  templatePattern: string;
  label: string;
  icon: string;
  description: string;
  dos: PageRule[];
  donts: string[];
}

const PAGE_BLUEPRINTS: PageBlueprint[] = [
  {
    key: "homepage",
    templatePattern: "index",
    label: "Homepage",
    icon: "\u{1F3E0}",
    description: "Your homepage is the first impression. It should guide visitors to products and build trust.",
    dos: [
      { sectionType: "hero", label: "Hero / Slideshow", icon: "\u{1F3AF}", importance: "must", reason: "A compelling hero above the fold grabs attention and sets the tone for your brand." },
      { sectionType: "featured-collection", label: "Featured Products", icon: "\u{1F6CD}\uFE0F", importance: "must", reason: "Showcasing products directly on the homepage increases product discovery by 60%." },
      { sectionType: "social-proof", label: "Testimonials / Reviews", icon: "\u2B50", importance: "should", reason: "Social proof increases conversion rates by up to 270%." },
      { sectionType: "trust-badges", label: "Trust Badges", icon: "\u{1F6E1}\uFE0F", importance: "should", reason: "Trust signals like Free Shipping reduce cart abandonment by 18%." },
      { sectionType: "newsletter", label: "Newsletter Signup", icon: "\u{1F4E7}", importance: "should", reason: "Email marketing has 4x higher ROI than social media." },
      { sectionType: "announcement", label: "Announcement Bar", icon: "\u{1F4E2}", importance: "nice", reason: "Drives urgency for sales, free shipping thresholds, and promotions." },
      { sectionType: "logo-cloud", label: "Press / Partner Logos", icon: "\u{1F4F0}", importance: "nice", reason: "As seen in logos increase perceived credibility." },
      { sectionType: "image-text", label: "Image with Text / Story", icon: "\u{1F5BC}\uFE0F", importance: "nice", reason: "Storytelling sections increase engagement and time on site." },
    ],
    donts: [
      "Don\u2019t use more than one hero section \u2013 it dilutes the focus",
      "Don\u2019t overload with text-heavy sections \u2013 keep it visual",
      "Don\u2019t skip product showcasing \u2013 visitors want to see what you sell",
      "Don\u2019t forget mobile responsiveness \u2013 70%+ traffic is mobile",
    ],
  },
  {
    key: "product",
    templatePattern: "product",
    label: "Product Page",
    icon: "\u{1F4E6}",
    description: "The product page is where buying decisions happen. Focus on trust and clarity.",
    dos: [
      { sectionType: "social-proof", label: "Product Reviews", icon: "\u2B50", importance: "must", reason: "93% of customers read reviews before buying. Show them here." },
      { sectionType: "faq", label: "Product FAQ", icon: "\u2753", importance: "should", reason: "Answering common questions reduces returns by 35%." },
      { sectionType: "featured-collection", label: "Related Products", icon: "\u{1F6CD}\uFE0F", importance: "should", reason: "Cross-selling on product pages increases average order value by 20%." },
      { sectionType: "trust-badges", label: "Trust Badges", icon: "\u{1F6E1}\uFE0F", importance: "must", reason: "Guarantees near the buy button increase conversions significantly." },
      { sectionType: "image-text", label: "Product Features", icon: "\u{1F5BC}\uFE0F", importance: "nice", reason: "Detailed feature sections help justify the price point." },
    ],
    donts: [
      "Don\u2019t add a hero/slideshow \u2013 the product images are the hero",
      "Don\u2019t distract from the buy button with too many CTAs",
      "Don\u2019t hide shipping info \u2013 make it visible near the price",
      "Don\u2019t use auto-playing videos \u2013 let customers control playback",
    ],
  },
  {
    key: "collection",
    templatePattern: "collection",
    label: "Collection Page",
    icon: "\u{1F6CD}\uFE0F",
    description: "Collection pages should make browsing and filtering products easy.",
    dos: [
      { sectionType: "featured-collection", label: "Product Grid", icon: "\u{1F6CD}\uFE0F", importance: "must", reason: "A clean, filterable product grid is the core of this page." },
      { sectionType: "announcement", label: "Collection Banner", icon: "\u{1F4E2}", importance: "nice", reason: "A banner can highlight sales or collection-specific promotions." },
      { sectionType: "newsletter", label: "Newsletter Signup", icon: "\u{1F4E7}", importance: "nice", reason: "Capture emails from browsers who are not ready to buy yet." },
    ],
    donts: [
      "Don\u2019t add too many sections above the product grid",
      "Don\u2019t hide filters \u2013 they help customers find products quickly",
      "Don\u2019t use huge hero images that push products below the fold",
    ],
  },
  {
    key: "cart",
    templatePattern: "cart",
    label: "Cart Page",
    icon: "\u{1F6D2}",
    description: "The cart page should reduce friction and encourage checkout.",
    dos: [
      { sectionType: "trust-badges", label: "Trust Badges", icon: "\u{1F6E1}\uFE0F", importance: "must", reason: "Security badges near checkout reduce abandonment by up to 18%." },
      { sectionType: "featured-collection", label: "You May Also Like", icon: "\u{1F6CD}\uFE0F", importance: "should", reason: "Cart upsells can increase average order value by 10-30%." },
      { sectionType: "announcement", label: "Free Shipping Bar", icon: "\u{1F4E2}", importance: "nice", reason: "Show how much more they need for free shipping." },
    ],
    donts: [
      "Don\u2019t add distracting content \u2013 keep focus on completing the purchase",
      "Don\u2019t hide the checkout button",
      "Don\u2019t use pop-ups on the cart page",
    ],
  },
  {
    key: "blog",
    templatePattern: "blog",
    label: "Blog Page",
    icon: "\u{1F4DD}",
    description: "Your blog builds authority and drives organic traffic.",
    dos: [
      { sectionType: "newsletter", label: "Newsletter Signup", icon: "\u{1F4E7}", importance: "must", reason: "Blog readers are warm leads \u2013 capture their emails." },
      { sectionType: "featured-collection", label: "Featured Products", icon: "\u{1F6CD}\uFE0F", importance: "should", reason: "Link blog content to products to drive sales." },
    ],
    donts: [
      "Don\u2019t ignore SEO \u2013 each post should target a keyword",
      "Don\u2019t skip images \u2013 visual content increases engagement 80%",
    ],
  },
  {
    key: "contact",
    templatePattern: "page.contact",
    label: "Contact Page",
    icon: "\u{1F4EC}",
    description: "Make it easy for customers to reach you \u2013 it builds trust.",
    dos: [
      { sectionType: "contact", label: "Contact Form", icon: "\u{1F4EC}", importance: "must", reason: "A simple contact form is the minimum." },
      { sectionType: "faq", label: "FAQ Section", icon: "\u2753", importance: "should", reason: "Answer common questions before they reach out." },
      { sectionType: "trust-badges", label: "Trust / Guarantees", icon: "\u{1F6E1}\uFE0F", importance: "nice", reason: "Showing your policies builds confidence." },
    ],
    donts: [
      "Don\u2019t hide the contact form behind too many sections",
      "Don\u2019t forget to include response time expectations",
    ],
  },
  {
    key: "about",
    templatePattern: "page.about",
    label: "About Page",
    icon: "\u2139\uFE0F",
    description: "Tell your story and build a connection with customers.",
    dos: [
      { sectionType: "image-text", label: "Brand Story", icon: "\u{1F5BC}\uFE0F", importance: "must", reason: "Share your mission and values with images and text." },
      { sectionType: "social-proof", label: "Testimonials", icon: "\u2B50", importance: "should", reason: "Social proof on the about page reinforces credibility." },
      { sectionType: "logo-cloud", label: "Press / Awards", icon: "\u{1F4F0}", importance: "nice", reason: "Show awards or press coverage to build authority." },
    ],
    donts: [
      "Don\u2019t write a wall of text \u2013 break it up with images",
      "Don\u2019t forget a CTA \u2013 guide visitors to your products",
    ],
  },
  {
    key: "search",
    templatePattern: "search",
    label: "Search Results",
    icon: "\u{1F50D}",
    description: "Help customers find exactly what they are looking for.",
    dos: [
      { sectionType: "featured-collection", label: "Popular Products", icon: "\u{1F6CD}\uFE0F", importance: "nice", reason: "Show popular products when search has no results." },
    ],
    donts: [
      "Don\u2019t show an empty state with no suggestions",
      "Don\u2019t hide the search bar",
    ],
  },
  {
    key: "password",
    templatePattern: "password",
    label: "Password Page",
    icon: "\u{1F512}",
    description: "Your pre-launch page should build anticipation.",
    dos: [
      { sectionType: "newsletter", label: "Email Signup", icon: "\u{1F4E7}", importance: "must", reason: "Capture emails before launch to build your audience." },
      { sectionType: "hero", label: "Coming Soon Hero", icon: "\u{1F3AF}", importance: "should", reason: "A compelling hero with your branding sets expectations." },
    ],
    donts: [
      "Don\u2019t leave the default Shopify password page",
      "Don\u2019t forget to add social media links",
    ],
  },
];

const SECTION_PATTERNS: Record<string, string[]> = {
  hero: ["hero", "slideshow", "slider", "image-banner", "video-hero", "banner"],
  "featured-collection": ["featured-collection", "collection-list", "product-grid", "featured-product", "product-recommendations", "collection", "related-products"],
  "social-proof": ["testimonial", "review", "rating"],
  faq: ["faq", "accordion", "collapsible"],
  newsletter: ["newsletter", "email-signup", "email", "popup", "subscribe"],
  "trust-badges": ["trust", "guarantee", "badge", "icon-with-text"],
  announcement: ["announcement", "marquee", "scrolling-text", "ticker"],
  cta: ["cta", "call-to-action"],
  "logo-cloud": ["logo", "press", "brand", "partner"],
  "image-text": ["image-with-text", "rich-text", "text-columns", "multicolumn", "feature"],
  contact: ["contact", "form"],
  gamification: ["spin", "wheel", "game", "gamif"],
  header: ["header", "navigation", "nav-bar", "main-menu"],
  footer: ["footer"],
};

function stripJsonComments(str: string): string {
  // Remove block comments (/* ... */) - these never appear inside JSON strings
  let result = str.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove single-line comments (// ...) but NOT inside strings
  // Walk char by char to be string-aware
  let output = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    if (esc) { output += ch; esc = false; continue; }
    if (ch === "\\" && inStr) { output += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; output += ch; continue; }
    if (!inStr && ch === "/" && result[i + 1] === "/") {
      // Skip until end of line
      while (i < result.length && result[i] !== "\n") i++;
      if (i < result.length) output += "\n";
      continue;
    }
    output += ch;
  }
  return output.trim();
}

function safeJsonParse(content: string): any {
  try { return JSON.parse(content); } catch {}
  let cleaned = stripJsonComments(content);
  if (!cleaned) return null;
  try { return JSON.parse(cleaned); } catch {}
  // Horizon-style themes embed raw control chars (newlines, tabs) inside JSON string values.
  // Strategy: walk char-by-char, track whether we are inside a JSON string, and escape control chars there.
  let fixed = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escaped) { fixed += ch; escaped = false; continue; }
    if (ch === "\\") { fixed += ch; if (inString) escaped = true; continue; }
    if (ch === '"') { inString = !inString; fixed += ch; continue; }
    if (inString) {
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        // Escape control characters inside strings
        if (ch === "\n") { fixed += "\\n"; }
        else if (ch === "\r") { fixed += "\\r"; }
        else if (ch === "\t") { fixed += "\\t"; }
        // else skip other control chars
        continue;
      }
    }
    fixed += ch;
  }
  try { return JSON.parse(fixed); } catch {}
  // Fix trailing commas before } or ]
  fixed = fixed.replace(/,\s*([\]}])/g, "$1");
  try { return JSON.parse(fixed); } catch { return null; }
}

function extractAllTypes(obj: any): string[] {
  const types: string[] = [];
  const SKIP = new Set([
    "text", "image", "button", "video", "html", "liquid",
    "heading", "richtext", "spacer", "divider", "link",
    "collection-heading", "price", "title", "quantity",
    "buy-buttons", "variant-picker", "description",
    "@app", "@header", "@footer",
  ]);
  function walk(node: any) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { for (const item of node) walk(item); return; }
    if (typeof node.type === "string") {
      const t = node.type.trim();
      if (t && !SKIP.has(t) && !t.startsWith("shopify://") && !t.startsWith("t:")) types.push(t);
    }
    for (const val of Object.values(node)) walk(val);
  }
  walk(obj);
  return [...new Set(types)];
}

function sectionMatchesPattern(sectionName: string, sectionType: string): boolean {
  const patterns = SECTION_PATTERNS[sectionType];
  if (!patterns) return false;
  const lower = sectionName.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

interface PageAnalysis {
  key: string;
  label: string;
  icon: string;
  description: string;
  score: number;
  foundSections: string[];
  checks: {
    label: string;
    icon: string;
    importance: "must" | "should" | "nice";
    reason: string;
    found: boolean;
    matchedSection?: string;
    sectionType: string;
  }[];
  donts: string[];
  matchingSectionIQSections: {
    sectionType: string;
    id: string;
    name: string;
    price: SectionMeta["price"];
    previewColor: string;
    isOwned: boolean;
    isInstalled: boolean;
  }[];
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const allSections = getAllSections();
  let mainThemeName = "Unknown";

  try {
    const themesResp = await admin.graphql(
      `query { themes(first: 10) { nodes { id name role } } }`
    );
    const themesData = (await themesResp.json()) as any;
    const mainTheme = (themesData.data?.themes?.nodes || []).find(
      (t: { role: string }) => t.role === "MAIN"
    );
    if (!mainTheme) return { success: false, error: "No main theme found" };
    mainThemeName = mainTheme.name;

    const expectedFilenames = allSections.map((s) => `sections/section-${s.id}.liquid`);
    const filesResp = await admin.graphql(
      `query($themeId:ID!,$filenames:[String!]!){theme(id:$themeId){files(first:250,filenames:$filenames){nodes{filename}}}}`,
      { variables: { themeId: mainTheme.id, filenames: expectedFilenames } }
    );
    const filesData = (await filesResp.json()) as any;
    const sectionHubInstalledIds = (filesData.data?.theme?.files?.nodes || [])
      .map((f: { filename: string }) => {
        const m = f.filename.match(/^sections\/section-(.+)\.liquid$/);
        return m ? m[1] : null;
      })
      .filter(Boolean) as string[];

    const allContentResp = await admin.graphql(
      `query($themeId:ID!){theme(id:$themeId){
        templates:files(first:250,filenames:["templates/*.json"]){nodes{filename body{...on OnlineStoreThemeFileBodyText{content}}}}
        sectionGroups:files(first:50,filenames:["sections/*.json"]){nodes{filename body{...on OnlineStoreThemeFileBodyText{content}}}}
        layout:files(first:5,filenames:["layout/theme.liquid"]){nodes{filename body{...on OnlineStoreThemeFileBodyText{content}}}}
      }}`,
      { variables: { themeId: mainTheme.id } }
    );
    const allContentData = (await allContentResp.json()) as any;

    const pagesSections: Record<string, string[]> = {};

    const layoutSections: string[] = [];
    for (const lf of allContentData.data?.theme?.layout?.nodes || []) {
      const content = lf.body?.content || "";
      for (const m of content.matchAll(/\{%[-\s]*sections?\s+['"]([^'"]+)['"]\s*[-]?%\}/g)) {
        layoutSections.push(m[1]);
      }
    }

    const sectionGroupMap: Record<string, string[]> = {};
    for (const sgf of allContentData.data?.theme?.sectionGroups?.nodes || []) {
      const content = sgf.body?.content || "";
      const groupName = sgf.filename.replace("sections/", "").replace(".json", "");
      try {
        const json = safeJsonParse(content);
        if (json) sectionGroupMap[groupName] = extractAllTypes(json);
      } catch {}
    }

    const globalSections: string[] = [];
    for (const ls of layoutSections) {
      if (sectionGroupMap[ls]) globalSections.push(...sectionGroupMap[ls]);
      else globalSections.push(ls);
    }

    for (const tf of allContentData.data?.theme?.templates?.nodes || []) {
      const content = tf.body?.content || "";
      const templateName = tf.filename.replace("templates/", "").replace(".json", "");
      try {
        const json = safeJsonParse(content);
        if (!json) {
          pagesSections[templateName] = [...globalSections]; continue;
        }
        const types = extractAllTypes(json);
        const sectionKeys = json.sections ? Object.values(json.sections).map((s: any) => s?.type).filter(Boolean) : [];
        pagesSections[templateName] = [...new Set([...globalSections, ...types, ...sectionKeys])];
      } catch {
        pagesSections[templateName] = [...globalSections];
      }
    }

    const purchases = await prisma.sectionPurchase.findMany({
      where: { shop, status: "COMPLETED" },
      select: { sectionHandle: true },
    });
    const purchasedHandles = new Set(purchases.map((p) => p.sectionHandle));

    const pageAnalyses: PageAnalysis[] = [];

    for (const blueprint of PAGE_BLUEPRINTS) {
      const matchingTemplates = Object.entries(pagesSections).filter(([tpl]) =>
        tpl === blueprint.templatePattern || tpl.startsWith(blueprint.templatePattern + ".")
      );
      const activeSections = [...new Set(matchingTemplates.flatMap(([, secs]) => secs))];

      const checks = blueprint.dos.map((rule) => {
        const matchedSection = activeSections.find((sec) => sectionMatchesPattern(sec, rule.sectionType));
        return {
          label: rule.label, icon: rule.icon, importance: rule.importance,
          reason: rule.reason, found: !!matchedSection,
          matchedSection: matchedSection || undefined, sectionType: rule.sectionType,
        };
      });

      const weights = { must: 3, should: 2, nice: 1 };
      const totalWeight = checks.reduce((sum, c) => sum + weights[c.importance], 0);
      const earnedWeight = checks.reduce((sum, c) => sum + (c.found ? weights[c.importance] : 0), 0);
      const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;

      const missingTypes = checks.filter((c) => !c.found).map((c) => c.sectionType);
      const seen = new Set<string>();
      const matchingSectionIQSections = missingTypes.flatMap((st) => {
        const patterns = SECTION_PATTERNS[st];
        if (!patterns) return [];
        return allSections
          .filter((s) => {
            const allText = [...(Array.isArray(s.category) ? s.category : [s.category]), ...s.tags, s.name, s.id].map((t) => t.toLowerCase());
            return patterns.some((p) => allText.some((t) => t.includes(p)));
          })
          .filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
          .map((s) => ({
            sectionType: st, id: s.id, name: s.name, price: s.price,
            previewColor: s.previewColor,
            isOwned: purchasedHandles.has(s.id) || s.price.type === "free",
            isInstalled: sectionHubInstalledIds.includes(s.id),
          }));
      });

      pageAnalyses.push({
        key: blueprint.key, label: blueprint.label, icon: blueprint.icon,
        description: blueprint.description, score, foundSections: activeSections,
        checks, donts: blueprint.donts, matchingSectionIQSections,
      });
    }

    const overallScore = pageAnalyses.length > 0
      ? Math.round(pageAnalyses.reduce((sum, p) => sum + p.score, 0) / pageAnalyses.length) : 0;
    const activeCount = pageAnalyses.filter((p) => p.score >= 80).length;
    const missingCritical = pageAnalyses.filter((p) => p.score < 50).map((p) => ({ key: p.key, label: p.label, icon: p.icon }));
    const missingHigh = pageAnalyses.filter((p) => p.score >= 50 && p.score < 80).map((p) => ({ key: p.key, label: p.label, icon: p.icon }));

    await prisma.storeAnalysis.upsert({
      where: { shop },
      update: {
        storeScore: overallScore, activeCount, totalTypes: pageAnalyses.length,
        missingCritical: JSON.stringify(missingCritical), missingHigh: JSON.stringify(missingHigh),
        mainThemeName, totalThemeSections: Object.values(pagesSections).flat().length,
        sectionHubInstalled: sectionHubInstalledIds.length, activeSectionsCount: activeCount,
        results: JSON.stringify(pageAnalyses), pageMap: JSON.stringify(pagesSections),
        analyzedAt: new Date(),
      },
      create: {
        shop, storeScore: overallScore, activeCount, totalTypes: pageAnalyses.length,
        missingCritical: JSON.stringify(missingCritical), missingHigh: JSON.stringify(missingHigh),
        mainThemeName, totalThemeSections: Object.values(pagesSections).flat().length,
        sectionHubInstalled: sectionHubInstalledIds.length, activeSectionsCount: activeCount,
        results: JSON.stringify(pageAnalyses), pageMap: JSON.stringify(pagesSections),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("Analyzer error:", err);
    return { success: false, error: "Failed to analyze store" };
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const savedAnalysis = await prisma.storeAnalysis.findUnique({ where: { shop } });
  const { isPremium } = await checkIsPremium(shop);

  const purchases = await prisma.sectionPurchase.findMany({
    where: { shop, status: "COMPLETED" },
    select: { sectionHandle: true },
  });
  const purchasedHandles = new Set(purchases.map((p) => p.sectionHandle));

  if (!savedAnalysis) {
    return {
      shop, hasAnalysis: false, analyzedAt: null, mainThemeName: "Unknown",
      overallScore: 0, isPremium, pages: [] as PageAnalysis[],
      blueprintKeys: PAGE_BLUEPRINTS.map((b) => ({ key: b.key, label: b.label, icon: b.icon })),
    };
  }

  let pages: PageAnalysis[] = [];
  try {
    pages = JSON.parse(savedAnalysis.results);
    for (const page of pages) {
      for (const sec of page.matchingSectionIQSections || []) {
        sec.isOwned = purchasedHandles.has(sec.id) || sec.price?.type === "free";
      }
    }
  } catch {}

  return {
    shop, hasAnalysis: true, analyzedAt: savedAnalysis.analyzedAt.toISOString(),
    mainThemeName: savedAnalysis.mainThemeName, overallScore: savedAnalysis.storeScore,
    isPremium, pages,
    blueprintKeys: PAGE_BLUEPRINTS.map((b) => ({ key: b.key, label: b.label, icon: b.icon })),
  };
};

export default function StoreAnalyzerPage() {
  const { hasAnalysis, analyzedAt, mainThemeName, overallScore, pages, blueprintKeys } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  const isAnalyzing = fetcher.state === "submitting" || fetcher.state === "loading";
  const scoreColor = (s: number) => s >= 80 ? "#22c55e" : s >= 50 ? "#f59e0b" : "#ef4444";
  const scoreLabel = (s: number) => s >= 80 ? "Great" : s >= 50 ? "Needs Work" : "Critical";

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Page
      title="Page Analyzer"
      subtitle={hasAnalysis ? `Theme: "${mainThemeName}"` : "Analyze each page with dos & don'ts"}
      backAction={{ onAction: () => navigate("/app") }}
    >
      <style>{`
        .pa-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:12px}
        .pa-card{background:#fff;border:2px solid #e5e7eb;border-radius:16px;padding:20px 14px;text-align:center;cursor:pointer;transition:all .2s}
        .pa-card:hover{border-color:#c7d2fe;box-shadow:0 4px 16px rgba(99,102,241,.12);transform:translateY(-2px)}
        .pa-card.active{border-color:#6366f1;background:#f5f3ff}
        .pa-ring{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:8px auto 0}
        .pa-ring-inner{width:32px;height:32px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}
        .pa-imp{display:inline-flex;padding:2px 7px;border-radius:6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px}
        .pa-imp.must{background:#fef2f2;color:#dc2626}
        .pa-imp.should{background:#fffbeb;color:#d97706}
        .pa-imp.nice{background:#eff6ff;color:#2563eb}
        .pa-fail-card{background:#fff;border:1px solid #fecaca;border-radius:14px;padding:16px 20px;margin-bottom:12px;transition:all .2s}
        .pa-fail-card:hover{border-color:#f87171;box-shadow:0 2px 12px rgba(239,68,68,.08)}
        .pa-pass-row{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#f0fdf4;border-radius:10px;margin-bottom:6px}
        .pa-sugg-scroll{display:flex;gap:10px;overflow-x:auto;padding:10px 0 4px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
        .pa-sugg-scroll::-webkit-scrollbar{display:none}
        .pa-sugg-card{flex:0 0 160px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px;cursor:pointer;transition:all .2s;text-align:center;position:relative}
        .pa-sugg-card:hover{border-color:#6366f1;box-shadow:0 4px 16px rgba(99,102,241,.12);transform:translateY(-2px)}
        .pa-sugg-card .pa-sugg-thumb{width:100%;height:70px;border-radius:8px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:#fff}
        .pa-sugg-card .pa-owned{position:absolute;top:8px;right:8px;background:#22c55e;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:6px;text-transform:uppercase}
      `}</style>

      <BlockStack gap="500">
        <div style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
          borderRadius: 20, padding: "28px 32px", color: "white", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: "-50%", right: "-15%", width: 350, height: 350, background: "radial-gradient(circle, rgba(99,102,241,.3) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            {hasAnalysis ? (
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
                  background: `conic-gradient(${scoreColor(overallScore)} ${overallScore * 3.6}deg, rgba(255,255,255,.15) ${overallScore * 3.6}deg)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(30,27,75,.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 22, fontWeight: 800 }}>{overallScore}</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Page Analysis</h2>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.65)", margin: "4px 0 0" }}>
                    {pages.filter((p) => p.score >= 80).length} of {pages.length} pages optimized &middot; Updated {formatDate(analyzedAt)}
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {pages.filter((p) => p.score < 50).length > 0 && (
                      <span style={{ padding: "3px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, background: "rgba(239,68,68,.2)", color: "#fca5a5" }}>
                        {pages.filter((p) => p.score < 50).length} critical
                      </span>
                    )}
                    {pages.filter((p) => p.score >= 50 && p.score < 80).length > 0 && (
                      <span style={{ padding: "3px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, background: "rgba(245,158,11,.2)", color: "#fcd34d" }}>
                        {pages.filter((p) => p.score >= 50 && p.score < 80).length} need work
                      </span>
                    )}
                    {pages.filter((p) => p.score >= 80).length > 0 && (
                      <span style={{ padding: "3px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600, background: "rgba(16,185,129,.2)", color: "#6ee7b7" }}>
                        {pages.filter((p) => p.score >= 80).length} great
                      </span>
                    )}
                  </div>
                </div>
                <fetcher.Form method="post">
                  <button type="submit" style={{
                    background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.25)",
                    color: "white", padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>Re-analyze</button>
                </fetcher.Form>
              </div>
            ) : (
              <BlockStack gap="300">
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Page-by-Page Analyzer</h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.8)", margin: 0, maxWidth: 550 }}>
                  We analyze each page against best practices and show you exactly what is missing and what you are doing right.
                </p>
                <div style={{ marginTop: 8 }}>
                  <fetcher.Form method="post">
                    <Button variant="primary" size="large" submit>Analyze All Pages</Button>
                  </fetcher.Form>
                </div>
              </BlockStack>
            )}
          </div>
        </div>

        {isAnalyzing && (
          <Card>
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <BlockStack gap="300" inlineAlign="center">
                <Spinner size="large" />
                <Text as="h2" variant="headingLg">Analyzing your pages...</Text>
                <Text as="p" variant="bodySm" tone="subdued">Scanning templates, layouts, and section files.</Text>
              </BlockStack>
            </div>
          </Card>
        )}

        {!isAnalyzing && (
          <div>
            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Text as="h2" variant="headingMd">{hasAnalysis ? "Your Pages" : "Pages"}</Text>
              {!hasAnalysis && (
                <Text as="p" variant="bodySm" tone="subdued">Click Analyze All Pages above to start</Text>
              )}
            </div>
            <div className="pa-grid">
              {(hasAnalysis ? pages : blueprintKeys).map((page) => {
                const analysis = hasAnalysis ? pages.find((p) => p.key === page.key) : null;
                const score = analysis?.score ?? null;
                const isActive = expandedPage === page.key;
                return (
                  <div key={page.key} className={`pa-card ${isActive ? "active" : ""}`}
                    onClick={() => { if (hasAnalysis) setExpandedPage(isActive ? null : page.key); }}
                    onKeyDown={() => {}} role="button" tabIndex={0}>
                    <div style={{ fontSize: 30 }}>{page.icon}</div>
                    <Text as="p" variant="bodySm" fontWeight="semibold">{page.label}</Text>
                    {score !== null && (
                      <div className="pa-ring" style={{ background: `conic-gradient(${scoreColor(score)} ${score * 3.6}deg, #e5e7eb ${score * 3.6}deg)` }}>
                        <div className="pa-ring-inner">
                          <span style={{ color: scoreColor(score) }}>{score}</span>
                        </div>
                      </div>
                    )}
                    {score !== null && (
                      <div style={{ marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: scoreColor(score), fontWeight: 600 }}>{scoreLabel(score)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasAnalysis && expandedPage && !isAnalyzing && (() => {
          const page = pages.find((p) => p.key === expandedPage);
          if (!page) return null;
          const failChecks = page.checks.filter((c) => !c.found);
          const passChecks = page.checks.filter((c) => c.found);
          return (
            <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e5e7eb", overflow: "hidden" }}>
              {/* Header */}
              <div style={{
                padding: "20px 28px", borderBottom: "1px solid #f3f4f6",
                background: `linear-gradient(135deg, ${scoreColor(page.score)}10 0%, white 60%)`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                    background: `conic-gradient(${scoreColor(page.score)} ${page.score * 3.6}deg, #e5e7eb ${page.score * 3.6}deg)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: scoreColor(page.score) }}>{page.score}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{page.icon}</span>
                      <Text as="h2" variant="headingLg">{page.label}</Text>
                      <Badge tone={page.score >= 80 ? "success" : page.score >= 50 ? "warning" : "critical"}>{scoreLabel(page.score)}</Badge>
                    </div>
                    <Text as="p" variant="bodySm" tone="subdued">{page.description}</Text>
                  </div>
                  <button onClick={() => setExpandedPage(null)} style={{
                    background: "#f3f4f6", border: "none", width: 34, height: 34, borderRadius: 10, cursor: "pointer", fontSize: 15,
                  }}>✕</button>
                </div>
              </div>

              <div style={{ padding: "24px 28px" }}>
                {/* Missing Items – prominent */}
                {failChecks.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 15 }}>🔧</span>
                      <Text as="h3" variant="headingMd">Missing</Text>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: "#fef2f2", color: "#dc2626" }}>
                        {failChecks.length}
                      </span>
                    </div>
                    {failChecks.map((c, i) => {
                      const suggestions = (page.matchingSectionIQSections || []).filter((s) => s.sectionType === c.sectionType);
                      return (
                        <div key={i} className="pa-fail-card">
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 18 }}>{c.icon}</span>
                            <Text as="p" variant="bodyMd" fontWeight="bold">{c.label}</Text>
                            <span className={`pa-imp ${c.importance}`}>
                              {c.importance === "must" ? "Must" : c.importance === "should" ? "Should" : "Nice"}
                            </span>
                          </div>
                          <Text as="p" variant="bodySm" tone="subdued">{c.reason}</Text>
                          {suggestions.length > 0 && (
                            <div className="pa-sugg-scroll">
                              {suggestions.map((sec) => (
                                <div key={sec.id} className="pa-sugg-card"
                                  onClick={() => navigate(`/app/section?id=${sec.id}`)} onKeyDown={() => {}} role="button" tabIndex={0}>
                                  {sec.isOwned && <span className="pa-owned">Owned</span>}
                                  <div className="pa-sugg-thumb" style={{
                                    background: `linear-gradient(135deg, ${sec.previewColor || "#6366f1"}, ${sec.previewColor || "#6366f1"}88)`,
                                  }}>
                                    {sec.name.charAt(0)}
                                  </div>
                                  <Text as="p" variant="bodySm" fontWeight="semibold">{sec.name}</Text>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    {sec.price.type === "free" ? "Free" : `€${sec.price.amount}`}
                                  </Text>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Passed Items – compact */}
                {passChecks.length > 0 && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 15 }}>✅</span>
                      <Text as="h3" variant="headingMd">Completed</Text>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: "#dcfce7", color: "#166534" }}>
                        {passChecks.length}
                      </span>
                    </div>
                    {passChecks.map((c, i) => (
                      <div key={i} className="pa-pass-row">
                        <span style={{ fontSize: 14 }}>✓</span>
                        <span style={{ fontSize: 14 }}>{c.icon}</span>
                        <Text as="span" variant="bodySm" fontWeight="medium">{c.label}</Text>
                        <span className={`pa-imp ${c.importance}`}>
                          {c.importance === "must" ? "Must" : c.importance === "should" ? "Should" : "Nice"}
                        </span>
                        {c.matchedSection && (
                          <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 6, fontSize: 10, background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
                            {c.matchedSection}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </BlockStack>
    </Page>
  );
}
