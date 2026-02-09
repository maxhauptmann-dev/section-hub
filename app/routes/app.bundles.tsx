import { useState } from "react";
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
} from "@shopify/polaris";

type Bundle = {
  id: string;
  name: string;
  description: string;
  sections: string[];
  originalPrice: number;
  discountedPrice: number;
  discount: number;
  color: string;
  gradient: string;
  icon: string;
  popular: boolean;
  limitedTime: boolean;
};

const BUNDLES: Bundle[] = [
  {
    id: "starter",
    name: "Starter Bundle",
    description: "Perfekt für neue Shops. Die wichtigsten Sections zum Start.",
    sections: ["Hero Simple", "FAQ Accordion", "Feature Grid", "Footer Pro"],
    originalPrice: 49,
    discountedPrice: 29,
    discount: 40,
    color: "#10b981",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    icon: "🚀",
    popular: false,
    limitedTime: false,
  },
  {
    id: "conversion",
    name: "Conversion Bundle",
    description: "Maximiere deine Conversion Rate mit bewährten Sections.",
    sections: [
      "Countdown Timer",
      "Trust Badges",
      "Testimonial Carousel",
      "Payment Icons",
      "Urgency Bar",
      "Social Proof Popup",
    ],
    originalPrice: 89,
    discountedPrice: 49,
    discount: 45,
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    icon: "🎯",
    popular: true,
    limitedTime: false,
  },
  {
    id: "pro",
    name: "Pro Bundle",
    description: "Alle Premium Sections. Unbegrenzte Updates. Priority Support.",
    sections: [
      "Hero Pro",
      "Video Background Hero",
      "Before/After Slider",
      "Testimonial Carousel",
      "FAQ Accordion",
      "Feature Grid",
      "Countdown Timer",
      "Trust Badges",
      "Payment Icons",
      "Instagram Feed",
      "+ alle zukünftigen Sections",
    ],
    originalPrice: 199,
    discountedPrice: 99,
    discount: 50,
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
    icon: "👑",
    popular: false,
    limitedTime: true,
  },
];

