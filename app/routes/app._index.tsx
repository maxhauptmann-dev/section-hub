import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { getAllSections } from "../lib/sections.server";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  EmptyState,
  Box,
  Divider,
  Icon,
} from "@shopify/polaris";
import {
  RefreshIcon,
  ExternalIcon,
  DeleteIcon,
} from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // Lade alle verfügbaren Sections aus dem Dateisystem
  const availableSections = getAllSections();

  // Versuche echte Daten von API zu laden (wenn Server aktiv)
  const apiUrl = process.env.SECTIONS_API_URL;
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/installed-sections`);
      if (res.ok) {
        const data = await res.json();
        return { 
          sections: data.sections as InstalledSection[],
          stats: data.stats as Stats,
          availableSections,
        };
      }
    } catch {
      // API nicht erreichbar, fallback auf Mock
    }
  }

  // Fallback: Mock-Daten für Entwicklung (basierend auf echten Sections)
  const mockInstalled: InstalledSection[] = availableSections.slice(0, 3).map((section, index) => ({
    id: section.id,
    name: section.name,
    version: section.version,
    latestVersion: index === 1 ? "1.1.0" : section.version, // Simuliere ein Update für die 2. Section
    installedAt: `${25 - index}. Jan 2026`,
    category: section.category,
    previewImage: "",
    previewColor: section.previewColor,
    hasUpdate: index === 1, // Nur die 2. Section hat ein Update
    usageCount: 3 - index,
  }));

  const sectionsWithUpdates = mockInstalled.filter(s => s.hasUpdate).length;
  
  return { 
    sections: mockInstalled,
    stats: {
      totalSections: mockInstalled.length,
      sectionsWithUpdates,
      totalUsage: mockInstalled.reduce((sum, s) => sum + s.usageCount, 0),
    },
    availableSections,
  };
};

type Stats = {
  totalSections: number;
  sectionsWithUpdates: number;
  totalUsage: number;
};

type InstalledSection = {
  id: string;
  name: string;
  version: string;
  latestVersion: string;
  installedAt: string;
  category: string;
  previewImage: string;
  previewColor: string;
  hasUpdate: boolean;
  usageCount: number;
};

export default function MySectionsPage() {
  const { sections, stats } = useLoaderData<typeof loader>();

  if (sections.length === 0) {
    return (
      <Page title="My Sections">
        <Layout>
          <Layout.Section>
            <Card>
              <EmptyState
                heading="Starte mit deiner ersten Section"
                action={{ content: "Sections entdecken", url: "/app/explore" }}
                secondaryAction={{ content: "Bundles ansehen", url: "/app/bundles" }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Installiere professionelle Sections in wenigen Sekunden.</p>
              </EmptyState>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="My Sections"
      subtitle="Verwalte deine installierten Sections"
      primaryAction={{
        content: "Neue Section",
        url: "/app/explore",
      }}
      secondaryActions={[
        { content: "Alle updaten", disabled: stats.sectionsWithUpdates === 0 },
      ]}
    >
      <Layout>
        {/* Stats Cards */}
        <Layout.Section>
          <InlineStack gap="400" wrap={false}>
            <div style={{ flex: 1 }}>
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Installiert</Text>
                  <Text as="p" variant="headingXl">{stats.totalSections}</Text>
                  <Text as="p" variant="bodySm" tone="subdued">Sections</Text>
                </BlockStack>
              </Card>
            </div>
            <div style={{ flex: 1 }}>
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Updates</Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="p" variant="headingXl">{stats.sectionsWithUpdates}</Text>
                    {stats.sectionsWithUpdates > 0 && (
                      <Badge tone="attention">Verfügbar</Badge>
                    )}
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">ausstehend</Text>
                </BlockStack>
              </Card>
            </div>
            <div style={{ flex: 1 }}>
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Verwendung</Text>
                  <Text as="p" variant="headingXl">{stats.totalUsage}×</Text>
                  <Text as="p" variant="bodySm" tone="subdued">im Theme</Text>
                </BlockStack>
              </Card>
            </div>
          </InlineStack>
        </Layout.Section>

        {/* Update Banner */}
        {stats.sectionsWithUpdates > 0 && (
          <Layout.Section>
            <Card>
              <Box background="bg-surface-warning" padding="400" borderRadius="200">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="300" blockAlign="center">
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Icon source={RefreshIcon} tone="base" />
                    </div>
                    <BlockStack gap="100">
                      <Text as="p" variant="headingSm">
                        {stats.sectionsWithUpdates} Update{stats.sectionsWithUpdates > 1 ? "s" : ""} verfügbar
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Neue Features und Bugfixes für deine Sections
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <Button variant="primary">Alle updaten</Button>
                </InlineStack>
              </Box>
            </Card>
          </Layout.Section>
        )}

        {/* Sections Grid */}
        <Layout.Section>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Installierte Sections</Text>
            
            <div style={{ 
              display: "grid", 
              gap: 16, 
              gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))" 
            }}>
              {sections.map((section) => (
                <Card key={section.id} padding="0">
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    {/* Preview Header */}
                    <div style={{
                      height: 120,
                      background: `linear-gradient(135deg, ${section.previewColor} 0%, ${section.previewColor}99 100%)`,
                      borderRadius: "12px 12px 0 0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}>
                      <div style={{
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: 8,
                        padding: "12px 24px",
                        backdropFilter: "blur(8px)",
                      }}>
                        <Text as="p" variant="headingMd" tone="text-inverse">
                          {section.name}
                        </Text>
                      </div>
                      
                      {/* Status Badge */}
                      <div style={{ position: "absolute", top: 12, right: 12 }}>
                        {section.hasUpdate ? (
                          <Badge tone="attention">Update</Badge>
                        ) : (
                          <Badge tone="success">Aktuell</Badge>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <Box padding="400">
                      <BlockStack gap="300">
                        <InlineStack align="space-between">
                          <InlineStack gap="200">
                            <Badge>{section.category}</Badge>
                            <Text as="span" variant="bodySm" tone="subdued">
                              v{section.version}
                            </Text>
                          </InlineStack>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {section.usageCount}× verwendet
                          </Text>
                        </InlineStack>

                        <Divider />

                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Installiert: {section.installedAt}
                          </Text>
                        </InlineStack>

                        <InlineStack gap="200">
                          <div style={{ flex: 1 }}>
                            <Button
                              fullWidth
                              icon={ExternalIcon}
                              onClick={() => alert(`Theme Editor öffnen`)}
                            >
                              Anpassen
                            </Button>
                          </div>
                          {section.hasUpdate && (
                            <div style={{ flex: 1 }}>
                              <Button
                                fullWidth
                                variant="primary"
                                icon={RefreshIcon}
                                onClick={() => alert(`Updaten auf v${section.latestVersion}`)}
                              >
                                Update
                              </Button>
                            </div>
                          )}
                          <Button
                            icon={DeleteIcon}
                            tone="critical"
                            onClick={() => alert(`Entfernen?`)}
                          />
                        </InlineStack>
                      </BlockStack>
                    </Box>
                  </div>
                </Card>
              ))}
            </div>
          </BlockStack>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Schnellaktionen</Text>
              <InlineStack gap="300" wrap>
                <Button url="/app/explore">Weitere Sections</Button>
                <Button url="/app/bundles">Bundles ansehen</Button>
                <Button url="/app/migrator">Theme wechseln</Button>
                <Button url="/app/help">Hilfe</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
