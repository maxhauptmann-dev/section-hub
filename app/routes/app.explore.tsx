import { useState, useMemo } from "react";
import { useNavigate, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
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
  TextField,
  Box,
} from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const sections = getAllSections();
  return { sections };
};

const CATEGORIES = [
  { id: "all", label: "Alle", icon: "✨" },
  { id: "free", label: "Kostenlos", icon: "🎁" },
  { id: "Hero", label: "Hero", icon: "🎯" },
  { id: "FAQ", label: "FAQ", icon: "❓" },
  { id: "Testimonial", label: "Testimonial", icon: "💬" },
  { id: "Trust", label: "Trust", icon: "🛡️" },
  { id: "CTA", label: "CTA", icon: "🚀" },
];

function priceLabel(price: { type: string; amount?: number; currency?: string }): string {
  if (price.type === "free") return "Kostenlos";
  return `€${price.amount}`;
}

export default function ExploreSectionsPage() {
  const { sections } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredSections = useMemo(() => {
    let list = [...sections];

    if (selectedCategory === "free") {
      list = list.filter((s) => s.price.type === "free");
    } else if (selectedCategory !== "all") {
      list = list.filter((s) => s.category === selectedCategory);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }

    return list;
  }, [sections, query, selectedCategory]);

  return (
    <Page
      title="Explore Sections"
      subtitle="Entdecke professionelle Sections für deinen Shop"
    >
      <Layout>
        {/* Hero Banner */}
        <Layout.Section>
          <Card>
            <div style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
              borderRadius: 12,
              padding: 32,
            }}>
              <BlockStack gap="400">
                <Badge tone="info">Section Hub</Badge>
                <Text as="h1" variant="heading2xl" fontWeight="bold">
                  <span style={{ color: "white" }}>Premium Sections für Shopify</span>
                </Text>
                <Text as="p" variant="bodyLg">
                  <span style={{ color: "rgba(255,255,255,0.9)" }}>
                    One-Click Install • Lifetime Updates • OS 2.0 Ready
                  </span>
                </Text>
              </BlockStack>
            </div>
          </Card>
        </Layout.Section>

        {/* Search */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Suche</Text>
              <TextField
                label=""
                labelHidden
                placeholder="Suche nach Sections..."
                value={query}
                onChange={setQuery}
                autoComplete="off"
                clearButton
                onClearButtonClick={() => setQuery("")}
              />
              <InlineStack gap="200" wrap>
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "primary" : "secondary"}
                    size="slim"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.icon} {cat.label}
                  </Button>
                ))}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Section Grid */}
        <Layout.Section>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingLg">
                {selectedCategory === "all" ? "Alle Sections" : CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {filteredSections.length} Section{filteredSections.length !== 1 ? "s" : ""}
              </Text>
            </InlineStack>

            {filteredSections.length === 0 ? (
              <Card>
                <BlockStack gap="300" inlineAlign="center">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Keine Sections gefunden.
                  </Text>
                </BlockStack>
              </Card>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}>
                {filteredSections.map((section) => (
                  <Card key={section.id} padding="0">
                    <button
                      type="button"
                      style={{ cursor: "pointer", width: "100%", border: "none", background: "transparent", padding: 0, textAlign: "left" }}
                      role="link"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/app/section?id=${section.id}`);
                        }
                      }}
                      onClick={() => navigate(`/app/section?id=${section.id}`)}
                    >
                      {/* Preview */}
                      <div style={{
                        background: section.previewColor || "#6366f1",
                        height: 140,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        position: "relative",
                      }}>
                        <div style={{ position: "absolute", top: 12, right: 12 }}>
                          <Badge tone={section.price.type === "free" ? "success" : "info"}>
                            {priceLabel(section.price)}
                          </Badge>
                        </div>
                        <Text as="p" variant="headingMd">
                          <span style={{ color: "white" }}>{section.name}</span>
                        </Text>
                      </div>

                      {/* Content */}
                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">{section.name}</Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {section.description}
                          </Text>
                          <InlineStack gap="100" wrap>
                            <Badge tone="info">{section.category}</Badge>
                            {section.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag}>{tag}</Badge>
                            ))}
                          </InlineStack>
                          <Box paddingBlockStart="200">
                            <Button variant="primary" size="slim" fullWidth>
                              Installieren
                            </Button>
                          </Box>
                        </BlockStack>
                      </Box>
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