export default function BundlesPage() {
  const [hoveredBundle, setHoveredBundle] = useState<string | null>(null);

  return (
    <Page
      title="Bundle & Save"
      subtitle="Spare bis zu 50% mit unseren kuratierten Section-Paketen"
      primaryAction={{ content: "Einzelne Sections", url: "/app/explore" }}
    >
      <Layout>
        {/* Limited Time Banner */}
        <Layout.Section>
          <Banner tone="warning">
            <InlineStack gap="200" blockAlign="center">
              <Text as="span" variant="headingSm">⏰ Limitiertes Angebot:</Text>
              <Text as="span" variant="bodyMd">
                Pro Bundle für nur €99 statt €199 — Endet bald!
              </Text>
            </InlineStack>
          </Banner>
        </Layout.Section>

        {/* Bundle Cards */}
        <Layout.Section>
          <div style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          }}>
            {BUNDLES.map((bundle) => (
              <Card key={bundle.id} padding="0">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    transform: hoveredBundle === bundle.id ? "translateY(-4px)" : "none",
                    transition: "transform 0.2s ease",
                  }}
                  onMouseEnter={() => setHoveredBundle(bundle.id)}
                  onMouseLeave={() => setHoveredBundle(null)}
                >
                  {/* Header */}
                  <div style={{
                    background: bundle.gradient,
                    padding: 24,
                    borderRadius: "12px 12px 0 0",
                    position: "relative",
                  }}>
                    {/* Popular Badge */}
                    {bundle.popular && (
                      <div style={{
                        position: "absolute",
                        top: -12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#1f2937",
                        color: "white",
                        padding: "6px 16px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}>
                        ⭐ Beliebteste Wahl
                      </div>
                    )}

                    <BlockStack gap="300">
                      <InlineStack gap="200" blockAlign="center">
                        <span style={{ fontSize: 32 }}>{bundle.icon}</span>
                        <Text as="h2" variant="headingLg" tone="text-inverse">
                          {bundle.name}
                        </Text>
                      </InlineStack>

                      <Text as="p" variant="bodyMd" tone="text-inverse">
                        {bundle.description}
                      </Text>

                      {/* Price */}
                      <InlineStack gap="200" blockAlign="end">
                        <Text as="p" variant="heading2xl" tone="text-inverse">
                          €{bundle.discountedPrice}
                        </Text>
                        <BlockStack gap="0">
                          <Text as="p" variant="bodySm" tone="text-inverse" textDecorationLine="line-through">
                            €{bundle.originalPrice}
                          </Text>
                          <Badge tone="success">{`-${bundle.discount}%`}</Badge>
                        </BlockStack>
                      </InlineStack>
                    </BlockStack>
                  </div>

                  {/* Content */}
                  <Box padding="400" minHeight="300px">
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingSm">
                        Enthaltene Sections ({bundle.sections.length}):
                      </Text>

                      <BlockStack gap="200">
                        {bundle.sections.map((section, idx) => (
                          <InlineStack key={idx} gap="200" blockAlign="center">
                            <span style={{ color: bundle.color }}>✓</span>
                            <Text as="p" variant="bodyMd">{section}</Text>
                          </InlineStack>
                        ))}
                      </BlockStack>

                      <Divider />

                      <BlockStack gap="200">
                        <InlineStack gap="200" blockAlign="center">
                          <span>🔄</span>
                          <Text as="p" variant="bodySm">Lifetime Updates</Text>
                        </InlineStack>
                        <InlineStack gap="200" blockAlign="center">
                          <span>💬</span>
                          <Text as="p" variant="bodySm">
                            {bundle.id === "pro" ? "Priority Support" : "Email Support"}
                          </Text>
                        </InlineStack>
                        <InlineStack gap="200" blockAlign="center">
                          <span>⚡</span>
                          <Text as="p" variant="bodySm">One-Click Install</Text>
                        </InlineStack>
                      </BlockStack>

                      <Button
                        fullWidth
                        variant="primary"
                        size="large"
                        onClick={() => alert(`Kaufen: ${bundle.name} für €${bundle.discountedPrice}`)}
                      >
                        {bundle.name} kaufen — €{bundle.discountedPrice.toString()}
                      </Button>

                      {bundle.limitedTime && (
                        <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                          ⏰ Nur noch 3 Tage verfügbar
                        </Text>
                      )}
                    </BlockStack>
                  </Box>
                </div>
              </Card>
            ))}
          </div>
        </Layout.Section>

        {/* Comparison Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Warum ein Bundle?</Text>
              
              <div style={{
                display: "grid",
                gap: 24,
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              }}>
                <BlockStack gap="200">
                  <span style={{ fontSize: 32 }}>💰</span>
                  <Text as="h3" variant="headingMd">Spare bis zu 50%</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Im Vergleich zum Einzelkauf sparst du massiv.
                  </Text>
                </BlockStack>

                <BlockStack gap="200">
                  <span style={{ fontSize: 32 }}>🔄</span>
                  <Text as="h3" variant="headingMd">Lifetime Updates</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Alle zukünftigen Updates kostenlos inklusive.
                  </Text>
                </BlockStack>

                <BlockStack gap="200">
                  <span style={{ fontSize: 32 }}>⚡</span>
                  <Text as="h3" variant="headingMd">Sofort einsatzbereit</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    One-Click Install in dein Theme.
                  </Text>
                </BlockStack>

                <BlockStack gap="200">
                  <span style={{ fontSize: 32 }}>🎨</span>
                  <Text as="h3" variant="headingMd">Perfekt abgestimmt</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Alle Sections passen optisch zusammen.
                  </Text>
                </BlockStack>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* FAQ */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">Häufige Fragen</Text>
              
              <BlockStack gap="300">
                <BlockStack gap="100">
                  <Text as="h3" variant="headingSm">Kann ich später upgraden?</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Ja! Du zahlst nur die Differenz zum größeren Bundle.
                  </Text>
                </BlockStack>

                <Divider />

                <BlockStack gap="100">
                  <Text as="h3" variant="headingSm">Funktioniert es mit meinem Theme?</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Alle Sections sind kompatibel mit jedem OS 2.0 Theme.
                  </Text>
                </BlockStack>

                <Divider />

                <BlockStack gap="100">
                  <Text as="h3" variant="headingSm">Was ist &quot;Lifetime Updates&quot;?</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Du bekommst alle zukünftigen Updates und Verbesserungen kostenlos.
                  </Text>
                </BlockStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
