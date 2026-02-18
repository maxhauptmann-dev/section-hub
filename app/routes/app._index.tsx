import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
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
  Box,
  Divider,
  Banner,
  ProgressBar,
} from "@shopify/polaris";
import {
  RefreshIcon,
  ExternalIcon,
  PlusIcon,
} from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const availableSections = getAllSections();

  // Mock installed sections (in production: from DB / theme API)
  const mockInstalled = availableSections.slice(0, 3).map((section, index) => ({
    id: section.id,
    name: section.name,
    version: section.version,
    latestVersion: index === 1 ? "1.1.0" : section.version,
    installedAt: `${25 - index}. Jan 2026`,
    category: section.category,
    previewColor: section.previewColor,
    hasUpdate: index === 1,
    usageCount: 3 - index,
    price: section.price,
  }));

  const sectionsWithUpdates = mockInstalled.filter((s) => s.hasUpdate).length;

  const featuredOffers = [
    {
      id: "conversion",
      name: "Conversion Bundle",
      description: "CTA Banner, FAQ, Testimonials & more",
      originalPrice: 79,
      discountedPrice: 49,
      discount: 38,
      icon: "🚀",
      color: "#8b5cf6",
    },
    {
      id: "starter",
      name: "Starter Pack",
      description: "5 essential sections for new stores",
      originalPrice: 49,
      discountedPrice: 29,
      discount: 40,
      icon: "⭐",
      color: "#10b981",
    },
    {
      id: "testimonial",
      name: "Testimonial Pack",
      description: "All 5 testimonial sections",
      originalPrice: 59,
      discountedPrice: 35,
      discount: 41,
      icon: "💬",
      color: "#f59e0b",
    },
  ];

  return {
    shop,
    sections: mockInstalled,
    stats: {
      totalSections: mockInstalled.length,
      sectionsWithUpdates,
      totalUsage: mockInstalled.reduce((sum, s) => sum + s.usageCount, 0),
    },
    totalAvailable: availableSections.length,
    featuredOffers,
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
  previewColor: string;
  hasUpdate: boolean;
  usageCount: number;
  price: { type: string; amount?: number };
};

type FeaturedOffer = {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  discount: number;
  icon: string;
  color: string;
};

