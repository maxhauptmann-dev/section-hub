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
      {/* Image or Fallback */}
      {hasPreviews ? (
        <img
          src={previews[currentIndex].src}
          alt={previews[currentIndex].alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "opacity 0.3s ease",
          }}
        />
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

      {/* Variant Label */}
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
          {previews[currentIndex].label}
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

  // Load AI-generated purchased sections for this shop
  const aiSections = await prisma.aiSection.findMany({
    where: { shop: session.shop, installed: true },
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
        { variables: { themeId: mainTheme.id, filenames: allFilenames } }
      );
      
      if (!filesResponse.ok) {
        throw new Error(`Files GraphQL request failed`);
      }
      
      const filesData = await filesResponse.json() as any;
      const themeFiles = filesData.data?.theme?.files?.nodes || [];

      // Extract section IDs from filenames like "sections/section-hero-minimal.liquid"
      installedSectionIds = themeFiles
        .map((f: { filename: string }) => {
          const match = f.filename.match(/^sections\/section-(.+)\.liquid$/);
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

  return { allSections, installedSections, installedSectionIds, aiSections, installedAiSlugs };
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

    try {
      const sectionFileName = `section-${sectionId}.liquid`;

      // Embed CSS inline
      const liquidWithStyles = `{% comment %}
  Section Hub - ${section.name}
  Version: ${section.version}
  Installed via Section Hub App
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

      const fileInput = {
        filename: `sections/${sectionFileName}`,
        body: {
          type: "TEXT",
          value: liquidWithStyles,
        },
      };

      const themeFilesResponse = await admin.graphql(
        `mutation ThemeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
          themeFilesUpsert(files: $files, themeId: $themeId) {
            upsertedThemeFiles {
              filename
            }
            userErrors {
              field
              message
            }
            job {
              id
            }
          }
        }`,
        {
          variables: {
            files: [fileInput],
            themeId: mainTheme.id,
          },
        }
      );

      const themeFilesData = (await themeFilesResponse.json()) as any;
      console.log("GraphQL themeFilesUpsert Response:", JSON.stringify(themeFilesData, null, 2));

      if (themeFilesData.errors) {
        const errorMsg = themeFilesData.errors[0]?.message || JSON.stringify(themeFilesData.errors);
        return { success: false, error: `GraphQL Error: ${errorMsg}` };
      }

      const userErrors = themeFilesData.data?.themeFilesUpsert?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors
          .map((e: { field?: string[]; message: string }) => `${(e.field || []).join(".")}: ${e.message}`)
          .join(", ");
        return { success: false, error: `Error creating section: ${errorMsg}` };
      }

      const upsertedFiles = themeFilesData.data?.themeFilesUpsert?.upsertedThemeFiles || [];
      if (upsertedFiles.length === 0) {
        return { success: false, error: "Section could not be installed. Please try again later." };
      }

      return {
        success: true,
        message: `${section.name} was successfully installed in "${mainTheme.name}"!`,
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
      const fileInput = {
        filename,
        body: { type: "TEXT", value: sanitizedCode },
      };

      const themeFilesResponse = await admin.graphql(
        `mutation ThemeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
          themeFilesUpsert(files: $files, themeId: $themeId) {
            upsertedThemeFiles { filename }
            userErrors { field message }
            job { id }
          }
        }`,
        { variables: { files: [fileInput], themeId: mainTheme.id } }
      );

      const themeFilesData = (await themeFilesResponse.json()) as any;

      if (themeFilesData.errors) {
        const errorMsg = themeFilesData.errors[0]?.message || JSON.stringify(themeFilesData.errors);
        return { success: false, error: `GraphQL Error: ${errorMsg}` };
      }

      const userErrors = themeFilesData.data?.themeFilesUpsert?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors
          .map((e: { field?: string[]; message: string }) => `${(e.field || []).join(".")}: ${e.message}`)
          .join(", ");
        return { success: false, error: `Fehler beim Installieren: ${errorMsg}` };
      }

      const upsertedFiles = themeFilesData.data?.themeFilesUpsert?.upsertedThemeFiles || [];
      if (upsertedFiles.length === 0) {
        return { success: false, error: "Section konnte nicht installiert werden. Bitte versuche es später erneut." };
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
  const { allSections, installedSections, aiSections, installedAiSlugs } = useLoaderData<typeof loader>();
  const [showUninstallModal, setShowUninstallModal] = useState<string | null>(null);
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData) {
      setResult(actionData as { success?: boolean; message?: string; error?: string });
      setShowUninstallModal(null);
    }
  }, [actionData]);

  const availableSections = allSections.filter(
    (s) => !installedSections.some((installed) => installed.id === s.id)
  );

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
              <div>
                <Text as="h2" variant="headingLg">
                  📥 Installed Sections ({installedSections.length})
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  These sections are installed in your theme and can be managed.
                </Text>
              </div>

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
                                <Badge tone="success">{section.category}</Badge>
                                {section.tags.slice(0, 2).map((tag: string) => (
                                  <Badge key={tag}>{tag}</Badge>
                                ))}
                              </InlineStack>
                              <div style={{ marginTop: 12 }}>
                                <InlineStack gap="200">
                                  <Button variant="primary" size="slim" fullWidth disabled>
                                    ✓ Installed
                                  </Button>
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

        {/* Available Sections */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div>
                <Text as="h2" variant="headingLg">
                  🤖 AI-Generated Sections ({(aiSections as any[]).length})
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Sections die du mit Section AI erstellt und gekauft hast.
                </Text>
              </div>

              {(aiSections as any[]).length === 0 ? (
                <Text as="p" variant="bodySm" tone="subdued">
                  Noch keine AI-Sections gekauft. Erstelle deine erste mit Section AI!
                </Text>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 16,
                  }}
                >
                  {(aiSections as any[]).map((ai: any) => (
                    <Card key={ai.id} padding="0">
                      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        <div
                          style={{
                            height: 140,
                            borderTopLeftRadius: 12,
                            borderTopRightRadius: 12,
                            overflow: "hidden",
                            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                          }}
                        >
                          <span style={{ fontSize: 48 }}>🤖</span>
                          <div style={{ position: "absolute", top: 12, right: 12 }}>
                            <Badge tone={(installedAiSlugs as string[]).includes(ai.slug) ? "success" : "info"}>
                              {(installedAiSlugs as string[]).includes(ai.slug) ? "✓ Im Theme" : "Gespeichert"}
                            </Badge>
                          </div>
                        </div>
                        <Box padding="400">
                          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 160 }}>
                            <Text as="h3" variant="headingSm">
                              {ai.name}
                            </Text>
                            <div style={{ marginTop: 8, marginBottom: 8, minHeight: 40, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {ai.prompt}
                              </Text>
                            </div>
                            <div style={{ marginTop: "auto" }}>
                              <InlineStack gap="100" wrap>
                                <Badge tone="info">{ai.sectionType}</Badge>
                                <Badge>{ai.style}</Badge>
                                <Badge>{ai.model}</Badge>
                              </InlineStack>
                              <div style={{ marginTop: 8 }}>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  {`Erstellt: ${new Date(ai.createdAt).toLocaleDateString("de-DE")}`}
                                </Text>
                              </div>
                              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                  {(installedAiSlugs as string[]).includes(ai.slug) ? (
                                    <Button
                                      variant="primary"
                                      tone="critical"
                                      size="slim"
                                      fullWidth
                                      loading={isSubmitting}
                                      onClick={() => {
                                        const formData = new FormData();
                                        formData.set("action", "removeAiSection");
                                        formData.set("sectionId", ai.id);
                                        submit(formData, { method: "post" });
                                      }}
                                    >
                                      Aus Theme entfernen
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="primary"
                                      size="slim"
                                      fullWidth
                                      loading={isSubmitting}
                                      onClick={() => {
                                        const formData = new FormData();
                                        formData.set("action", "installAiSection");
                                        formData.set("sectionId", ai.id);
                                        submit(formData, { method: "post" });
                                      }}
                                    >
                                      In Theme installieren
                                    </Button>
                                  )}
                                </div>
                                <Button
                                  variant="plain"
                                  tone="critical"
                                  size="slim"
                                  onClick={() => {
                                    if (confirm(`"${ai.name}" wirklich löschen? Die Section wird aus deinem Theme und aus My Sections entfernt.`)) {
                                      const formData = new FormData();
                                      formData.set("action", "deleteAiSection");
                                      formData.set("sectionId", ai.id);
                                      submit(formData, { method: "post" });
                                    }
                                  }}
                                >
                                  🗑️ Löschen
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

        {/* Available Store Sections */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div>
                <Text as="h2" variant="headingLg">
                  ⭐ Available Sections ({availableSections.length})
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  More sections you can install.
                </Text>
              </div>

              {availableSections.length === 0 ? (
                <Text as="p" variant="bodySm" tone="subdued">
                  All available sections are already installed!
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
                                <Badge tone="info">{section.category}</Badge>
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