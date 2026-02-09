import { useState } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
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
  Box,
  Modal,
  TextField,
} from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const allSections = getAllSections();
  
  // Mock: In real app, fetch from database which sections are installed
  // For now, return all sections as "available to install" and a mock list of installed ones
  const installedSectionIds = ["testimonial-carousel", "hero-minimal"];
  const installedSections = allSections.filter(s => installedSectionIds.includes(s.id));
  
  return { allSections, installedSections };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  
  if (request.method === "POST") {
    const formData = await request.formData();
    const action = formData.get("action");
    const sectionId = formData.get("sectionId");
    
    if (action === "install") {
      console.log(`Installing section: ${sectionId}`);
      return { success: true, action: "installed", sectionId };
    } else if (action === "uninstall") {
      console.log(`Uninstalling section: ${sectionId}`);
      return { success: true, action: "uninstalled", sectionId };
    }
  }
  
  return { error: "Invalid request" };
};

export default function MySectionsPage() {
  const { allSections, installedSections } = useLoaderData<typeof loader>();
  const [showUninstallModal, setShowUninstallModal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const availableSections = allSections.filter(
    (s) => !installedSections.some((installed) => installed.id === s.id)
  );

  const handleInstall = async (sectionId: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("action", "install");
    formData.append("sectionId", sectionId);
    
    try {
      const response = await fetch(window.location.href, {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        // Reload page to update lists
        window.location.reload();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUninstall = async (sectionId: string) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("action", "uninstall");
    formData.append("sectionId", sectionId);
    
    try {
      const response = await fetch(window.location.href, {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        setShowUninstallModal(null);
        window.location.reload();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Page title="My Sections">
      <Layout>
        {/* Installed Sections */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <div>
                <Text as="h2" variant="headingLg">
                  📥 Installierte Sections ({installedSections.length})
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Diese Sections sind in deinem Theme installiert und können verwaltet werden.
                </Text>
              </div>

              {installedSections.length === 0 ? (
                <Text as="p" variant="bodySm" tone="subdued">
                  Keine Sections installiert. Erkunde den Store um neue hinzuzufügen.
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
                      <div
                        style={{
                          background: section.previewColor || "#6366f1",
                          height: 120,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderTopLeftRadius: 12,
                          borderTopRightRadius: 12,
                        }}
                      >
                        <Text as="p" variant="headingSm">
                          <span style={{ color: "white" }}>{section.name}</span>
                        </Text>
                      </div>

                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">
                            {section.name}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {section.description}
                          </Text>
                          <InlineStack gap="100" wrap>
                            <Badge tone="info">{section.category}</Badge>
                            {section.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag}>{tag}</Badge>
                            ))}
                          </InlineStack>

                          <InlineStack gap="200">
                            <Button variant="primary" size="slim" fullWidth disabled>
                              ✓ Installiert
                            </Button>
                            <Button
                              size="slim"
                              variant="secondary"
                              onClick={() => setShowUninstallModal(section.id)}
                            >
                              Entfernen
                            </Button>
                          </InlineStack>
                        </BlockStack>
                      </Box>
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
                  ⭐ Verfügbare Sections ({availableSections.length})
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Weitere Sections, die du installieren kannst.
                </Text>
              </div>

              {availableSections.length === 0 ? (
                <Text as="p" variant="bodySm" tone="subdued">
                  Alle verfügbaren Sections sind bereits installiert!
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
                      <div
                        style={{
                          background: section.previewColor || "#6366f1",
                          height: 120,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderTopLeftRadius: 12,
                          borderTopRightRadius: 12,
                          position: "relative",
                        }}
                      >
                        <div style={{ position: "absolute", top: 12, right: 12 }}>
                          <Badge
                            tone={section.price.type === "free" ? "success" : "info"}
                          >
                            {section.price.type === "free"
                              ? "Kostenlos"
                              : `€${section.price.amount}`}
                          </Badge>
                        </div>
                        <Text as="p" variant="headingSm">
                          <span style={{ color: "white" }}>{section.name}</span>
                        </Text>
                      </div>

                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">
                            {section.name}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {section.description}
                          </Text>
                          <InlineStack gap="100" wrap>
                            <Badge tone="info">{section.category}</Badge>
                            {section.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag}>{tag}</Badge>
                            ))}
                          </InlineStack>

                          <Button
                            variant="primary"
                            size="slim"
                            fullWidth
                            onClick={() => handleInstall(section.id)}
                            loading={isLoading}
                          >
                            + Installieren
                          </Button>
                        </BlockStack>
                      </Box>
                    </Card>
                  ))}
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Uninstall Confirmation Modal */}
      {showUninstallModal && (
        <Modal
          open={true}
          onClose={() => setShowUninstallModal(null)}
          title="Section entfernen?"
          primaryAction={{
            content: "Ja, entfernen",
            onAction: () => handleUninstall(showUninstallModal),
            loading: isLoading,
          }}
          secondaryActions={[
            {
              content: "Abbrechen",
              onAction: () => setShowUninstallModal(null),
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm">
                Bist du sicher, dass du diese Section aus deinem Theme entfernen möchtest?
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Diese Aktion kann nicht rückgängig gemacht werden. Alle auf dieser Section
                basierten Anpassungen in deinem Theme werden gelöscht.
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