export default function DashboardPage() {
  const { shop, sections, stats, totalAvailable, featuredOffers } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const shopName = shop.replace(".myshopify.com", "");

  return (
    <Page title={`Welcome back, ${shopName} 👋`}>
      <BlockStack gap="600">
        {/* Stats Overview */}
        <Layout>
          <Layout.Section>
            <InlineStack gap="400" wrap={false}>
              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">Installed</Text>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="p" variant="headingXl">{stats.totalSections}</Text>
                      <Text as="p" variant="bodySm" tone="subdued">/ {totalAvailable}</Text>
                    </InlineStack>
                    <ProgressBar
                      progress={(stats.totalSections / totalAvailable) * 100}
                      size="small"
                      tone="primary"
                    />
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
                      {stats.sectionsWithUpdates > 0 && <Badge tone="attention">Available</Badge>}
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">pending</Text>
                  </BlockStack>
                </Card>
              </div>
              <div style={{ flex: 1 }}>
                <Card>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm" tone="subdued">Usage</Text>
                    <Text as="p" variant="headingXl">{stats.totalUsage}×</Text>
                    <Text as="p" variant="bodySm" tone="subdued">in theme</Text>
                  </BlockStack>
                </Card>
              </div>
            </InlineStack>
          </Layout.Section>
        </Layout>

        {/* Update Banner */}
        {stats.sectionsWithUpdates > 0 && (
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
                    <span style={{ fontSize: 20 }}>⚡</span>
                  </div>
                  <BlockStack gap="100">
                    <Text as="p" variant="headingSm">
                      {stats.sectionsWithUpdates} Update{stats.sectionsWithUpdates > 1 ? "s" : ""} available
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      New features and bugfixes for your sections
                    </Text>
                  </BlockStack>
                </InlineStack>
                <Button variant="primary" onClick={() => navigate("/app/my-sections")}>Update All</Button>
              </InlineStack>
            </Box>
          </Card>
        )}

        {/* Section AI Hero Feature */}
        <Card padding="0">
          <div
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 220 }}>
              {/* Left side */}
              <div style={{ padding: 32 }}>
                <BlockStack gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <span style={{ fontSize: 28 }}>🤖</span>
                    <Text as="h2" variant="headingLg">
                      <span style={{ color: "white" }}>Section AI</span>
                    </Text>
                    <Badge tone="info">NEW</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodyMd">
                    <span style={{ color: "rgba(255,255,255,0.9)" }}>
                      Create custom sections for your store with AI. Describe what you need
                      and our AI generates a fully functional, responsive Shopify section —
                      ready to install in seconds.
                    </span>
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <div
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        backdropFilter: "blur(8px)",
                        borderRadius: 8,
                        padding: "6px 14px",
                      }}
                    >
                      <Text as="span" variant="headingSm">
                        <span style={{ color: "white" }}>€5</span>
                      </Text>
                      <Text as="span" variant="bodySm">
                        <span style={{ color: "rgba(255,255,255,0.7)" }}> / section</span>
                      </Text>
                    </div>
                    <Text as="span" variant="bodySm">
                      <span style={{ color: "rgba(255,255,255,0.7)" }}>
                        OS 2.0 • Responsive • Theme-ready
                      </span>
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Button
                      variant="primary"
                      tone="success"
                      size="large"
                      icon={PlusIcon}
                      onClick={() => navigate("/app/section-ai")}
                    >
                      Generate Section
                    </Button>
                    <Button variant="plain" url="/app/section-ai">
                      Learn more
                    </Button>
                  </InlineStack>
                </BlockStack>
              </div>

              {/* Right side: animated terminal */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 24, width: "100%" }}>
                  {[
                    { text: "\"Create a testimonial slider with stars\"", color: "rgba(255,255,255,0.85)", border: "rgba(255,255,255,0.2)" },
                    { text: "→ Generating section.liquid...", color: "rgba(255,255,255,0.85)", border: "rgba(255,255,255,0.2)" },
                    { text: "→ Adding responsive CSS...", color: "rgba(255,255,255,0.85)", border: "rgba(255,255,255,0.2)" },
                    { text: "✓ Section ready — Install now!", color: "#4ade80", border: "#4ade80" },
                  ].map((line, i) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.12)",
                        backdropFilter: "blur(4px)",
                        borderRadius: 8,
                        padding: "10px 16px",
                        fontFamily: "monospace",
                        fontSize: 13,
                        color: line.color,
                        borderLeft: `3px solid ${line.border}`,
                      }}
                    >
                      {line.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Installed Sections */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">Installed Sections</Text>
                  <Button variant="plain" onClick={() => navigate("/app/my-sections")}>View all →</Button>
                </InlineStack>

                {sections.length === 0 ? (
                  <Box padding="400">
                    <BlockStack gap="200" inlineAlign="center">
                      <Text as="p" variant="bodySm" tone="subdued">No sections installed yet.</Text>
                      <Button url="/app/explore" variant="primary">Explore Sections</Button>
                    </BlockStack>
                  </Box>
                ) : (
                  <BlockStack gap="0">
                    {(sections as InstalledSection[]).map((section, index) => (
                      <div key={section.id}>
                        {index > 0 && <Divider />}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 0",
                            cursor: "pointer",
                          }}
                          onClick={() => navigate(`/app/section?id=${section.id}`)}
                          onKeyDown={() => {}}
                          role="button"
                          tabIndex={0}
                        >
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: `linear-gradient(135deg, ${section.previewColor} 0%, ${section.previewColor}99 100%)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Text as="span" variant="bodySm">
                              <span style={{ color: "white", fontSize: 16 }}>{section.name.charAt(0)}</span>
                            </Text>
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <InlineStack gap="200" blockAlign="center" wrap={false}>
                              <Text as="p" variant="bodyMd" fontWeight="semibold">{section.name}</Text>
                              <Badge>{section.category}</Badge>
                              {section.hasUpdate && <Badge tone="attention">Update</Badge>}
                            </InlineStack>
                            <Text as="p" variant="bodySm" tone="subdued">
                              v{section.version} • {section.usageCount}× used • Installed {section.installedAt}
                            </Text>
                          </div>

                          <InlineStack gap="200">
                            {section.hasUpdate && (
                              <Button size="slim" variant="primary" icon={RefreshIcon} onClick={() => {}}>
                                Update
                              </Button>
                            )}
                            <Button size="slim" icon={ExternalIcon} onClick={() => {}}>
                              Customize
                            </Button>
                          </InlineStack>
                        </div>
                      </div>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Special Offers */}
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">🔥 Special Offers</Text>
                <Button variant="plain" url="/app/bundles">All bundles →</Button>
              </InlineStack>

              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, 1fr)" }}>
                {(featuredOffers as FeaturedOffer[]).map((offer) => (
                  <Card key={offer.id} padding="0">
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                      <div
                        style={{
                          background: `linear-gradient(135deg, ${offer.color} 0%, ${offer.color}cc 100%)`,
                          padding: 20,
                          borderRadius: "12px 12px 0 0",
                          textAlign: "center",
                        }}
                      >
                        <span style={{ fontSize: 32 }}>{offer.icon}</span>
                        <div style={{ marginTop: 8 }}>
                          <Badge tone="success">{`-${offer.discount}%`}</Badge>
                        </div>
                      </div>
                      <Box padding="400">
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">{offer.name}</Text>
                          <Text as="p" variant="bodySm" tone="subdued">{offer.description}</Text>
                          <InlineStack gap="200" blockAlign="center">
                            <Text as="span" variant="headingMd">€{offer.discountedPrice}</Text>
                            <Text as="span" variant="bodySm" tone="subdued" textDecorationLine="line-through">
                              €{offer.originalPrice}
                            </Text>
                          </InlineStack>
                          <Button fullWidth url="/app/bundles">View Bundle</Button>
                        </BlockStack>
                      </Box>
                    </div>
                  </Card>
                ))}
              </div>
            </BlockStack>
          </Layout.Section>
        </Layout>

        {/* Quick Actions Footer */}
        <Layout>
          <Layout.Section>
            <Card>
              <InlineStack align="space-between" blockAlign="center" wrap>
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">Explore {totalAvailable} Sections</Text>
                  <Text as="p" variant="bodySm" tone="subdued">Browse our full collection of premium Shopify sections</Text>
                </BlockStack>
                <InlineStack gap="200">
                  <Button url="/app/explore" variant="primary">Explore Sections</Button>
                  <Button url="/app/bundles">View Bundles</Button>
                  <Button url="/app/help">Help Center</Button>
                </InlineStack>
              </InlineStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
