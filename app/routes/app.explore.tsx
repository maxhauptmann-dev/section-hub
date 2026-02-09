import { useState, useMemo } from "react";
import { useNavigate, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllSections } from "../lib/sections.server";
import type { SectionMeta, SectionPreview } from "../lib/sections.server";
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
  Icon,
} from "@shopify/polaris";
import { ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const sections = getAllSections();
  return { sections };
};

const CATEGORIES = [
  { id: "all", label: "All", icon: "✨" },
  { id: "free", label: "Free", icon: "🎁" },
  { id: "Hero", label: "Hero", icon: "🎯" },
  { id: "FAQ", label: "FAQ", icon: "❓" },
  { id: "Testimonials", label: "Testimonials", icon: "💬" },
  { id: "Trust", label: "Trust", icon: "🛡️" },
  { id: "CTA", label: "CTA", icon: "🚀" },
  { id: "Social Proof", label: "Social Proof", icon: "⭐" },
];

function priceLabel(price: { type: string; amount?: number; currency?: string }): string {
  if (price.type === "free") return "Free";
  return `€${price.amount}`;
}

// Preview Image Slider Component
function PreviewSlider({ 
  section, 
  onNavigate 
}: { 
  section: SectionMeta; 
  onNavigate: () => void;
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
        height: 180,
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
          onClick={onNavigate}
        />
      ) : (
        <div 
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={onNavigate}
        >
          <Text as="p" variant="headingMd">
            <span style={{ color: "white" }}>{section.name}</span>
          </Text>
        </div>
      )}

      {/* Price Badge */}
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <Badge tone={section.price.type === "free" ? "success" : "info"}>
          {priceLabel(section.price)}
        </Badge>
      </div>

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
          {previews.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                border: "none",
                background: idx === currentIndex ? "white" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
                padding: 0,
              }}
              aria-label={`Go to preview ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
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
      subtitle="Discover professional sections for your store"
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
                  <span style={{ color: "white" }}>Premium Sections for Shopify</span>
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
              <Text as="h2" variant="headingMd">Search</Text>
              <TextField
                label=""
                labelHidden
                placeholder="Search sections..."
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
                {selectedCategory === "all" ? "All Sections" : CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {filteredSections.length} Section{filteredSections.length !== 1 ? "s" : ""}
              </Text>
            </InlineStack>

            {filteredSections.length === 0 ? (
              <Card>
                <BlockStack gap="300" inlineAlign="center">
                  <Text as="p" variant="bodyMd" tone="subdued">
                  No sections found.
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
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                      {/* Preview Slider */}
                      <PreviewSlider 
                        section={section} 
                        onNavigate={() => navigate(`/app/section?id=${section.id}`)}
                      />

                      {/* Content */}
                      <Box padding="400">
                        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 180 }}>
                          <button
                            type="button"
                            style={{ 
                              cursor: "pointer", 
                              border: "none", 
                              background: "transparent", 
                              padding: 0, 
                              textAlign: "left",
                              width: "100%",
                            }}
                            onClick={() => navigate(`/app/section?id=${section.id}`)}
                          >
                            <Text as="h3" variant="headingSm">{section.name}</Text>
                          </button>
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
                                onClick={() => navigate(`/app/section?id=${section.id}`)}
                              >
                                View Details
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
        </Layout.Section>
      </Layout>
    </Page>
  );
}
