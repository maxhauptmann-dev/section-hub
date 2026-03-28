import { useState, useEffect } from "react";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllSections, getSectionWithFiles } from "../lib/sections.server";
import prisma from "../db.server";
import { sanitizeShopifySchema } from "../lib/sanitize-schema";
import type { SectionMeta } from "../lib/sections.server";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  Box,
  Modal,
  Banner,
  Icon,
} from "@shopify/polaris";
import { ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons";
import { checkIsPremium } from "../lib/is-premium.server";
import { hasPurchasedSection } from "../services/billing.server";

function priceLabel(price: { type: string; amount?: number; currency?: string }): string {
  if (price.type === "free") return "Free";
  return `€${price.amount}`;
}

// Preview Image Slider Component
function PreviewSlider({ 
  section,
  showPriceBadge = true,
}: { 
  section: SectionMeta;
  showPriceBadge?: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const previews = section.previews || [];
  const hasPreviews = previews.length > 0;
  const hasMultiple = previews.length > 1;

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i + 1) % previews.length);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i - 1 + previews.length) % previews.length);
  };

  return (
    <div 
      style={{
        position: "relative",
        height: 140,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: "hidden",
        background: section.previewColor || "#6366f1",
      }}
    >
      {/* Image or Video or Fallback */}
      {hasPreviews ? (
        (previews[currentIndex] as any).type === "video" ? (
          <video
            key={previews[currentIndex].src}
            src={previews[currentIndex].src}
            poster={(previews[currentIndex] as any).poster}
            loop
            muted
            playsInline
            preload="none"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transition: "opacity 0.3s ease",
            }}
          />
        ) : (
          <img
            src={previews[currentIndex].src}
            alt={previews[currentIndex].alt}
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transition: "opacity 0.3s ease",
            }}
          />
        )
      ) : (
        <div 
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text as="p" variant="headingMd">
            <span style={{ color: "white" }}>{section.name}</span>
          </Text>
        </div>
      )}

      {/* Price Badge */}
      {showPriceBadge && (
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <Badge tone={section.price.type === "free" ? "success" : "info"}>
            {priceLabel(section.price)}
          </Badge>
        </div>
      )}

      {/* Variant Label or Video Indicator */}
      {hasPreviews && previews[currentIndex].label && (
        <div style={{ 
          position: "absolute", 
          bottom: 12, 
          left: 12,
          background: "rgba(0,0,0,0.6)",
          color: "white",
          padding: "4px 8px",
          borderRadius: 4,
          fontSize: 12,
        }}>
          {(previews[currentIndex] as any).type === "video" ? `▶ ${previews[currentIndex].label}` : previews[currentIndex].label}
        </div>
      )}

      {/* Navigation Arrows */}
      {hasMultiple && (
        <>
          <button
            onClick={goPrev}
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.9)",
              border: "none",
              borderRadius: "50%",
              width: 28,
              height: 28,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
            aria-label="Previous preview"
          >
            <Icon source={ChevronLeftIcon} />
          </button>
          <button
            onClick={goNext}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.9)",
              border: "none",
              borderRadius: "50%",
              width: 28,
              height: 28,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
            aria-label="Next preview"
          >
            <Icon source={ChevronRightIcon} />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {hasMultiple && (
        <div style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          display: "flex",
          gap: 4,
        }}>
          {previews.map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i === currentIndex ? "white" : "rgba(255,255,255,0.5)",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const allSections = getAllSections();
  const shop = session.shop;

  // Check premium status
  const { isPremium } = await checkIsPremium(shop);

  // Load purchased sections for this shop
  const purchases = await prisma.sectionPurchase.findMany({
    where: { shop, status: "COMPLETED" },
  });
  const purchasedSectionIds = new Set<string>();
  for (const p of purchases) {
    // sectionHandle can be comma-separated for bundles
    for (const id of p.sectionHandle.split(",")) {
      purchasedSectionIds.add(id.trim());
    }
  }

  // Load AI-generated purchased sections for this shop
  const aiSections = await prisma.aiSection.findMany({
    where: { shop, installed: true },
    orderBy: { createdAt: "desc" },
  });

  // Query the active theme to find which sections are actually installed
  let installedSectionIds: string[] = [];
  let installedAiSlugs: string[] = [];

  try {
    // Get the main theme
    const themesResponse = await admin.graphql(`
      query {
        themes(first: 10) {
          nodes {
            id
            name
            role
          }
        }
      }
    `);
    
    if (!themesResponse.ok) {
      console.error("GraphQL request failed:", themesResponse.status);
      throw new Error(`GraphQL request failed with status ${themesResponse.status}`);
    }
    
    const themesData = await themesResponse.json() as any;
    const themes = themesData.data?.themes?.nodes || [];
    const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

    if (mainTheme) {
      // Build list of expected filenames for all our sections
      const expectedFilenames = allSections.map(s => `sections/section-${s.id}.liquid`);

      // Also check AI section filenames
      const aiFilenames = aiSections.map((ai: any) => `sections/section-ai-${ai.slug}.liquid`);
      const allFilenames = [...expectedFilenames, ...aiFilenames];

      // Query theme files matching our section filenames
      // Shopify limits filenames to 50 per request, so we batch
      const BATCH_SIZE = 50;
      let themeFiles: { filename: string }[] = [];

      for (let i = 0; i < allFilenames.length; i += BATCH_SIZE) {
        const batch = allFilenames.slice(i, i + BATCH_SIZE);
        const filesResponse = await admin.graphql(
          `query ThemeFiles($themeId: ID!, $filenames: [String!]!) {
            theme(id: $themeId) {
              files(first: 250, filenames: $filenames) {
                nodes {
                  filename
                }
              }
            }
          }`,
          { variables: { themeId: mainTheme.id, filenames: batch } }
        );
        
        if (!filesResponse.ok) {
          throw new Error(`Files GraphQL request failed`);
        }
        
        const filesData = await filesResponse.json() as any;
        const batchFiles = filesData.data?.theme?.files?.nodes || [];
        themeFiles = [...themeFiles, ...batchFiles];
      }

      console.log(`[my-sections] Theme: ${mainTheme.name} (${mainTheme.id})`);
      console.log(`[my-sections] Queried ${allFilenames.length} filenames (${Math.ceil(allFilenames.length / BATCH_SIZE)} batches), found ${themeFiles.length} files`);
      if (themeFiles.length > 0) {
        console.log(`[my-sections] Found files:`, themeFiles.map((f: any) => f.filename));
      }
      if (themeFiles.length === 0 && allFilenames.length > 0) {
        console.log(`[my-sections] Sample queried filenames:`, allFilenames.slice(0, 5));
      }

      // Also do a broad query to find ALL section files matching our patterns
      // This catches files installed with older naming schemes
      try {
        const allSectionsResponse = await admin.graphql(
          `query AllThemeSections($themeId: ID!) {
            theme(id: $themeId) {
              files(first: 250, filenames: ["sections/*.liquid"]) {
                nodes {
                  filename
                }
              }
            }
          }`,
          { variables: { themeId: mainTheme.id } }
        );
        if (allSectionsResponse.ok) {
          const allSectionsData = await allSectionsResponse.json() as any;
          const allThemeFiles = allSectionsData.data?.theme?.files?.nodes || [];
          // Filter to only our sections (contain "section-" or "sh-" or known patterns)
          const ourFiles = allThemeFiles.filter((f: any) => 
            f.filename.includes("section-") || f.filename.includes("sh-") || f.filename.includes("siq-")
          );
          console.log(`[my-sections] ALL theme section files (${allThemeFiles.length} total):`, allThemeFiles.map((f: any) => f.filename));
          if (ourFiles.length > 0) {
            console.log(`[my-sections] Our section files found with broad query:`, ourFiles.map((f: any) => f.filename));
          }
        }
      } catch (broadErr) {
        console.error("[my-sections] Broad query failed (non-fatal):", broadErr);
      }

      // Extract section IDs from filenames like "sections/section-hero-minimal.liquid"
      // Exclude AI sections (section-ai-*) which are handled separately below
      installedSectionIds = themeFiles
        .map((f: { filename: string }) => {
          const match = f.filename.match(/^sections\/section-(?!ai-)(.+)\.liquid$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];

      // Check which AI sections are installed on the theme
      const aiInstalledSlugs = themeFiles
        .map((f: { filename: string }) => {
          const match = f.filename.match(/^sections\/section-ai-(.+)\.liquid$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];
      installedAiSlugs = aiInstalledSlugs;
    }
  } catch (error) {
    console.error("Error fetching installed sections (non-fatal):", error);
    // Don't throw - just continue with empty installedSectionIds
  }

  const installedSections = allSections.filter(s => installedSectionIds.includes(s.id));

  // Load installation records for version tracking AND as fallback source of truth
  // This catches sections that were just installed but Shopify hasn't finished
  // processing the theme file yet (themeFilesUpsert is async with a background job)
  let sectionVersions: Record<string, string> = {};
  try {
    const installations = await (prisma as any).sectionInstallation.findMany({
      where: { shop },
    });
    for (const inst of installations) {
      const handle = (inst as any).sectionHandle as string;
      sectionVersions[handle] = (inst as any).installedVersion;
      // DB says installed, but theme query didn't find the file yet → add it
      if (!installedSectionIds.includes(handle)) {
        installedSectionIds.push(handle);
        const section = allSections.find(s => s.id === handle);
        if (section && !installedSections.some(s => s.id === section.id)) {
          installedSections.push(section);
        }
      }
    }
  } catch (err) {
    console.error("Error loading installation records (non-fatal):", err);
  }

  return {
    allSections,
    installedSections,
    installedSectionIds,
    aiSections,
    installedAiSlugs,
    sectionVersions,
    isPremium,
    purchasedSectionIds: Array.from(purchasedSectionIds),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const formData = await request.formData();
  const actionType = formData.get("action") as string;
  const sectionId = formData.get("sectionId") as string;

  if (!sectionId) {
    return { success: false, error: "Section ID is missing" };
  }

  if (actionType === "uninstall") {
    try {
      // Get the main theme
      const themesResponse = await admin.graphql(`
        query {
          themes(first: 10) {
            nodes {
              id
              name
              role
            }
          }
        }
      `);
      const themesData = await themesResponse.json();
      const themes = themesData.data?.themes?.nodes || [];
      const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

      if (!mainTheme) {
        return { success: false, error: "No active theme found." };
      }

      const filename = `sections/section-${sectionId}.liquid`;

      // Delete the section file from the theme
      const deleteResponse = await admin.graphql(
        `mutation ThemeFilesDelete($themeId: ID!, $files: [String!]!) {
          themeFilesDelete(themeId: $themeId, files: $files) {
            deletedThemeFiles {
              filename
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            themeId: mainTheme.id,
            files: [filename],
          },
        }
      );

      const deleteData = await deleteResponse.json() as any;
      console.log("themeFilesDelete response:", JSON.stringify(deleteData, null, 2));

      if (deleteData.errors) {
        const errorMsg = deleteData.errors[0]?.message || JSON.stringify(deleteData.errors);
        return { success: false, error: `GraphQL Error: ${errorMsg}` };
      }

      const userErrors = deleteData.data?.themeFilesDelete?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors.map((e: { field?: string[]; message: string }) =>
          `${(e.field || []).join(".")}: ${e.message}`
        ).join(", ");
        return { success: false, error: `Error: ${errorMsg}` };
      }

      // Remove installation record from DB
      try {
        await (prisma as any).sectionInstallation.deleteMany({
          where: { shop: session.shop, sectionHandle: sectionId },
        });
      } catch (dbErr) {
        console.error("Error removing installation record (non-fatal):", dbErr);
      }

      return {
        success: true,
        message: `Section "${sectionId}" was successfully removed from "${mainTheme.name}".`,
      };
    } catch (error) {
      console.error("Uninstall error:", error);
      return {
        success: false,
        error: `Error removing section: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }

  if (actionType === "install") {
    const section = getSectionWithFiles(sectionId);
    if (!section) {
      return { success: false, error: "Section not found" };
    }

    // Access check: free sections always allowed, premium users get all, otherwise must have purchased
    const isFreeSection = section.price?.type === "free";
    if (!isFreeSection) {
      const { isPremium } = await checkIsPremium(session.shop);
      if (!isPremium) {
        const purchased = await hasPurchasedSection(session.shop, sectionId);
        if (!purchased) {
          return {
            success: false,
            error: "Please subscribe to Premium or purchase this section first.",
            premiumRequired: true,
          };
        }
      }
    }

    try {
      const sectionFileName = `section-${sectionId}.liquid`;

      // Embed CSS inline
      const liquidWithStyles = `{% comment %}
  SectionIQ - ${section.name}
  Version: ${section.version}
  Installed via SectionIQ App
{% endcomment %}

<style>
${section.cssContent || ""}
</style>

${section.liquidContent || ""}`;

      // Hole das aktive Theme via GraphQL
      const themesResponse = await admin.graphql(`
        query {
          themes(first: 10) {
            nodes {
              id
              name
              role
            }
          }
        }
      `);
      const themesData = await themesResponse.json();
      const themes = themesData.data?.themes?.nodes || [];
      const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

      if (!mainTheme) {
        return { success: false, error: "No active theme found." };
      }

      const themeId = mainTheme.id.split("/").pop();

      const assetResponse = await fetch(
        `https://${session.shop}/admin/api/2024-10/themes/${themeId}/assets.json`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": session.accessToken || "",
          },
          body: JSON.stringify({
            asset: {
              key: `sections/${sectionFileName}`,
              value: liquidWithStyles,
            },
          }),
        }
      );

      if (!assetResponse.ok) {
        const errorData = await assetResponse.json().catch(() => ({}));
        console.error("My-sections install error:", errorData);
        return { success: false, error: "Error uploading section to theme." };
      }

      // Track installed version
      await (prisma as any).sectionInstallation.upsert({
        where: {
          shop_sectionHandle: {
            shop: session.shop,
            sectionHandle: sectionId,
          },
        },
        update: {
          installedVersion: section.version,
          themeId: mainTheme.id,
        },
        create: {
          shop: session.shop,
          sectionHandle: sectionId,
          installedVersion: section.version,
          themeId: mainTheme.id,
        },
      });

      return {
        success: true,
        message: `${section.name} was successfully installed in "${mainTheme.name}"!`,
        installedSectionId: sectionId,
      };
    } catch (error) {
      console.error("Install error:", error);
      return {
        success: false,
        error: `Error installing: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }

  // ─── INSTALL AI SECTION TO THEME ───
  if (actionType === "installAiSection") {
    try {
      const aiSection = await prisma.aiSection.findFirst({
        where: { id: sectionId, shop: session.shop },
      });

      if (!aiSection) {
        return { success: false, error: "AI Section nicht gefunden." };
      }

      // Sanitize the liquid code before uploading
      const sanitizedCode = sanitizeShopifySchema(aiSection.liquidCode);

      // Get main theme
      const themesResponse = await admin.graphql(`
        query { themes(first: 10) { nodes { id name role } } }
      `);
      const themesData = await themesResponse.json() as any;
      const themes = themesData.data?.themes?.nodes || [];
      const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

      if (!mainTheme) {
        return { success: false, error: "Kein aktives Theme gefunden." };
      }

      const filename = `sections/section-ai-${aiSection.slug}.liquid`;
      const themeId = mainTheme.id.split("/").pop();

      const assetResponse = await fetch(
        `https://${session.shop}/admin/api/2024-10/themes/${themeId}/assets.json`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": session.accessToken || "",
          },
          body: JSON.stringify({
            asset: { key: filename, value: sanitizedCode },
          }),
        }
      );

      if (!assetResponse.ok) {
        const errorData = await assetResponse.json().catch(() => ({}));
        console.error("My-sections AI install error:", errorData);
        return { success: false, error: "Fehler beim Installieren der Section." };
      }

      return {
        success: true,
        message: `"${aiSection.name}" wurde erfolgreich in "${mainTheme.name}" installiert!`,
      };
    } catch (error) {
      console.error("Install AI section error:", error);
      return {
        success: false,
        error: `Fehler beim Installieren: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }

  // ─── REMOVE AI SECTION FROM THEME (without deleting from DB) ───
  if (actionType === "removeAiSection") {
    try {
      const aiSection = await prisma.aiSection.findFirst({
        where: { id: sectionId, shop: session.shop },
      });

      if (!aiSection) {
        return { success: false, error: "AI Section nicht gefunden." };
      }

      const themesResponse = await admin.graphql(`
        query { themes(first: 10) { nodes { id name role } } }
      `);
      const themesData = await themesResponse.json() as any;
      const themes = themesData.data?.themes?.nodes || [];
      const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

      if (!mainTheme) {
        return { success: false, error: "Kein aktives Theme gefunden." };
      }

      const filename = `sections/section-ai-${aiSection.slug}.liquid`;
      await admin.graphql(
        `mutation ThemeFilesDelete($themeId: ID!, $files: [String!]!) {
          themeFilesDelete(themeId: $themeId, files: $files) {
            deletedThemeFiles { filename }
            userErrors { field message }
          }
        }`,
        { variables: { themeId: mainTheme.id, files: [filename] } }
      );

      return {
        success: true,
        message: `"${aiSection.name}" wurde aus "${mainTheme.name}" entfernt.`,
      };
    } catch (error) {
      console.error("Remove AI section error:", error);
      return {
        success: false,
        error: `Fehler beim Entfernen: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }

  // ─── DELETE AI SECTION ───
  if (actionType === "deleteAiSection") {
    try {
      // Find the AI section
      const aiSection = await prisma.aiSection.findFirst({
        where: { id: sectionId, shop: session.shop },
      });

      if (!aiSection) {
        return { success: false, error: "AI Section nicht gefunden." };
      }

      // Try to remove from theme if installed
      try {
        const themesResponse = await admin.graphql(`
          query { themes(first: 10) { nodes { id name role } } }
        `);
        const themesData = await themesResponse.json() as any;
        const themes = themesData.data?.themes?.nodes || [];
        const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");

        if (mainTheme) {
          const filename = `sections/section-ai-${aiSection.slug}.liquid`;
          await admin.graphql(
            `mutation ThemeFilesDelete($themeId: ID!, $files: [String!]!) {
              themeFilesDelete(themeId: $themeId, files: $files) {
                deletedThemeFiles { filename }
                userErrors { field message }
              }
            }`,
            { variables: { themeId: mainTheme.id, files: [filename] } }
          );
        }
      } catch (themeErr) {
        console.error("Error removing AI section from theme (non-fatal):", themeErr);
      }

      // Delete preview records
      await prisma.sectionPreview.deleteMany({
        where: { shop: session.shop, sectionId: `ai-${aiSection.slug}` },
      });

      // Delete the AI section from DB
      await prisma.aiSection.delete({ where: { id: aiSection.id } });

      return {
        success: true,
        message: `AI Section "${aiSection.name}" wurde gelöscht.`,
      };
    } catch (error) {
      console.error("Delete AI section error:", error);
      return {
        success: false,
        error: `Fehler beim Löschen: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }

  return { success: false, error: "Unknown action" };
};

export default function MySectionsPage() {
  const { allSections, installedSections, aiSections, installedAiSlugs, sectionVersions, isPremium, purchasedSectionIds } = useLoaderData<typeof loader>();
  const [showUninstallModal, setShowUninstallModal] = useState<string | null>(null);
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const isSubmitting = navigation.state === "submitting";

  // Semver comparison
  const isNewerVersion = (a: string, b: string): boolean => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return true;
      if ((pa[i] || 0) < (pb[i] || 0)) return false;
    }
    return false;
  };

  const hasUpdate = (section: SectionMeta): boolean => {
    const installed = (sectionVersions as Record<string, string>)[section.id] || "1.0.0";
    return isNewerVersion(section.version, installed);
  };

  const updatesCount = installedSections.filter(hasUpdate).length;

  useEffect(() => {
    if (actionData) {
      setResult(actionData as { success?: boolean; message?: string; error?: string });
      setShowUninstallModal(null);
    }
  }, [actionData]);

  // Available sections: only show sections the user can actually install
  // Premium → all sections, otherwise → purchased + free sections
  const availableSections = allSections.filter((s) => {
    // Exclude already-installed sections
    if (installedSections.some((installed) => installed.id === s.id)) return false;
    // Premium users see all sections
    if (isPremium) return true;
    // Free sections are always available
    if (s.price?.type === "free") return true;
    // Non-premium: show purchased sections
    if (purchasedSectionIds.includes(s.id)) return true;
    // Otherwise hide
    return false;
  });

  const sectionToRemove = installedSections.find(s => s.id === showUninstallModal);

  const handleUninstall = (sectionId: string) => {
    submit(
      { action: "uninstall", sectionId },
      { method: "post" }
    );
  };

  const handleInstall = (sectionId: string) => {
    submit(
      { action: "install", sectionId },
      { method: "post" }
    );
  };

  return (
    <Page title="My Sections">
      <Layout>
        {/* Success/Error Banner */}
        {result && (
          <Layout.Section>
            <Banner
              title={result.success ? "Success!" : "Error"}
              tone={result.success ? "success" : "critical"}
              onDismiss={() => setResult(null)}
            >
              <p>{result.success ? result.message : result.error}</p>
            </Banner>
          </Layout.Section>
        )}

        {/* Installed Sections */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center" wrap>
                <div>
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingLg">
                      📥 Installed Sections ({String(installedSections.length)})
                    </Text>
                    {updatesCount > 0 && (
                      <Badge tone="attention">{`${updatesCount} update${updatesCount > 1 ? "s" : ""}`}</Badge>
                    )}
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    These sections are installed in your theme and can be managed.
                  </Text>
                </div>
                {updatesCount > 0 && (
                  <Button variant="primary" url="/app/updates">
                    View Updates
                  </Button>
                )}
              </InlineStack>

              {installedSections.length === 0 ? (
                <Text as="p" variant="bodySm" tone="subdued">
                  No sections installed. Explore the store to add new ones.
                </Text>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 16,
                  }}
                >
                  {installedSections.map((section) => (
                    <Card key={section.id} padding="0">
                      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        <PreviewSlider section={section} showPriceBadge={false} />

                        <Box padding="400">
                          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 180 }}>
                            <Text as="h3" variant="headingSm">
                              {section.name}
                            </Text>
                            <div style={{ 
                              marginTop: 8,
                              marginBottom: 8,
                              minHeight: 40,
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical" as const,
                            }}>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {section.description}
                              </Text>
                            </div>
                            <div style={{ marginTop: "auto" }}>
                              <InlineStack gap="100" wrap>
                                <Badge tone="success">{Array.isArray(section.category) ? section.category[0] : section.category}</Badge>
                                {hasUpdate(section) && (
                                  <Badge tone="attention">{`Update: v${section.version}`}</Badge>
                                )}
                                {section.tags.slice(0, 2).map((tag: string) => (
                                  <Badge key={tag}>{tag}</Badge>
                                ))}
                              </InlineStack>
                              <div style={{ marginTop: 12 }}>
                                <InlineStack gap="200">
                                  {hasUpdate(section) ? (
                                    <Button
                                      variant="primary"
                                      tone="success"
                                      size="slim"
                                      fullWidth
                                      loading={isSubmitting}
                                      onClick={() => handleInstall(section.id)}
                                    >
                                      🔄 Update to v{section.version}
                                    </Button>
                                  ) : (
                                    <Button variant="primary" size="slim" fullWidth disabled>
                                      ✓ Installed
                                    </Button>
                                  )}
                                  <Button
                                    size="slim"
                                    variant="secondary"
                                    onClick={() => setShowUninstallModal(section.id)}
                                  >
                                    Remove
                                  </Button>
                                </InlineStack>
                              </div>
                            </div>
                          </div>
                        </Box>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Available Store Sections */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div>
                <Text as="h2" variant="headingLg">
                  ⭐ Available Sections ({availableSections.length})
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {isPremium
                    ? "All sections are included in your Premium plan."
                    : "Free sections and sections you've purchased. Subscribe to Premium to unlock all."}
                </Text>
              </div>

              {availableSections.length === 0 ? (
                <Text as="p" variant="bodySm" tone="subdued">
                  {isPremium
                    ? "All available sections are already installed!"
                    : "No purchased sections available. Browse the Store to purchase individual sections or subscribe to Premium to unlock all 138+ sections."}
                </Text>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 16,
                  }}
                >
                  {availableSections.map((section) => (
                    <Card key={section.id} padding="0">
                      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        <PreviewSlider section={section} showPriceBadge={true} />

                        <Box padding="400">
                          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 180 }}>
                            <Text as="h3" variant="headingSm">
                              {section.name}
                            </Text>
                            <div style={{ 
                              marginTop: 8,
                              marginBottom: 8,
                              minHeight: 40,
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical" as const,
                            }}>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {section.description}
                              </Text>
                            </div>
                            <div style={{ marginTop: "auto" }}>
                              <InlineStack gap="100" wrap>
                                <Badge tone="info">{Array.isArray(section.category) ? section.category[0] : section.category}</Badge>
                                {section.tags.slice(0, 2).map((tag: string) => (
                                  <Badge key={tag}>{tag}</Badge>
                                ))}
                              </InlineStack>
                              <div style={{ marginTop: 12 }}>
                                <Button
                                  variant="primary"
                                  size="slim"
                                  fullWidth
                                  onClick={() => handleInstall(section.id)}
                                  loading={isSubmitting}
                                >
                                  + Install
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Box>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Uninstall Confirmation Modal */}
      {showUninstallModal && sectionToRemove && (
        <Modal
          open={true}
          onClose={() => setShowUninstallModal(null)}
          title={`Remove "${sectionToRemove.name}"?`}
          primaryAction={{
            content: isSubmitting ? "Removing..." : "Yes, remove",
            destructive: true,
            onAction: () => handleUninstall(showUninstallModal),
            loading: isSubmitting,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setShowUninstallModal(null),
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd">
                The section <strong>{sectionToRemove.name}</strong> will be removed from your active theme.
              </Text>
              <Text as="p" variant="bodySm" tone="caution">
                ⚠️ If you are using this section on a page, it will be removed there as well.
                You can reinstall it at any time.
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}