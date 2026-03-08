import { useState, useEffect, useCallback } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useActionData, useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { getSectionWithFiles, getAllSections } from "../lib/sections.server";
import { hasPurchasedSection } from "../services/billing.server";
import prisma from "../db.server";
import { checkIsPremium } from "../lib/is-premium.server";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Divider,
  Banner,
  List,
  Button,
  Box,
  Icon,
  Spinner,
} from "@shopify/polaris";
import { ExternalIcon, ViewIcon, PlayIcon, ChevronLeftIcon, ChevronRightIcon, MaximizeIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const sectionId = url.searchParams.get("id");

  // Check premium status
  const { isPremium } = await checkIsPremium(session.shop);
  
  if (!sectionId) {
    return { section: null, allSections: getAllSections(), isPurchased: false, isPremium };
  }
  
  const section = getSectionWithFiles(sectionId);
  
  // Check if this section has been purchased by this shop
  let isPurchased = false;
  if (section && section.price?.type === "one_time" && (section.price?.amount || 0) > 0) {
    isPurchased = await hasPurchasedSection(session.shop, sectionId);
  }
  
  return { section, allSections: getAllSections(), isPurchased, isPremium };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const sectionId = formData.get("sectionId") as string;
  const actionType = formData.get("action") as string;
  
  if (actionType === "install" && sectionId) {
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
      console.log("GraphQL Themes:", themesData);
      
      const themes = themesData.data?.themes?.nodes || [];
      const mainTheme = themes.find((t: { role: string }) => t.role === "MAIN");
      
      if (!mainTheme) {
        return { success: false, error: "No active theme found." };
      }
      
      console.log("Selected theme:", mainTheme);
      
      // Use GraphQL themeFilesUpsert API
      console.log("Uploading section with GraphQL:", { filename: `sections/${sectionFileName}`, themeId: mainTheme.id });

      const fileInput = {
        filename: `sections/${sectionFileName}`,
        body: {
          type: "TEXT",
          value: liquidWithStyles,
        },
      };
      
      // GraphQL themeFilesUpsert requires the full GID
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
          }
        }
      );
      
      interface ThemeFilesUpsertResponse {
        data?: {
          themeFilesUpsert?: {
            upsertedThemeFiles?: { filename: string }[];
            userErrors?: { field?: string[] | null; message: string }[];
            job?: { id?: string } | null;
          };
        };
        errors?: { message: string }[];
      }

      const themeFilesData = (await themeFilesResponse.json()) as ThemeFilesUpsertResponse;
      console.log("GraphQL themeFilesUpsert Response:", JSON.stringify(themeFilesData, null, 2));
      
      if (themeFilesData.errors) {
        const errorMsg = themeFilesData.errors[0]?.message || JSON.stringify(themeFilesData.errors);
        console.error("GraphQL Error:", errorMsg);
        return { 
          success: false, 
          error: `GraphQL Error: ${errorMsg}`
        };
      }
      
      const userErrors = themeFilesData.data?.themeFilesUpsert?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors.map((e) => `${(e.field || []).join(".")}: ${e.message}`).join(", ");
        console.error("User Errors:", errorMsg);
        return { 
          success: false, 
          error: `Error creating section: ${errorMsg}`
        };
      }
      
      const upsertedFiles = themeFilesData.data?.themeFilesUpsert?.upsertedThemeFiles || [];
      if (upsertedFiles.length === 0) {
        return { 
          success: false, 
          error: "Section could not be installed. Please try again later."
        };
      }
      
      console.log("Section successfully installed:", upsertedFiles[0]?.filename);
      
      return { 
        success: true, 
        message: `${section.name} was successfully installed in "${mainTheme.name}"!`,
        themeName: mainTheme.name,
      };
    } catch (error) {
      console.error("Install error:", error);
      return { success: false, error: `An error occurred: ${error instanceof Error ? error.message : "Unknown"}` };
    }
  }
  
  return { success: false, error: "Unknown action" };
};

/* =============================================
   Preview Gallery with slider, thumbnails & lightbox
   ============================================= */
