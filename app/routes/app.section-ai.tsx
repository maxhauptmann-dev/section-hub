import { useState, useCallback, useEffect } from "react";
import { useLoaderData, useSubmit, useActionData, useNavigation } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import OpenAI from "openai";
import prisma from "../db.server";
import { sanitizeShopifySchema } from "../lib/sanitize-schema";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  TextField,
  Select,
  Box,
  Banner,
  Divider,
  Spinner,
} from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Available AI models
  const availableModels = [
    { label: "GPT-4o (Neuestes & Bestes Modell)", value: "gpt-4o" },
    { label: "GPT-4o mini (Schnell & Günstig)", value: "gpt-4o-mini" },
    { label: "GPT-4 Turbo (Groß & Leistungsstark)", value: "gpt-4-turbo" },
    { label: "GPT-4 (Original, sehr gut)", value: "gpt-4" },
  ];

  const defaultModel = process.env.OPENAI_MODEL || "gpt-4o";

  // Load existing AI sections for this shop (for duplicate check + name display)
  const existingAiSections = await prisma.aiSection.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, slug: true, installed: true },
  });

  // Load demo theme info for test-install (same "Section Hub Demo" used by normal sections)
  let demoThemeId = "";
  let demoThemeName = "";
  try {
    const themesResponse = await admin.graphql(`
      query { themes(first: 50) { nodes { id name role } } }
    `);
    const themesData = await themesResponse.json() as any;
    const themes = themesData.data?.themes?.nodes || [];
    const demoTheme = themes.find((t: any) => t.name === "Section Hub Demo" && t.role === "UNPUBLISHED");
    if (demoTheme) {
      demoThemeId = demoTheme.id;
      demoThemeName = demoTheme.name;
    }
  } catch (err) {
    console.error("Error loading themes:", err);
  }

  // Example prompts to inspire users
  const examplePrompts = [
    "A hero section with a full-width background image, overlay text, and two CTA buttons",
    "A testimonial carousel with star ratings, customer photos, and auto-scroll",
    "A pricing table with 3 tiers, feature comparison, and highlighted popular plan",
    "An FAQ accordion with smooth animations and schema markup for SEO",
    "A countdown timer section for product launches with email signup",
    "A before/after image slider for product comparisons",
    "A team member grid with hover effects and social media links",
    "An announcement bar with countdown timer and dismiss button",
  ];

  return { examplePrompts, availableModels, defaultModel, existingAiSections, demoThemeId, demoThemeName };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "generate") {
    const prompt = formData.get("prompt") as string;
    const style = formData.get("style") as string;
    const colorScheme = formData.get("colorScheme") as string;
    const sectionName = (formData.get("sectionName") as string || "").trim();
    const model = (formData.get("model") as string) || process.env.OPENAI_MODEL || "gpt-4o";

    if (!sectionName || sectionName.length < 2) {
      return {
        error: "Bitte gib deiner Section einen Namen (mindestens 2 Zeichen).",
        generatedSection: null,
      };
    }

    if (!prompt || prompt.trim().length < 10) {
      return {
        error: "Bitte beschreibe deine Section mit mindestens 10 Zeichen.",
        generatedSection: null,
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      return {
        error: "OpenAI API key is not configured. Please set OPENAI_API_KEY.",
        generatedSection: null,
      };
    }

    // Generate slug from section name
    const slug = sectionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Check for duplicate names
    const existing = await prisma.aiSection.findFirst({
      where: { shop: session.shop, slug },
    });
    if (existing) {
      return {
        error: `Eine Section mit dem Namen "${sectionName}" existiert bereits. Bitte wähle einen anderen Namen.`,
        generatedSection: null,
      };
    }

    // Detect section type from prompt for visual preview
    const promptLower = prompt.toLowerCase();
    let sectionType = "generic";
    if (promptLower.match(/hero|banner|header|landing/)) sectionType = "hero";
    else if (promptLower.match(/testimonial|review|quote|feedback/)) sectionType = "testimonial";
    else if (promptLower.match(/faq|accordion|question|answer/)) sectionType = "faq";
    else if (promptLower.match(/pricing|price|plan|tier/)) sectionType = "pricing";
    else if (promptLower.match(/team|member|staff|about us/)) sectionType = "team";
    else if (promptLower.match(/countdown|timer|launch|coming soon/)) sectionType = "countdown";
    else if (promptLower.match(/gallery|image|photo|portfolio/)) sectionType = "gallery";
    else if (promptLower.match(/cta|call to action|button|signup|subscribe/)) sectionType = "cta";
    else if (promptLower.match(/logo|brand|partner|client|trust/)) sectionType = "logoCloud";
    else if (promptLower.match(/feature|benefit|icon|service/)) sectionType = "features";

    // Detect specific features from prompt
    const features = {
      hasStars: !!promptLower.match(/star|rating|review/),
      hasPhotos: !!promptLower.match(/photo|image|avatar|picture/),
      hasCarousel: !!promptLower.match(/carousel|slider|scroll|slide/),
      hasDarkMode: !!promptLower.match(/dark/),
      hasGradient: !!promptLower.match(/gradient/),
      hasButtons: !!promptLower.match(/button|cta|link|action/),
      hasIcons: !!promptLower.match(/icon/),
      hasCountdown: !!promptLower.match(/countdown|timer/),
      hasEmail: !!promptLower.match(/email|signup|subscribe|newsletter/),
      columnCount: promptLower.match(/(\d)\s*(column|tier|card|item|member)/) ? 
        parseInt(promptLower.match(/(\d)\s*(column|tier|card|item|member)/)![1]) : 3,
    };

    // ─── REAL OpenAI API Call ───
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const systemPrompt = `You are an expert Shopify theme developer. You generate production-ready Shopify Liquid sections with embedded CSS.

RULES:
1. Return ONLY valid Shopify Liquid code. No markdown, no explanation, no code fences.
2. The section MUST include a {% schema %} block at the end with valid JSON.
3. Use {%- style -%} ... {%- endstyle -%} for CSS, embedded in the Liquid file.
4. All styles must be responsive (mobile-first, use media queries).
5. Use section.settings for ALL customizable values (colors, text, padding, etc.).
6. The schema MUST include a "presets" array so it appears in the Theme Editor.
7. Use semantic HTML (section, article, h2, p, etc.).
8. The schema JSON must be 100% valid — no trailing commas, no comments.
9. Make the section visually appealing with the "${style}" style and "${colorScheme}" color scheme.
10. Include smooth CSS transitions and hover effects where appropriate.
11. Use clamp() for responsive font sizes.
12. Every setting must have an "id", "type", "label", and "default" value.
13. Supported schema setting types: text, textarea, richtext, url, color, image_picker, range, select, checkbox, number, header, paragraph, video_url. Do NOT use unsupported types.
14. For range settings: min, max, step, default must be valid numbers. The default must equal min + N*step for some integer N >= 0.
15. CRITICAL: These types MUST NOT have a "default" property: url, image_picker, video_url, product, collection, page, blog, article, link_list, font_picker, html. Only remove the default key, keep all other properties.
16. CRITICAL: Setting attributes are TYPE-SPECIFIC. Only these combinations are valid:
    - text/textarea: type, id, label, default, info, placeholder
    - richtext/inline_richtext: type, id, label, default, info
    - number: type, id, label, default, info, placeholder
    - range: type, id, label, default, info, min, max, step, unit
    - select/radio: type, id, label, default, info, options
    - checkbox: type, id, label, default, info
    - color/color_background/color_scheme: type, id, label, default, info
    - image_picker/url/product/collection/page/blog/article/link_list/html: type, id, label, info
    - video_url: type, id, label, info, accept, placeholder
    - header: type, content, info
    - paragraph: type, content
    Do NOT use "min", "max", "step", "unit" on anything other than "range". Do NOT use "placeholder" on color, checkbox, select, or resource types. Do NOT add "settings", "blocks", "name", "description", "required" or any other keys inside a setting object.
17. Section class should be "section-ai-${slug}".
18. Name in schema should be "${sectionName}".
19. CRITICAL: The {% schema %} block MUST be at the TOP LEVEL of the file — NEVER nested inside {% style %}, {% comment %}, {% if %}, {% for %}, or any other Liquid tag. The schema tag must be the very last thing in the file, after all HTML and style blocks are properly closed.`;

      const userPrompt = `Generate a Shopify Liquid section based on this description:

"${prompt}"

Style: ${style}
Color Scheme: ${colorScheme}
Section Type: ${sectionType}

Requirements:
- Production-ready, beautiful, modern code
- Fully responsive with mobile breakpoints
- All text, colors, and spacing customizable via Theme Editor settings
- Include presets for Theme Editor
- CSS embedded with {%- style -%} tags
- Smooth animations and transitions
- Accessible (proper ARIA attributes, semantic HTML)`;

      const completion = await openai.chat.completions.create({
        model,
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      });

      let generatedLiquid = completion.choices[0]?.message?.content || "";
      
      // Clean up response — remove markdown code fences if present
      generatedLiquid = generatedLiquid
        .replace(/^```(?:liquid|html)?\s*\n?/gm, "")
        .replace(/\n?```\s*$/gm, "")
        .trim();

      // Validate the response contains schema
      if (!generatedLiquid.includes("{% schema %}")) {
        return {
          error: "AI hat ungültigen Code generiert (Schema fehlt). Bitte versuche es nochmal.",
          generatedSection: null,
        };
      }

      // ─── Sanitize Shopify schema to fix common AI mistakes ───
      generatedLiquid = sanitizeShopifySchema(generatedLiquid);

      const tokensUsed = (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0);

      // Save to database
      const aiSection = await prisma.aiSection.create({
        data: {
          shop: session.shop,
          name: sectionName,
          slug,
          prompt,
          style,
          colorScheme,
          model,
          liquidCode: generatedLiquid,
          sectionType,
          tokensUsed,
        },
      });

      return {
        error: null,
        generatedSection: {
          id: aiSection.id,
          name: sectionName,
          slug,
          prompt,
          style,
          colorScheme,
          sectionType,
          features,
          price: 5,
          liquid: generatedLiquid,
          css: "",
          status: "preview",
          modelUsed: model,
          tokensUsed,
        },
      };
    } catch (err: any) {
      console.error("Anthropic Error:", err);
      const errorMessage = err?.message || "Unknown error";
      
      if (errorMessage.includes("insufficient_quota") || errorMessage.includes("credit_balance_exhausted")) {
        return { error: "Anthropic API quota exceeded. Bitte Billing prüfen.", generatedSection: null };
      }
      if (errorMessage.includes("invalid_api_key")) {
        return { error: "Ungültiger Anthropic API Key. Bitte Konfiguration prüfen.", generatedSection: null };
      }
      
      return {
        error: `AI Generierung fehlgeschlagen: ${errorMessage}`,
        generatedSection: null,
      };
    }
  }

  // ─── TRY: Install section temporarily into theme for testing ───
  if (intent === "try") {
    const aiSectionId = formData.get("aiSectionId") as string;

    if (!aiSectionId) {
      return { error: "Section ID fehlt.", generatedSection: null };
    }

    const aiSection = await prisma.aiSection.findFirst({
      where: { id: aiSectionId, shop: session.shop },
    });

    if (!aiSection) {
      return { error: "Section nicht gefunden.", generatedSection: null };
    }

    try {
      const DEMO_THEME_NAME = "Section Hub Demo";

      // 1. Fetch all themes — look for an existing demo theme
      const themesResponse = await admin.graphql(`
        query { themes(first: 50) { nodes { id name role } } }
      `);
      const themesData = await themesResponse.json() as any;
      const themes = themesData.data?.themes?.nodes || [];

      let demoTheme = themes.find(
        (t: { name: string; role: string }) => t.name === DEMO_THEME_NAME && t.role === "UNPUBLISHED",
      );

      // 2. If no demo theme exists, create one by duplicating the main theme
      if (!demoTheme) {
        const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");
        if (!mainTheme) {
          return { error: "Kein aktives Theme gefunden.", generatedSection: null };
        }

        console.log("Creating demo theme by duplicating:", mainTheme.name);

        const duplicateResponse = await admin.graphql(
          `mutation themeDuplicate($id: ID!, $name: String!) {
            themeDuplicate(id: $id, name: $name) {
              newTheme { id name role }
              userErrors { field message }
            }
          }`,
          { variables: { id: mainTheme.id, name: DEMO_THEME_NAME } },
        );

        const duplicateData = await duplicateResponse.json() as any;
        const dupErrors = duplicateData.data?.themeDuplicate?.userErrors || [];

        if (dupErrors.length > 0) {
          const msg = dupErrors.map((e: { message: string }) => e.message).join(", ");
          return { error: `Demo-Theme konnte nicht erstellt werden: ${msg}`, generatedSection: null };
        }

        demoTheme = duplicateData.data?.themeDuplicate?.newTheme;
        if (!demoTheme) {
          return { error: "Demo-Theme konnte nicht erstellt werden.", generatedSection: null };
        }

        console.log("Demo theme created:", demoTheme.id);
        // Wait for Shopify to finish duplicating
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }

      // 3. Sanitize and upload section to demo theme
      const sanitizedCode = sanitizeShopifySchema(aiSection.liquidCode);
      const sectionFilename = `sections/section-ai-${aiSection.slug}.liquid`;

      // 4. Override index.json so the section is IMMEDIATELY visible in Theme Editor
      const demoIndexTemplate = JSON.stringify(
        {
          sections: {
            [`sh-ai-${aiSection.slug}`]: {
              type: `section-ai-${aiSection.slug}`,
              settings: {},
            },
          },
          order: [`sh-ai-${aiSection.slug}`],
        },
        null,
        2,
      );

      const files = [
        { filename: sectionFilename, body: { type: "TEXT" as const, value: sanitizedCode } },
        { filename: "templates/index.json", body: { type: "TEXT" as const, value: demoIndexTemplate } },
      ];

      const themeFilesResponse = await admin.graphql(
        `mutation ThemeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
          themeFilesUpsert(files: $files, themeId: $themeId) {
            upsertedThemeFiles { filename }
            userErrors { field message }
          }
        }`,
        { variables: { files, themeId: demoTheme.id } },
      );

      const themeFilesData = (await themeFilesResponse.json()) as any;

      if (themeFilesData.errors) {
        const errorMsg = themeFilesData.errors[0]?.message || JSON.stringify(themeFilesData.errors);
        return { error: `GraphQL Error: ${errorMsg}`, generatedSection: null };
      }

      const userErrors = themeFilesData.data?.themeFilesUpsert?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors.map((e: any) => `${(e.field || []).join(".")}: ${e.message}`).join(", ");
        return { error: `Fehler: ${errorMsg}`, generatedSection: null };
      }

      // 5. Build Theme Editor deep-link
      const numericThemeId = demoTheme.id.split("/").pop();
      const editorUrl = `https://${session.shop}/admin/themes/${numericThemeId}/editor`;

      return {
        error: null,
        generatedSection: null,
        triedSection: true,
        tryMessage: `"${aiSection.name}" wurde im Demo-Theme "Section Hub Demo" installiert! Dein Live-Theme bleibt unberührt. Öffne den Theme Editor um die Section zu testen.`,
        tryThemeId: demoTheme.id,
        tryEditorUrl: editorUrl,
      };
    } catch (err: any) {
      console.error("Try error:", err);
      return { error: `Test fehlgeschlagen: ${err?.message || "Unknown"}`, generatedSection: null };
    }
  }

  // ─── REMOVE TEST: Remove section from demo theme (undo try) ───
  if (intent === "remove-test") {
    const aiSectionId = formData.get("aiSectionId") as string;

    if (!aiSectionId) {
      return { error: "Section ID fehlt.", generatedSection: null };
    }

    const aiSection = await prisma.aiSection.findFirst({
      where: { id: aiSectionId, shop: session.shop },
    });

    if (!aiSection) {
      return { error: "Section nicht gefunden.", generatedSection: null };
    }

    try {
      const DEMO_THEME_NAME = "Section Hub Demo";
      const themesResponse = await admin.graphql(`
        query { themes(first: 50) { nodes { id name role } } }
      `);
      const themesData = await themesResponse.json() as any;
      const themes = themesData.data?.themes?.nodes || [];
      const demoTheme = themes.find(
        (t: { name: string; role: string }) => t.name === DEMO_THEME_NAME && t.role === "UNPUBLISHED",
      );

      if (demoTheme) {
        const filename = `sections/section-ai-${aiSection.slug}.liquid`;
        await admin.graphql(
          `mutation ThemeFilesDelete($themeId: ID!, $files: [String!]!) {
            themeFilesDelete(themeId: $themeId, files: $files) {
              deletedThemeFiles { filename }
              userErrors { field message }
            }
          }`,
          { variables: { themeId: demoTheme.id, files: [filename] } }
        );
      }

      return {
        error: null,
        generatedSection: null,
        removedTest: true,
        removeMessage: `"${aiSection.name}" wurde aus dem Demo-Theme entfernt.`,
      };
    } catch (err: any) {
      console.error("Remove test error:", err);
      return { error: `Entfernen fehlgeschlagen: ${err?.message || "Unknown"}`, generatedSection: null };
    }
  }

  // ─── BUY: Purchase section and save permanently to My Sections ───
  if (intent === "buy") {
    const aiSectionId = formData.get("aiSectionId") as string;

    if (!aiSectionId) {
      return { error: "Section ID fehlt.", generatedSection: null };
    }

    const aiSection = await prisma.aiSection.findFirst({
      where: { id: aiSectionId, shop: session.shop },
    });

    if (!aiSection) {
      return { error: "Section nicht gefunden.", generatedSection: null };
    }

    // Mark as purchased
    await prisma.aiSection.update({
      where: { id: aiSection.id },
      data: { installed: true, installedAt: new Date() },
    });

    // Also ensure it's installed in the theme (it may or may not be from testing)
    try {
      const themesResponse = await admin.graphql(`
        query { themes(first: 10) { nodes { id name role } } }
      `);
      const themesData = await themesResponse.json() as any;
      const themes = themesData.data?.themes?.nodes || [];
      const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

      if (mainTheme) {
        const sanitizedCode = sanitizeShopifySchema(aiSection.liquidCode);
        const filename = `sections/section-ai-${aiSection.slug}.liquid`;

        await admin.graphql(
          `mutation ThemeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
            themeFilesUpsert(files: $files, themeId: $themeId) {
              upsertedThemeFiles { filename }
              userErrors { field message }
            }
          }`,
          {
            variables: {
              files: [{ filename, body: { type: "TEXT", value: sanitizedCode } }],
              themeId: mainTheme.id,
            },
          }
        );
      }
    } catch (err) {
      console.error("Theme install on buy (non-fatal):", err);
    }

    return {
      error: null,
      generatedSection: null,
      purchased: true,
      purchaseMessage: `🎉 "${aiSection.name}" wurde gekauft und in My Sections gespeichert! Du kannst die Section jetzt dauerhaft nutzen und jederzeit von My Sections aus verwalten.`,
    };
  }

  return { error: "Unbekannte Aktion", generatedSection: null };
};

