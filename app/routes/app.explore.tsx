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
  { id: "all", label: "All", icon: "✨", color: "#6366f1", textColor: "#fff" },
  { id: "popular", label: "Most Popular", icon: "🔥", color: "#ef4444", textColor: "#fff" },
  { id: "newest", label: "Newest", icon: "🆕", color: "#10b981", textColor: "#fff" },
  { id: "free", label: "Free", icon: "🎁", color: "#8b5cf6", textColor: "#fff" },
  { id: "header", label: "Header", icon: "📞", color: "#3b82f6", textColor: "#fff" },
  { id: "hero", label: "Hero", icon: "🎯", color: "#f59e0b", textColor: "#fff" },
  { id: "scrolling", label: "Scrolling", icon: "📜", color: "#06b6d4", textColor: "#fff" },
  { id: "video", label: "Video", icon: "🎬", color: "#ec4899", textColor: "#fff" },
  { id: "images", label: "Image Gallery", icon: "🖼️", color: "#14b8a6", textColor: "#fff" },
  { id: "counter", label: "Counter", icon: "🔢", color: "#84cc16", textColor: "#fff" },
  { id: "slider", label: "Slider", icon: "🎞️", color: "#f43f5e", textColor: "#fff" },
  { id: "collection", label: "Collection", icon: "🛍️", color: "#a855f7", textColor: "#fff" },
  { id: "featured collection", label: "Featured Collection", icon: "🌟", color: "#eab308", textColor: "#000" },
  { id: "upsell", label: "Upsell", icon: "💡", color: "#22c55e", textColor: "#fff" },
  { id: "FAQ", label: "FAQ", icon: "❓", color: "#0ea5e9", textColor: "#fff" },
  { id: "Testimonials", label: "Testimonials", icon: "💬", color: "#8b5cf6", textColor: "#fff" },
  { id: "Trust", label: "Trust", icon: "🛡️", color: "#059669", textColor: "#fff" },
  { id: "CTA", label: "CTA", icon: "🚀", color: "#dc2626", textColor: "#fff" },
  { id: "Social Proof", label: "Social Proof", icon: "⭐", color: "#f59e0b", textColor: "#fff" },
  { id: "Product Discovery", label: "Shop the Look", icon: "👗", color: "#ec4899", textColor: "#fff" },
  { id: "Footer", label: "Footer", icon: "📞", color: "#64748b", textColor: "#fff" },
];

// Custom Category Badge Component
function CategoryBadge({ 
  category, 
  isActive, 
  onClick 
}: { 
  category: typeof CATEGORIES[0]; 
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 20,
        border: isActive ? `2px solid ${category.color}` : "2px solid #e5e7eb",
        background: isActive ? category.color : "#fff",
        color: isActive ? category.textColor : "#374151",
        fontSize: 14,
        fontWeight: isActive ? 600 : 500,
        cursor: "pointer",
        transition: "all 0.2s ease",
        whiteSpace: "nowrap",
        boxShadow: isActive ? `0 2px 8px ${category.color}40` : "none",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "#f9fafb";
          e.currentTarget.style.borderColor = category.color;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.borderColor = "#e5e7eb";
        }
      }}
    >
      <span style={{ fontSize: 16 }}>{category.icon}</span>
      <span>{category.label}</span>
    </button>
  );
}

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
  const [scrollContainerRef, setScrollContainerRef] = useState<HTMLDivElement | null>(null);

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

  const scrollLeft = () => {
    if (scrollContainerRef) {
      scrollContainerRef.scrollBy({ left: -300, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef) {
      scrollContainerRef.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <>
      <style>{`
        .category-scroll-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
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
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={scrollLeft}
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  aria-label="Scroll left"
                >
                  ←
                </button>
                <div
                  ref={setScrollContainerRef}
                  className="category-scroll-container"
                  style={{
                    display: "flex",
                    gap: "12px",
                    overflowX: "auto",
                    scrollBehavior: "smooth",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    flex: 1,
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <CategoryBadge
                      key={cat.id}
                      category={cat}
                      isActive={selectedCategory === cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                    />
                  ))}
                </div>
                <button
                  onClick={scrollRight}
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    width: "32px",
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  aria-label="Scroll right"
                >
                  →
                </button>
              </div>
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
                              <InlineStack gap="200">
                                <div style={{ flex: 1 }}>
                                  <Button 
                                    variant="primary" 
                                    size="slim" 
                                    fullWidth
                                    onClick={() => navigate(`/app/section?id=${section.id}`)}
                                  >
                                    View Details
                                  </Button>
                                </div>
                                <Button
                                  variant="secondary"
                                  size="slim"
                                  onClick={() => navigate(`/app/section?id=${section.id}&try=true`)}
                                >
                                  Try ✨
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
        </Layout.Section>
      </Layout>
    </Page>
    </>
  );
}
