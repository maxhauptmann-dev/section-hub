import { useState, useEffect, useCallback } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useActionData, useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { getSectionWithFiles, getAllSections } from "../lib/sections.server";
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
import { ExternalIcon, ViewIcon, PlayIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  
  const url = new URL(request.url);
  const sectionId = url.searchParams.get("id");
  
  if (!sectionId) {
    return { section: null, allSections: getAllSections() };
  }
  
  const section = getSectionWithFiles(sectionId);
  return { section, allSections: getAllSections() };
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

function priceLabel(price: { type: string; amount?: number; currency?: string }): string {
  if (price.type === "free") return "Free";
  return `€${price.amount}`;
}

export default function SectionDetailPage() {
  const { section, allSections } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const isSubmitting = navigation.state === "submitting";
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [tryLoading, setTryLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
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

  // Demo store URL – replace with your actual demo store URL
  const DEMO_STORE_URL = "https://section-hub-demo.myshopify.com";

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
      formData.append("action", "install");

      const response = await fetch("/app/api/install-section", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      // Handle purchase requirement
      if (data.purchaseRequired && data.confirmationUrl) {
        // Redirect to Shopify confirmation URL
        window.top!.location.href = data.confirmationUrl;
        return;
      }

      // Regular install response
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
      // Check for successful purchase redirect
      if (params.get("purchased") && params.get("install") === "true") {
        setPurchaseSuccess(true);
        setResult({
          success: true,
          message: "Section purchased successfully! You can now install it to your theme.",
        });
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
                          {priceLabel(s.price)}
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
      primaryAction={{
        content: isSubmitting ? "Installing..." : "Install to Theme",
        onAction: handleInstall,
        loading: isSubmitting,
      }}
      secondaryActions={[
        {
          content: "Try Section",
          onAction: handleTrySection,
          loading: tryLoading,
          icon: PlayIcon,
        },
        {
          content: "Demo Store",
          onAction: () => window.open(DEMO_STORE_URL, "_blank"),
          icon: ExternalIcon,
        },
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
                    Theme: <strong>{tryResult.themeName}</strong> (unpublished – won&apos;t affect your live store)
                  </p>
                  {tryResult.expiresAt && (
                    <p style={{ fontSize: 13, color: "#6b7280" }}>
                      ⏱️ Trial period: <strong>{tryResult.trialDays} days</strong> until {new Date(tryResult.expiresAt).toLocaleDateString()}
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

        {/* Preview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
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
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Try Before You Buy Card */}
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
                    <Text as="h2" variant="headingMd">Try before you buy</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Test this section in your Theme Editor without affecting your live store
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
                  <Button
                    variant="secondary"
                    icon={ExternalIcon}
                    onClick={() => window.open(DEMO_STORE_URL, "_blank")}
                  >
                    Demo Store
                  </Button>
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">
                  ℹ️ Creates a hidden preview theme – your live store stays untouched.
                </Text>
              </BlockStack>
            </div>
          </Card>
        </Layout.Section>

        {/* Details */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Details</Text>
                <Divider />
                
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Category</Text>
                  <Badge>{section.category}</Badge>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Version</Text>
                  <Text as="p" variant="bodySm">{section.version}</Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Price</Text>
                  <Badge tone={section.price.type === "free" ? "success" : "info"}>
                    {priceLabel(section.price)}
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
          </BlockStack>
        </Layout.Section>

        {/* How to use */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">How to use this section</Text>
              <List type="number">
                <List.Item>Click &quot;Try Section&quot; to test it first, or &quot;Install to Theme&quot; to add it directly</List.Item>
                <List.Item>The section will appear in the Shopify Theme Editor</List.Item>
                <List.Item>Click &quot;Add section&quot; and search for &quot;{section.name}&quot;</List.Item>
                <List.Item>Customize the settings to your liking</List.Item>
                <List.Item>If you tested it, install it to your live theme when ready</List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
