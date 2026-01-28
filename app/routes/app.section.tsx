import { useState, useEffect } from "react";
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
} from "@shopify/polaris";

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
      return { success: false, error: "Section nicht gefunden" };
    }
    
    try {
      const sectionFileName = `section-${sectionId}.liquid`;
      
      // CSS inline einbetten
      const liquidWithStyles = `{% comment %}
  Section Hub - ${section.name}
  Version: ${section.version}
  Installiert via Section Hub App
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
        return { success: false, error: "Kein aktives Theme gefunden." };
      }
      
      console.log("Selected theme:", mainTheme);
      
      // Nutze GraphQL themeFilesUpsert API - mit gid statt nur themeId
      console.log("Uploading section with GraphQL:", { filename: `sections/${sectionFileName}`, themeId: mainTheme.id });

      const fileInput = {
        filename: `sections/${sectionFileName}`,
        body: {
          type: "TEXT",
          value: liquidWithStyles,
        },
      };
      
      // GraphQL themeFilesUpsert braucht die komplette GID
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
              status
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
            job?: { id?: string; status?: string } | null;
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
          error: `GraphQL Fehler: ${errorMsg}`
        };
      }
      
      const userErrors = themeFilesData.data?.themeFilesUpsert?.userErrors || [];
      if (userErrors.length > 0) {
        const errorMsg = userErrors.map((e) => `${(e.field || []).join(".")}: ${e.message}`).join(", ");
        console.error("User Errors:", errorMsg);
        return { 
          success: false, 
          error: `Fehler beim Erstellen der Section: ${errorMsg}`
        };
      }
      
      const upsertedFiles = themeFilesData.data?.themeFilesUpsert?.upsertedThemeFiles || [];
      if (upsertedFiles.length === 0) {
        return { 
          success: false, 
          error: "Section konnte nicht installiert werden. Bitte versuche es später erneut."
        };
      }
      
      console.log("Section erfolgreich installiert:", upsertedFiles[0]?.filename);
      
      return { 
        success: true, 
        message: `${section.name} wurde erfolgreich in "${mainTheme.name}" installiert!`,
        themeName: mainTheme.name,
      };
    } catch (error) {
      console.error("Install error:", error);
      return { success: false, error: `Ein Fehler ist aufgetreten: ${error instanceof Error ? error.message : "Unbekannt"}` };
    }
  }
  
  return { success: false, error: "Unbekannte Aktion" };
};

function priceLabel(price: { type: string; amount?: number; currency?: string }): string {
  if (price.type === "free") return "Kostenlos";
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

  // Zeige Ergebnis der Action
  useEffect(() => {
    if (actionData) {
      setResult(actionData);
    }
  }, [actionData]);

  const handleInstall = () => {
    if (!section) return;
    submit(
      { sectionId: section.id, action: "install" },
      { method: "post" }
    );
  };

  // Falls keine Section-ID übergeben wurde, zeige Liste
  if (!section) {
    return (
      <Page 
        title="Section installieren"
        backAction={{ content: "Zurück", onAction: () => navigate("/app/explore") }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Wähle eine Section zum Installieren</Text>
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
      backAction={{ content: "Zurück", onAction: () => navigate("/app/explore") }}
      primaryAction={{
        content: isSubmitting ? "Installiere..." : "Im Theme installieren",
        onAction: handleInstall,
        loading: isSubmitting,
      }}
    >
      <Layout>
        {/* Erfolgs-/Fehlermeldung */}
        {result && (
          <Layout.Section>
            <Banner
              title={result.success ? "Erfolgreich installiert!" : "Fehler"}
              tone={result.success ? "success" : "critical"}
              onDismiss={() => setResult(null)}
            >
              <p>{result.success ? result.message : result.error}</p>
              {result.success && (
                <p style={{ marginTop: 8 }}>
                  Öffne jetzt den Theme-Editor und füge die Section zu deiner Seite hinzu.
                </p>
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

        {/* Details */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Details</Text>
                <Divider />
                
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Kategorie</Text>
                  <Badge>{section.category}</Badge>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Version</Text>
                  <Text as="p" variant="bodySm">{section.version}</Text>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Preis</Text>
                  <Badge tone={section.price.type === "free" ? "success" : "info"}>
                    {priceLabel(section.price)}
                  </Badge>
                </InlineStack>
                
                <InlineStack align="space-between">
                  <Text as="p" variant="bodySm" tone="subdued">Autor</Text>
                  <Text as="p" variant="bodySm">{section.author}</Text>
                </InlineStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Beschreibung</Text>
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
                <Text as="h2" variant="headingMd">Kompatibilität</Text>
                <List>
                  {section.compatibility.themes.map((theme) => (
                    <List.Item key={theme}>{theme}</List.Item>
                  ))}
                </List>
                {section.compatibility.os2 && (
                  <Badge tone="success">OS 2.0 kompatibel</Badge>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        {/* Hauptbereich */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">So verwendest du diese Section</Text>
              <List type="number">
                <List.Item>Klicke auf &quot;Im Theme installieren&quot;</List.Item>
                <List.Item>Öffne den Shopify Theme-Editor</List.Item>
                <List.Item>Klicke auf &quot;Abschnitt hinzufügen&quot;</List.Item>
                <List.Item>Suche nach &quot;{section.name}&quot;</List.Item>
                <List.Item>Passe die Einstellungen nach deinen Wünschen an</List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