// ─── Visual Section Preview Component ───
type PreviewProps = {
  name: string;
  sectionType: string;
  style: string;
  colorScheme: string;
  features: {
    hasStars: boolean;
    hasPhotos: boolean;
    hasCarousel: boolean;
    hasDarkMode: boolean;
    hasGradient: boolean;
    hasButtons: boolean;
    hasIcons: boolean;
    hasCountdown: boolean;
    hasEmail: boolean;
    columnCount: number;
  };
};

function getColorPalette(colorScheme: string, style: string) {
  const palettes: Record<string, { bg: string; text: string; accent: string; muted: string; card: string }> = {
    light: { bg: "#ffffff", text: "#1a1a2e", accent: "#6366f1", muted: "#94a3b8", card: "#f8fafc" },
    dark: { bg: "#0f172a", text: "#f1f5f9", accent: "#818cf8", muted: "#64748b", card: "#1e293b" },
    brand: { bg: "#faf5ff", text: "#2e1065", accent: "#8b5cf6", muted: "#a78bfa", card: "#f3e8ff" },
    gradient: { bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", text: "#ffffff", accent: "#fbbf24", muted: "rgba(255,255,255,0.6)", card: "rgba(255,255,255,0.12)" },
  };
  const base = palettes[colorScheme] || palettes.light;
  if (style === "luxury") {
    base.accent = "#d4af37";
    base.bg = colorScheme === "dark" ? "#1a1a1a" : "#fefdf8";
  }
  if (style === "bold") {
    base.accent = "#ef4444";
  }
  if (style === "playful") {
    base.accent = "#f472b6";
  }
  return base;
}

function SectionPreviewMockup({ name, sectionType, style: styleChoice, colorScheme, features }: PreviewProps) {
  const colors = getColorPalette(colorScheme, styleChoice);
  const isGradientBg = colorScheme === "gradient";
  const borderRadius = styleChoice === "modern" ? 12 : styleChoice === "playful" ? 16 : 8;

  const wrapperStyle: React.CSSProperties = {
    background: isGradientBg ? colors.bg : colors.bg,
    borderRadius,
    overflow: "hidden",
    border: isGradientBg ? "none" : `1px solid ${colorScheme === "dark" ? "#334155" : "#e2e8f0"}`,
    position: "relative",
  };

  const renderStars = (count: number) => (
    <span style={{ color: "#fbbf24", fontSize: 14, letterSpacing: 2 }}>
      {"★".repeat(count)}{"☆".repeat(5 - count)}
    </span>
  );

  const placeholderAvatar = (initials: string, color: string) => (
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
      {initials}
    </div>
  );

  const placeholderImage = (w: number, h: number, label?: string) => (
    <div style={{ width: w, height: h, background: `linear-gradient(135deg, ${colors.accent}33, ${colors.accent}11)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${colors.accent}44` }}>
      <span style={{ fontSize: 12, color: colors.muted }}>{label || "Image"}</span>
    </div>
  );

  // ─── HERO ───
  if (sectionType === "hero") {
    return (
      <div style={wrapperStyle}>
        <div style={{ padding: "48px 32px", textAlign: "center", background: isGradientBg ? colors.bg : undefined, position: "relative", minHeight: 220 }}>
          {features.hasPhotos && (
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${colors.accent}22, transparent)`, zIndex: 0 }} />
          )}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: colors.text, marginBottom: 12, letterSpacing: -0.5 }}>Your Store Headline</div>
            <div style={{ fontSize: 15, color: colors.muted, maxWidth: 450, margin: "0 auto 24px", lineHeight: 1.5 }}>Compelling subheading that describes your brand value and draws customers in.</div>
            {features.hasButtons && (
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <div style={{ padding: "12px 28px", background: colors.accent, color: "#fff", borderRadius: 8, fontWeight: 600, fontSize: 14 }}>Shop Now</div>
                <div style={{ padding: "12px 28px", background: "transparent", color: colors.accent, borderRadius: 8, fontWeight: 600, fontSize: 14, border: `2px solid ${colors.accent}` }}>Learn More</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── TESTIMONIAL ───
  if (sectionType === "testimonial") {
    const testimonials = [
      { name: "Sarah M.", text: "Absolutely love the quality! Will definitely order again.", initials: "SM", color: "#8b5cf6" },
      { name: "James R.", text: "Fast shipping and excellent customer service. Highly recommend!", initials: "JR", color: "#10b981" },
      { name: "Emily K.", text: "Best purchase I've made this year. Five stars all around!", initials: "EK", color: "#f59e0b" },
    ];
    return (
      <div style={wrapperStyle}>
        <div style={{ padding: "32px 24px", background: isGradientBg ? colors.bg : undefined }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>What Our Customers Say</div>
            <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Real reviews from real customers</div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {testimonials.slice(0, features.columnCount).map((t, i) => (
              <div key={i} style={{ flex: 1, background: colors.card, borderRadius: borderRadius - 2, padding: 20, border: isGradientBg ? "none" : `1px solid ${colorScheme === "dark" ? "#334155" : "#e2e8f0"}` }}>
                {features.hasStars && <div style={{ marginBottom: 8 }}>{renderStars(5 - (i % 2 === 0 ? 0 : 1))}</div>}
                <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.5, marginBottom: 16, fontStyle: "italic" }}>"{t.text}"</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {features.hasPhotos && placeholderAvatar(t.initials, t.color)}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: colors.muted }}>Verified Buyer</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {features.hasCarousel && (
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
              {[0, 1, 2].map((d) => (
                <div key={d} style={{ width: d === 0 ? 24 : 8, height: 8, borderRadius: 4, background: d === 0 ? colors.accent : `${colors.accent}44`, transition: "all 0.3s" }} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── FAQ ───
  if (sectionType === "faq") {
    const faqs = [
      { q: "How does shipping work?", a: "We offer free shipping on all orders over €50. Standard delivery takes 3-5 business days." },
      { q: "What is your return policy?", a: "You can return any item within 30 days for a full refund." },
      { q: "Do you ship internationally?", a: "Yes! We ship to over 50 countries worldwide." },
    ];
    return (
      <div style={wrapperStyle}>
        <div style={{ padding: "32px 24px", background: isGradientBg ? colors.bg : undefined }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>Frequently Asked Questions</div>
          </div>
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ background: colors.card, borderRadius: borderRadius - 2, padding: "16px 20px", border: isGradientBg ? "none" : `1px solid ${colorScheme === "dark" ? "#334155" : "#e2e8f0"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{faq.q}</div>
                  <div style={{ fontSize: 18, color: colors.accent, fontWeight: 700 }}>{i === 0 ? "−" : "+"}</div>
                </div>
                {i === 0 && <div style={{ fontSize: 13, color: colors.muted, marginTop: 8, lineHeight: 1.5 }}>{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── PRICING ───
  if (sectionType === "pricing") {
    const plans = [
      { name: "Basic", price: "€9", features: ["5 Products", "Basic Analytics", "Email Support"], popular: false },
      { name: "Pro", price: "€29", features: ["50 Products", "Advanced Analytics", "Priority Support", "Custom Domain"], popular: true },
      { name: "Enterprise", price: "€99", features: ["Unlimited Products", "Full Analytics", "24/7 Support", "Custom Domain", "API Access"], popular: false },
    ];
    return (
      <div style={wrapperStyle}>
        <div style={{ padding: "32px 24px", background: isGradientBg ? colors.bg : undefined }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>Choose Your Plan</div>
            <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Start free, upgrade anytime</div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
            {plans.slice(0, features.columnCount).map((plan, i) => (
              <div key={i} style={{ flex: 1, background: plan.popular ? colors.accent : colors.card, borderRadius: borderRadius - 2, padding: 20, border: plan.popular ? "none" : isGradientBg ? "none" : `1px solid ${colorScheme === "dark" ? "#334155" : "#e2e8f0"}`, transform: plan.popular ? "scale(1.04)" : undefined, boxShadow: plan.popular ? "0 8px 32px rgba(0,0,0,0.15)" : undefined }}>
                {plan.popular && <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Most Popular</div>}
                <div style={{ fontSize: 15, fontWeight: 700, color: plan.popular ? "#fff" : colors.text }}>{plan.name}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: plan.popular ? "#fff" : colors.text, margin: "8px 0 12px" }}>{plan.price}<span style={{ fontSize: 13, fontWeight: 400 }}>/mo</span></div>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ fontSize: 12, color: plan.popular ? "rgba(255,255,255,0.85)" : colors.muted, padding: "4px 0" }}>✓ {f}</div>
                ))}
                <div style={{ marginTop: 16, padding: "10px 0", background: plan.popular ? "rgba(255,255,255,0.2)" : colors.accent, color: plan.popular ? "#fff" : "#fff", borderRadius: 6, textAlign: "center", fontWeight: 600, fontSize: 13 }}>Get Started</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── TEAM ───
  if (sectionType === "team") {
    const members = [
      { name: "Alex Johnson", role: "CEO & Founder", initials: "AJ", color: "#6366f1" },
      { name: "Maria Garcia", role: "Head of Design", initials: "MG", color: "#ec4899" },
      { name: "David Chen", role: "Lead Developer", initials: "DC", color: "#10b981" },
    ];
    return (
      <div style={wrapperStyle}>
        <div style={{ padding: "32px 24px", background: isGradientBg ? colors.bg : undefined }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>Meet Our Team</div>
          </div>
          <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
            {members.map((m, i) => (
              <div key={i} style={{ textAlign: "center", flex: 1, maxWidth: 180 }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${m.color}, ${m.color}aa)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: "#fff", fontWeight: 700, fontSize: 22 }}>{m.initials}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{m.name}</div>
                <div style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{m.role}</div>
                {features.hasIcons && (
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                    {["𝕏", "in", "📧"].map((icon, j) => (
                      <div key={j} style={{ width: 28, height: 28, borderRadius: "50%", background: colors.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: colors.muted, border: `1px solid ${colorScheme === "dark" ? "#334155" : "#e2e8f0"}` }}>{icon}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── COUNTDOWN ───
  if (sectionType === "countdown") {
    return (
      <div style={wrapperStyle}>
        <div style={{ padding: "40px 24px", textAlign: "center", background: isGradientBg ? colors.bg : `linear-gradient(135deg, ${colors.accent}11, ${colors.accent}05)` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.accent, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Coming Soon</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: colors.text, marginBottom: 24 }}>New Collection Launch</div>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 24 }}>
            {[{ v: "12", l: "Days" }, { v: "08", l: "Hours" }, { v: "34", l: "Minutes" }, { v: "56", l: "Seconds" }].map((t, i) => (
              <div key={i} style={{ background: colors.card, borderRadius: borderRadius - 2, padding: "16px 20px", minWidth: 70, border: isGradientBg ? "none" : `1px solid ${colorScheme === "dark" ? "#334155" : "#e2e8f0"}` }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: colors.accent }}>{t.v}</div>
                <div style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 }}>{t.l}</div>
              </div>
            ))}
          </div>
          {features.hasEmail && (
            <div style={{ display: "flex", gap: 8, maxWidth: 400, margin: "0 auto" }}>
              <div style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: `1px solid ${colorScheme === "dark" ? "#334155" : "#d1d5db"}`, background: colors.card, color: colors.muted, fontSize: 13 }}>Enter your email</div>
              <div style={{ padding: "12px 24px", background: colors.accent, color: "#fff", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>Notify Me</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── CTA ───
  if (sectionType === "cta") {
    return (
      <div style={wrapperStyle}>
        <div style={{ padding: "48px 32px", textAlign: "center", background: isGradientBg ? colors.bg : `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)` }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: isGradientBg ? colors.text : "#fff", marginBottom: 12 }}>Ready to Get Started?</div>
          <div style={{ fontSize: 14, color: isGradientBg ? colors.muted : "rgba(255,255,255,0.8)", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.5 }}>Join thousands of happy customers. Start your free trial today and see the difference.</div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <div style={{ padding: "14px 32px", background: isGradientBg ? colors.accent : "#fff", color: isGradientBg ? "#fff" : colors.accent, borderRadius: 8, fontWeight: 700, fontSize: 15 }}>Start Free Trial</div>
            {features.hasButtons && (
              <div style={{ padding: "14px 32px", background: "transparent", color: isGradientBg ? colors.text : "#fff", borderRadius: 8, fontWeight: 600, fontSize: 15, border: `2px solid ${isGradientBg ? colors.accent : "rgba(255,255,255,0.5)"}` }}>Contact Sales</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── LOGO CLOUD ───
  if (sectionType === "logoCloud") {
    return (
      <div style={wrapperStyle}>
        <div style={{ padding: "32px 24px", textAlign: "center", background: isGradientBg ? colors.bg : undefined }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.muted, textTransform: "uppercase", letterSpacing: 2, marginBottom: 24 }}>Trusted by leading brands</div>
          <div style={{ display: "flex", gap: 32, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            {["Brand A", "Brand B", "Brand C", "Brand D", "Brand E"].map((brand, i) => (
              <div key={i} style={{ width: 100, height: 40, borderRadius: 6, background: colors.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: colors.muted, border: isGradientBg ? "none" : `1px solid ${colorScheme === "dark" ? "#334155" : "#e2e8f0"}` }}>{brand}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── FEATURES ───
  if (sectionType === "features") {
    const featureItems = [
      { icon: "🚀", title: "Lightning Fast", desc: "Optimized for speed and performance" },
      { icon: "🔒", title: "Secure", desc: "Enterprise-grade security built in" },
      { icon: "🎨", title: "Customizable", desc: "Match your brand perfectly" },
    ];
    return (
      <div style={wrapperStyle}>
        <div style={{ padding: "32px 24px", background: isGradientBg ? colors.bg : undefined }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>Why Choose Us</div>
            <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Everything you need in one place</div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {featureItems.map((f, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", background: colors.card, borderRadius: borderRadius - 2, padding: 24, border: isGradientBg ? "none" : `1px solid ${colorScheme === "dark" ? "#334155" : "#e2e8f0"}` }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: colors.text, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── GALLERY ───
  if (sectionType === "gallery") {
    return (
      <div style={wrapperStyle}>
        <div style={{ padding: "32px 24px", background: isGradientBg ? colors.bg : undefined }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>Gallery</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ aspectRatio: "4/3", background: `linear-gradient(${135 + i * 30}deg, ${colors.accent}${i % 2 === 0 ? "33" : "22"}, ${colors.accent}11)`, borderRadius: borderRadius - 2, display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${colors.accent}33` }}>
                <span style={{ fontSize: 11, color: colors.muted }}>Image {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── GENERIC (Fallback) ───
  return (
    <div style={wrapperStyle}>
      <div style={{ padding: "40px 24px", textAlign: "center", background: isGradientBg ? colors.bg : undefined }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: 8 }}>{name}</div>
        <div style={{ fontSize: 13, color: colors.muted, maxWidth: 500, margin: "0 auto 24px", lineHeight: 1.5 }}>Your custom AI-generated section will appear here with all the features you described.</div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ width: 140, height: 90, background: colors.card, borderRadius: borderRadius - 2, display: "flex", alignItems: "center", justifyContent: "center", border: isGradientBg ? "none" : `1px solid ${colorScheme === "dark" ? "#334155" : "#e2e8f0"}` }}>
              <span style={{ fontSize: 11, color: colors.muted }}>Block {i}</span>
            </div>
          ))}
        </div>
        {features.hasButtons && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "inline-block", padding: "12px 28px", background: colors.accent, color: "#fff", borderRadius: 8, fontWeight: 600, fontSize: 14 }}>Call to Action</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SectionAIPage() {
  const { examplePrompts, availableModels, defaultModel, existingAiSections, demoThemeId, demoThemeName } = useLoaderData<typeof loader>() || {} as any;
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [prompt, setPrompt] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [style, setStyle] = useState("modern");
  const [colorScheme, setColorScheme] = useState("light");
  const [model, setModel] = useState(defaultModel);
  const [showCode, setShowCode] = useState(false);
  // Keep generated section in state so it survives try/buy errors
  const [savedSection, setSavedSection] = useState<any>(null);
  // Track whether the current section has been test-installed
  const [isTesting, setIsTesting] = useState(false);

  // When a new section is generated, save it to state
  useEffect(() => {
    if (actionData?.generatedSection) {
      setSavedSection(actionData.generatedSection);
      setIsTesting(false); // reset test state for new section
    }
  }, [actionData?.generatedSection]);

  // Track try/remove status
  useEffect(() => {
    if ((actionData as any)?.triedSection) {
      setIsTesting(true);
    }
    if ((actionData as any)?.removedTest) {
      setIsTesting(false);
    }
  }, [(actionData as any)?.triedSection, (actionData as any)?.removedTest]);

  // Use saved section — don't let it disappear on try/buy errors
  const generatedSection = actionData?.generatedSection || savedSection;

  // Check if section name already exists (client-side)
  // Exclude the currently generated section from the duplicate check
  const nameSlug = sectionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const nameExists = (existingAiSections || []).some((s: any) => 
    s.slug === nameSlug && s.id !== generatedSection?.id
  );

  const handleGenerate = useCallback(() => {
    const formData = new FormData();
    formData.set("intent", "generate");
    formData.set("prompt", prompt);
    formData.set("sectionName", sectionName);
    formData.set("style", style);
    formData.set("colorScheme", colorScheme);
    formData.set("model", model);
    submit(formData, { method: "post" });
  }, [prompt, sectionName, style, colorScheme, model, submit]);

  const handleTry = useCallback(() => {
    const sectionId = actionData?.generatedSection?.id || savedSection?.id;
    if (!sectionId) return;
    const formData = new FormData();
    formData.set("intent", "try");
    formData.set("aiSectionId", sectionId);
    submit(formData, { method: "post" });
  }, [actionData, savedSection, submit]);

  const handleRemoveTest = useCallback(() => {
    const sectionId = actionData?.generatedSection?.id || savedSection?.id;
    if (!sectionId) return;
    const formData = new FormData();
    formData.set("intent", "remove-test");
    formData.set("aiSectionId", sectionId);
    submit(formData, { method: "post" });
  }, [actionData, savedSection, submit]);

  const handleBuy = useCallback(() => {
    const sectionId = actionData?.generatedSection?.id || savedSection?.id;
    if (!sectionId) return;
    const formData = new FormData();
    formData.set("intent", "buy");
    formData.set("aiSectionId", sectionId);
    submit(formData, { method: "post" });
  }, [actionData, savedSection, submit]);

  return (
    <Page
      title="Section AI"
      subtitle="Generate custom Shopify sections with AI"
      backAction={{ url: "/app" }}
    >
      <BlockStack gap="600">
        {/* Intro Banner */}
        <Card padding="0">
          <div
            style={{
              background:
                "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
              borderRadius: 12,
              padding: 32,
            }}
          >
            <BlockStack gap="300">
              <InlineStack gap="300" blockAlign="center">
                <span style={{ fontSize: 36 }}>🤖</span>
                <BlockStack gap="100">
                  <Text as="h2" variant="headingLg">
                    <span style={{ color: "white" }}>
                      AI Section Generator
                    </span>
                  </Text>
                  <Text as="p" variant="bodyMd">
                    <span style={{ color: "rgba(255,255,255,0.8)" }}>
                      Describe the section you need. Our AI creates
                      production-ready Liquid + CSS code, fully compatible with
                      Shopify OS 2.0 themes.
                    </span>
                  </Text>
                </BlockStack>
              </InlineStack>
              <InlineStack gap="400">
                <div
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    padding: "8px 16px",
                  }}
                >
                  <Text as="span" variant="bodySm">
                    <span style={{ color: "white" }}>💰 €5 per section</span>
                  </Text>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    padding: "8px 16px",
                  }}
                >
                  <Text as="span" variant="bodySm">
                    <span style={{ color: "white" }}>
                      ⚡ Ready in ~30 seconds
                    </span>
                  </Text>
                </div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 8,
                    padding: "8px 16px",
                  }}
                >
                  <Text as="span" variant="bodySm">
                    <span style={{ color: "white" }}>
                      🎨 Fully customizable
                    </span>
                  </Text>
                </div>
              </InlineStack>
            </BlockStack>
          </div>
        </Card>

        {/* Error */}
        {actionData?.error && (
          <Banner title="Fehler" tone="critical">
            {actionData.error}
          </Banner>
        )}

        {/* Test installed success */}
        {(actionData as any)?.triedSection && (
          <Banner title="🧪 Section zum Testen installiert!" tone="info">
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">{(actionData as any).tryMessage}</Text>
              <div style={{ marginTop: 8 }}>
                <Button url={`shopify://admin/themes/${((actionData as any).tryThemeId || demoThemeId || "").replace("gid://shopify/OnlineStoreTheme/", "")}/editor`} target="_blank">
                  Theme Editor öffnen
                </Button>
              </div>
            </BlockStack>
          </Banner>
        )}

        {/* Test removed */}
        {(actionData as any)?.removedTest && (
          <Banner title="Section aus Theme entfernt" tone="warning">
            <Text as="p" variant="bodyMd">{(actionData as any).removeMessage}</Text>
          </Banner>
        )}

        {/* Purchase success */}
        {(actionData as any)?.purchased && (
          <Banner title="🎉 Section gekauft!" tone="success">
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">{(actionData as any).purchaseMessage}</Text>
              <div style={{ marginTop: 8 }}>
                <Button url="/app/my-sections">
                  My Sections öffnen
                </Button>
              </div>
            </BlockStack>
          </Banner>
        )}

        <Layout>
          {/* Left: Generator Form */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Describe Your Section
                </Text>

                <TextField
                  label="Section Name"
                  value={sectionName}
                  onChange={setSectionName}
                  autoComplete="off"
                  placeholder="z.B. My Hero Banner, Product Reviews, FAQ Section..."
                  helpText={
                    nameExists 
                      ? "⚠️ Dieser Name ist bereits vergeben. Bitte wähle einen anderen."
                      : "Eindeutiger Name für deine Section — so findest du sie später wieder"
                  }
                  error={nameExists ? "Name bereits vergeben" : undefined}
                />

                <TextField
                  label="Was für eine Section brauchst du?"
                  value={prompt}
                  onChange={setPrompt}
                  multiline={4}
                  autoComplete="off"
                  placeholder="z.B. Ein Testimonial-Karussell mit Sternebewertungen, Kundenfotos und Auto-Scroll. Soll Dark Mode unterstützen und 3 Testimonials gleichzeitig auf Desktop zeigen."
                  helpText={`${prompt.length} Zeichen — je detaillierter, desto besser das Ergebnis`}
                />

                <InlineStack gap="400">
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Style"
                      options={[
                        { label: "Modern & Clean", value: "modern" },
                        { label: "Bold & Colorful", value: "bold" },
                        { label: "Minimal", value: "minimal" },
                        { label: "Classic / Traditional", value: "classic" },
                        { label: "Playful / Fun", value: "playful" },
                        { label: "Luxury / Elegant", value: "luxury" },
                      ]}
                      value={style}
                      onChange={setStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Color Scheme"
                      options={[
                        { label: "Light", value: "light" },
                        { label: "Dark", value: "dark" },
                        { label: "Brand colors (from theme)", value: "brand" },
                        { label: "Gradient", value: "gradient" },
                      ]}
                      value={colorScheme}
                      onChange={setColorScheme}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="AI Model"
                      options={availableModels}
                      value={model}
                      onChange={setModel}
                      helpText="Steuert Qualität & Kosten"
                    />
                  </div>
                </InlineStack>

                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Badge tone="info">€5</Badge>
                    <Text as="span" variant="bodySm" tone="subdued">
                      Wird nur bei Installation berechnet
                    </Text>
                  </InlineStack>
                  <Button
                    variant="primary"
                    size="large"
                    onClick={handleGenerate}
                    disabled={prompt.length < 10 || sectionName.length < 2 || nameExists || isSubmitting}
                    loading={isSubmitting}
                  >
                    {isSubmitting ? "🤖 AI generiert..." : "✨ Section generieren"}
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Generated Result — Visual Preview */}
            {generatedSection && (
              <div style={{ marginTop: 16 }}>
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <span style={{ fontSize: 20 }}>✅</span>
                        <Text as="h2" variant="headingMd">
                          Section Generated!
                        </Text>
                      </InlineStack>
                      <Badge tone="success">Ready</Badge>
                    </InlineStack>

                    <Divider />

                    {/* Visual Section Preview */}
                    <SectionPreviewMockup
                      name={generatedSection.name}
                      sectionType={generatedSection.sectionType}
                      style={generatedSection.style}
                      colorScheme={generatedSection.colorScheme}
                      features={generatedSection.features}
                    />

                    {/* Section Info */}
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {generatedSection.name}
                        </Text>
                        <Badge>{generatedSection.style}</Badge>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {generatedSection.prompt}
                      </Text>
                    </BlockStack>

                    <InlineStack gap="200">
                      <Badge>Liquid</Badge>
                      <Badge>CSS</Badge>
                      <Badge>OS 2.0</Badge>
                      <Badge>Responsive</Badge>
                      <Badge>Theme Editor Settings</Badge>
                      {generatedSection.modelUsed && (
                        <Badge tone="info">{`🤖 ${generatedSection.modelUsed}`}</Badge>
                      )}
                      {generatedSection.tokensUsed > 0 && (
                        <Badge tone="attention">{`${generatedSection.tokensUsed} tokens`}</Badge>
                      )}
                    </InlineStack>

                    {/* Code Preview Toggle */}
                    <Button
                      variant="plain"
                      onClick={() => setShowCode(!showCode)}
                    >
                      {showCode ? "🔼 Code ausblenden" : "🔽 Generierten Code anzeigen"}
                    </Button>

                    {showCode && generatedSection.liquid && (
                      <div
                        style={{
                          background: "#1e293b",
                          borderRadius: 8,
                          padding: 16,
                          maxHeight: 400,
                          overflow: "auto",
                        }}
                      >
                        <pre
                          style={{
                            color: "#e2e8f0",
                            fontSize: 12,
                            lineHeight: 1.5,
                            fontFamily: "monospace",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            margin: 0,
                          }}
                        >
                          {generatedSection.liquid}
                        </pre>
                      </div>
                    )}

                    <Divider />

                    {/* Try & Buy Actions */}
                    <BlockStack gap="400">
                      {/* Step 1: Test in Theme */}
                      <Card>
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="100">
                              <Text as="p" variant="headingSm">
                                🧪 Kostenlos testen
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {isTesting 
                                  ? `Section ist in "Section Hub Demo" installiert — öffne den Theme Editor um sie anzupassen`
                                  : "Installiert die Section in ein Demo-Theme, damit du sie im Theme Editor ansehen und ausprobieren kannst — dein Live-Theme bleibt unberührt"
                                }
                              </Text>
                            </BlockStack>
                          </InlineStack>
                          <InlineStack gap="200">
                            {!isTesting ? (
                              <Button
                                variant="secondary"
                                size="large"
                                onClick={handleTry}
                                loading={isSubmitting}
                              >
                                🧪 Im Theme testen
                              </Button>
                            ) : (
                              <>
                                <Button
                                  url={`shopify://admin/themes/${((actionData as any)?.tryThemeId || demoThemeId || "").replace("gid://shopify/OnlineStoreTheme/", "")}/editor`}
                                  target="_blank"
                                  variant="primary"
                                  size="large"
                                >
                                  🎨 Theme Editor öffnen
                                </Button>
                                <Button
                                  variant="plain"
                                  tone="critical"
                                  onClick={handleRemoveTest}
                                  loading={isSubmitting}
                                >
                                  Test entfernen
                                </Button>
                              </>
                            )}
                          </InlineStack>
                        </BlockStack>
                      </Card>

                      {/* Step 2: Buy permanently */}
                      <Card>
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <BlockStack gap="100">
                              <Text as="p" variant="headingSm">
                                � Section kaufen — €5
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Permanent speichern in My Sections — dauerhaft in deinem Theme nutzen
                              </Text>
                            </BlockStack>
                          </InlineStack>
                          {(actionData as any)?.purchased ? (
                            <Button variant="primary" tone="success" size="large" disabled>
                              ✅ Gekauft — in My Sections
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              tone="success"
                              size="large"
                              onClick={handleBuy}
                              loading={isSubmitting}
                            >
                              💰 Für €5 kaufen
                            </Button>
                          )}
                        </BlockStack>
                      </Card>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </div>
            )}
          </Layout.Section>

          {/* Right Sidebar: Examples & How it works */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* How it works */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    How it works
                  </Text>
                  {[
                    {
                      step: "1",
                      title: "Beschreiben",
                      desc: "Sage der AI was für eine Section du brauchst",
                    },
                    {
                      step: "2",
                      title: "Generieren",
                      desc: "AI erstellt Liquid + CSS Code",
                    },
                    {
                      step: "3",
                      title: "Testen",
                      desc: "Installiere kostenlos ins Theme und teste im Editor",
                    },
                    {
                      step: "4",
                      title: "Kaufen",
                      desc: "Für €5 kaufen — dauerhaft in My Sections",
                    },
                  ].map((item) => (
                    <InlineStack key={item.step} gap="300" blockAlign="start">
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #6366f1, #8b5cf6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          color: "white",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {item.step}
                      </div>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {item.title}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {item.desc}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              </Card>

              {/* Example Prompts */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    💡 Example Prompts
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Click to use as starting point
                  </Text>
                  {examplePrompts.map((example, i) => (
                    <div
                      key={i}
                      onClick={() => setPrompt(example)}
                      onKeyDown={() => {}}
                      role="button"
                      tabIndex={0}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        cursor: "pointer",
                        fontSize: 13,
                        lineHeight: 1.4,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.borderColor = "#8b5cf6";
                        (e.target as HTMLElement).style.background = "#f5f3ff";
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.borderColor = "#e5e7eb";
                        (e.target as HTMLElement).style.background = "transparent";
                      }}
                    >
                      {example}
                    </div>
                  ))}
                </BlockStack>
              </Card>

              {/* Whats included */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    What's included
                  </Text>
                  {[
                    "✅ Production-ready Liquid code",
                    "✅ Responsive CSS styles",
                    "✅ Theme Editor settings",
                    "✅ OS 2.0 compatible",
                    "✅ Works with all themes",
                    "✅ Unlimited usage",
                    "✅ Free updates",
                  ].map((item, i) => (
                    <Text key={i} as="p" variant="bodySm">
                      {item}
                    </Text>
                  ))}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