function PreviewGallery({
  previews,
  previewColor,
  sectionName,
}: {
  previews: { src: string; alt?: string; label?: string }[];
  previewColor?: string;
  sectionName: string;
}) {
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasMultiple = previews.length > 1;
  const bg = previewColor || "#1a1a1a";

  const goNext = () => setCurrent((i) => (i + 1) % previews.length);
  const goPrev = () => setCurrent((i) => (i - 1 + previews.length) % previews.length);

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, previews.length]);

  const arrowBtn = (direction: "left" | "right", onClick: () => void) => (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: "absolute",
        [direction]: 12,
        top: "50%",
        transform: "translateY(-50%)",
        background: "rgba(255,255,255,0.9)",
        border: "none",
        borderRadius: "50%",
        width: 32,
        height: 32,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 3,
      }}
      aria-label={direction === "left" ? "Previous" : "Next"}
    >
      <Icon source={direction === "left" ? ChevronLeftIcon : ChevronRightIcon} />
    </button>
  );

  return (
    <>
      {/* Main image */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 12,
          overflow: "hidden",
          background: bg,
          cursor: "pointer",
        }}
        onClick={() => setLightboxOpen(true)}
      >
        <img
          src={previews[current].src}
          alt={previews[current].alt || sectionName}
          style={{
            display: "block",
            width: "100%",
            maxHeight: 420,
            objectFit: "contain",
            padding: 12,
            boxSizing: "border-box",
          }}
        />

        {/* Label badge */}
        {previews[current].label && (
          <div style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
          }}>
            {previews[current].label}
          </div>
        )}

        {/* Enlarge hint */}
        <div style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "rgba(0,0,0,0.5)",
          color: "#fff",
          borderRadius: "50%",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Icon source={MaximizeIcon} tone="base" />
        </div>

        {/* Arrows */}
        {hasMultiple && (
          <>
            {arrowBtn("left", goPrev)}
            {arrowBtn("right", goNext)}
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {hasMultiple && (
        <div style={{
          display: "flex",
          gap: 8,
          marginTop: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          {previews.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              style={{
                width: 72,
                height: 48,
                borderRadius: 8,
                overflow: "hidden",
                border: idx === current ? `2px solid #2563eb` : "2px solid #e5e7eb",
                padding: 2,
                background: bg,
                cursor: "pointer",
                opacity: idx === current ? 1 : 0.7,
                transition: "all 0.2s",
              }}
            >
              <img
                src={p.src}
                alt={p.label || `Preview ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: 5,
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox overlay */}
      {lightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              cursor: "pointer",
              color: "#fff",
              fontSize: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
            }}
            aria-label="Close"
          >
            ✕
          </button>

          {/* Image counter */}
          {hasMultiple && (
            <div style={{
              position: "absolute",
              top: 20,
              left: "50%",
              transform: "translateX(-50%)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontWeight: 500,
            }}>
              {current + 1} / {previews.length}
            </div>
          )}

          {/* Full image */}
          <img
            src={previews[current].src}
            alt={previews[current].alt || sectionName}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              objectFit: "contain",
              borderRadius: 12,
              cursor: "default",
            }}
          />

          {/* Label in lightbox */}
          {previews[current].label && (
            <div style={{
              position: "absolute",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              padding: "6px 16px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
            }}>
              {previews[current].label}
            </div>
          )}

          {/* Lightbox arrows */}
          {hasMultiple && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                style={{
                  position: "absolute",
                  left: 20,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 24,
                }}
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                style={{
                  position: "absolute",
                  right: 20,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "50%",
                  width: 48,
                  height: 48,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 24,
                }}
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function priceLabel(price: { type: string; amount?: number; currency?: string }): string {
  if (price.type === "free") return "Free";
  return `€${price.amount}`;
}

export default function SectionDetailPage() {
  const { section, allSections, isPurchased, isPremium } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const isSubmitting = navigation.state === "submitting";
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [tryLoading, setTryLoading] = useState(false);
  const [tryResult, setTryResult] = useState<{
    success?: boolean;
    message?: string;
    error?: string;
    editorUrl?: string;
    themeName?: string;
    expiresAt?: string;
    trialDays?: number;
  } | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const isFreeSection = !section || section.price?.type === "free";
  const canInstall = isFreeSection || isPremium || isPurchased;

  // Show action result
  useEffect(() => {
    if (actionData) {
      setResult(actionData);
    }
  }, [actionData]);

  const handleInstall = async () => {
    if (!section) return;
    
    try {
      const formData = new FormData();
      formData.append("sectionId", section.id);

      const response = await fetch("/app/api/install-section", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Installation failed",
      });
    }
  };

  const handleTrySection = useCallback(async () => {
    if (!section) return;
    setTryLoading(true);
    setTryResult(null);

    try {
      const formData = new FormData();
      formData.append("sectionId", section.id);

      const response = await fetch("/app/api/try-section", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setTryResult(data);

      // Auto-open the Theme Editor in a new tab
      if (data.success && data.editorUrl) {
        window.open(data.editorUrl, "_blank");
      }
    } catch (err) {
      setTryResult({
        success: false,
        error: `Request failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    } finally {
      setTryLoading(false);
    }
  }, [section]);

  // Auto-trigger "Try Section" if ?try=true is in the URL
  useEffect(() => {
    if (section && !autoTriggered) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("try") === "true") {
        setAutoTriggered(true);
        handleTrySection();
      }
    }
  }, [section, autoTriggered, handleTrySection]);

  // If no section ID was provided, show list
  if (!section) {
    return (
      <Page 
        title="Install Section"
        backAction={{ content: "Back", onAction: () => navigate("/app/explore") }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Choose a section to install</Text>
                <BlockStack gap="300">
                  {allSections.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      style={{ 
                        padding: "16px", 
                        border: "1px solid #e5e5e5", 
                        borderRadius: "8px",
                        cursor: "pointer",
                        width: "100%",
                        background: "white",
                        textAlign: "left",
                      }}
                      role="link"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/app/section?id=${s.id}`);
                        }
                      }}
                      onClick={() => navigate(`/app/section?id=${s.id}`)}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            background: s.previewColor,
                          }} />
                          <BlockStack gap="100">
                            <Text as="p" variant="headingSm">{s.name}</Text>
                            <Text as="p" variant="bodySm" tone="subdued">{s.category}</Text>
                          </BlockStack>
                        </InlineStack>
                        <Badge tone={s.price.type === "free" ? "success" : "info"}>
                          {s.price.type === "free" ? "Free" : "Premium"}
                        </Badge>
                      </InlineStack>
                    </button>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title={section.name}
      backAction={{ content: "Back", onAction: () => navigate("/app/explore") }}
      primaryAction={
        canInstall
          ? {
              content: isSubmitting ? "Installing..." : "Install to Theme",
              onAction: handleInstall,
              loading: isSubmitting,
            }
          : {
              content: "Upgrade to Premium",
              onAction: () => navigate("/app/premium"),
            }
      }
      secondaryActions={[
        ...(!canInstall
          ? [{
              content: "Try Section",
              onAction: handleTrySection,
              loading: tryLoading,
              icon: PlayIcon,
            }]
          : []),
      ]}
    >
      <Layout>
        {/* Install Success/Error message */}
        {result && (
          <Layout.Section>
            <Banner
              title={result.success ? "Successfully installed!" : "Error"}
              tone={result.success ? "success" : "critical"}
              onDismiss={() => setResult(null)}
            >
              <p>{result.success ? result.message : result.error}</p>
              {result.success && (
                <p style={{ marginTop: 8 }}>
                  Now open the Theme Editor and add the section to your page.
                </p>
              )}
            </Banner>
          </Layout.Section>
        )}

        {/* Try Section Success/Error message */}
        {tryResult && (
          <Layout.Section>
            <Banner
              title={tryResult.success ? "Preview ready!" : "Error"}
              tone={tryResult.success ? "info" : "critical"}
              onDismiss={() => setTryResult(null)}
            >
              {tryResult.success ? (
                <BlockStack gap="200">
                  <p>{tryResult.message}</p>
                  <p style={{ fontSize: 13, color: "#6b7280" }}>
                    Demo theme: <strong>{tryResult.themeName}</strong> (unpublished – won&apos;t affect your live store)
                  </p>
                  {tryResult.expiresAt && (
                    <p style={{ fontSize: 13, color: "#6b7280" }}>
                      ⏱️ Demo expires in <strong>24 hours</strong> ({new Date(tryResult.expiresAt).toLocaleDateString()})
                    </p>
                  )}
                  {tryResult.editorUrl && (
                    <div style={{ marginTop: 8 }}>
                      <Button
                        variant="primary"
                        icon={ExternalIcon}
                        onClick={() => window.open(tryResult.editorUrl, "_blank")}
                      >
                        Open Theme Editor
                      </Button>
                    </div>
                  )}
                </BlockStack>
              ) : (
                <p>{tryResult.error}</p>
              )}
            </Banner>
          </Layout.Section>
        )}

        {/* Preview Gallery */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              {section.previews && section.previews.length > 0 ? (
                <PreviewGallery previews={section.previews} previewColor={section.previewColor} sectionName={section.name} />
              ) : (
                <div style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${section.previewColor} 0%, ${section.previewColor}99 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Text as="p" variant="headingXl" tone="text-inverse">
                    {section.name}
                  </Text>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Try Before You Buy - only for non-premium, non-free */}
        {!canInstall && (
          <Layout.Section>
            <Card>
              <div style={{
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                borderRadius: 12,
                padding: 24,
              }}>
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <div style={{
                      background: "#0ea5e9",
                      borderRadius: "50%",
                      width: 36,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Icon source={ViewIcon} tone="base" />
                    </div>
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">Try before you subscribe</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Preview this section in a demo theme — no changes to your live store
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <InlineStack gap="300">
                    <Button
                      variant="primary"
                      icon={PlayIcon}
                      onClick={handleTrySection}
                      loading={tryLoading}
                    >
                      {tryLoading ? "Preparing preview…" : "Try Section ✨"}
                    </Button>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    ℹ️ Opens a separate demo theme — your live store stays completely untouched. Demo expires after 24 hours.
                  </Text>
                </BlockStack>
              </div>
            </Card>
          </Layout.Section>
        )}

        {/* Upgrade to Premium CTA - for non-premium, non-free */}
        {!canInstall && (
          <Layout.Section>
            <Card padding="0">
              <div style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)",
                borderRadius: 12,
                padding: 28,
              }}>
                <BlockStack gap="400">
                  <InlineStack gap="300" blockAlign="center">
                    <span style={{ fontSize: 32 }}>�</span>
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingLg">
                        <span style={{ color: "white" }}>Unlock all sections with Premium</span>
                      </Text>
                      <Text as="p" variant="bodyMd">
                        <span style={{ color: "rgba(255,255,255,0.85)" }}>
                          Install {section.name} and all other sections for just €8/month
                        </span>
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 4 }}>
                    {[
                      "✓ All sections included",
                      "✓ New sections monthly",
                      "✓ One-click install",
                      "✓ Cancel anytime",
                    ].map((f) => (
                      <span key={f} style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{f}</span>
                    ))}
                  </div>
                  <div>
                    <Button variant="primary" size="large" onClick={() => navigate("/app/premium")}>
                      Upgrade to Premium – €8/mo
                    </Button>
                  </div>
                </BlockStack>
              </div>
            </Card>
          </Layout.Section>
        )}

        {/* Details */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Details</Text>
                <Divider />
                
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Category</Text>
                  <Badge>{Array.isArray(section.category) ? section.category[0] : section.category}</Badge>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Version</Text>
                  <Text as="p" variant="bodySm">{section.version}</Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Access</Text>
                  <Badge tone={isFreeSection ? "success" : "info"}>
                    {isFreeSection ? "Free" : "Premium"}
                  </Badge>
                </InlineStack>

                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Status</Text>
                  <Badge tone={canInstall ? "success" : "attention"}>
                    {canInstall ? "Unlocked" : "Premium Required"}
                  </Badge>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Author</Text>
                  <Text as="p" variant="bodySm">{section.author}</Text>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Description</Text>
                <Text as="p" variant="bodyMd">{section.description}</Text>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Tags</Text>
                <InlineStack gap="200" wrap>
                  {section.tags.map((tag) => (
                    <Badge key={tag} tone="info">{tag}</Badge>
                  ))}
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Compatibility</Text>
                <List>
                  {section.compatibility.themes.map((theme) => (
                    <List.Item key={theme}>{theme}</List.Item>
                  ))}
                </List>
                {section.compatibility.os2 && (
                  <Badge tone="success">OS 2.0 compatible</Badge>
                )}
              </BlockStack>
            </Card>

            {/* Changelog */}
            {section.changelog && section.changelog.length > 0 && (
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Changelog</Text>
                  <Divider />
                  {section.changelog.map((entry: { version: string; date: string; changes: string[] }) => (
                    <BlockStack key={entry.version} gap="100">
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone="info">{`v${entry.version}`}</Badge>
                        <Text as="span" variant="bodySm" tone="subdued">
                          {new Date(entry.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      </InlineStack>
                      <List>
                        {entry.changes.map((change: string, i: number) => (
                          <List.Item key={i}>{change}</List.Item>
                        ))}
                      </List>
                    </BlockStack>
                  ))}
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>

        {/* How to use */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">How to use this section</Text>
              <List type="number">
                {!canInstall && (
                  <List.Item>Subscribe to Premium or click &quot;Try Section&quot; to preview it first</List.Item>
                )}
                <List.Item>Click &quot;Install to Theme&quot; to add the section to your theme</List.Item>
                <List.Item>Open the Shopify Theme Editor</List.Item>
                <List.Item>Click &quot;Add section&quot; and search for &quot;{section.name}&quot;</List.Item>
                <List.Item>Customize the settings to your liking</List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
