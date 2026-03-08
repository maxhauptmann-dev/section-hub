import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";
import { checkIsPremium } from "../lib/is-premium.server";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  Button,
} from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { isPremium } = await checkIsPremium(session.shop);
  return { isPremium };
};

interface ConversionBlock {
  id: string;
  name: string;
  description: string;
  preview: string;
  premium: boolean;
}

const ALL_BLOCKS: ConversionBlock[] = [
  { id: "countdown", name: "Countdown Timer", description: "Create urgency with a countdown timer for limited offers", preview: "/previews/blocks/countdown.svg", premium: true },
  { id: "inventory-bar", name: "Inventory Bar", description: "Show stock levels with a colored progress bar", preview: "/previews/blocks/inventory-bar.svg", premium: true },
  { id: "copy-discount-code", name: "Copy Discount Code", description: "Clickable discount code with copy-to-clipboard functionality", preview: "/previews/blocks/copy-discount-code.svg", premium: true },
  { id: "badges", name: "Badges", description: "Colorful tags like Trending, Bestseller, Only a few left", preview: "/previews/blocks/badges.svg", premium: true },
  { id: "payment-icons", name: "Payment Icons", description: "Show accepted payment methods to build customer trust", preview: "/previews/blocks/payment-icons.svg", premium: true },
  { id: "shipping-info", name: "Shipping Info", description: "Estimated shipping date with status indicator and fast shipping badge", preview: "/previews/blocks/shipping-info.svg", premium: true },
  { id: "social-proof", name: "Social Proof", description: "Display user avatars and testimonials with verified badges", preview: "/previews/blocks/social-proof.svg", premium: true },
  { id: "benefit-boxes", name: "Benefit Boxes", description: "Highlight key benefits (Free Shipping, Returns, Support, etc.)", preview: "/previews/blocks/benefit-boxes.svg", premium: true },
  { id: "feature-list", name: "Feature List", description: "Display product features with checkmark bullets", preview: "/previews/blocks/feature-list.svg", premium: true },
  { id: "video-carousel", name: "Video Carousel", description: "Horizontal scroll carousel with video thumbnails and play buttons", preview: "/previews/blocks/video-carousel.svg", premium: true },
  { id: "upsell", name: "Upsell", description: "Frequently bought together product recommendations with Add button", preview: "/previews/blocks/upsell.svg", premium: true },
  { id: "wrapper", name: "Wrapper", description: "Container card with benefit icons row for product info area", preview: "/previews/blocks/wrapper.svg", premium: true },
  { id: "trustpilot-review", name: "Review Summary", description: "Trustpilot-style review rating with star boxes and review count", preview: "/previews/blocks/trustpilot-review.svg", premium: true },
  { id: "inventory-status", name: "Inventory Status", description: "Display stock status badges with pulsing indicator", preview: "/previews/blocks/inventory-status.svg", premium: true },
  { id: "countdown-shipping", name: "Countdown Shipping Bar", description: "Order within X hours for same-day shipping with live timer", preview: "/previews/blocks/countdown-shipping.svg", premium: true },
  { id: "smart-upsell", name: "Smart Upsell Carousel", description: "Dynamic product recommendations with one-click add to cart", preview: "/previews/blocks/smart-upsell.svg", premium: true },
];

export default function ConversionBlocksPage() {
  const { isPremium } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const totalBlocks = ALL_BLOCKS.length;

  const subscribeFetcher = useFetcher<{ confirmationUrl?: string; error?: string }>();
  const isSubscribing = subscribeFetcher.state !== "idle";
  useEffect(() => {
    if (subscribeFetcher.data?.confirmationUrl) {
      window.open(subscribeFetcher.data.confirmationUrl, "_top");
    }
  }, [subscribeFetcher.data]);

  const UpgradeButton = ({ fullWidth = false, size = "medium" as "medium" | "large" }) => (
    <subscribeFetcher.Form method="post" action="/app/api/subscribe">
      <Button fullWidth={fullWidth} variant="primary" tone="success" size={size} loading={isSubscribing} submit>
        Upgrade to Premium — €8/mo
      </Button>
    </subscribeFetcher.Form>
  );

  return (
    <Page title="Conversion Blocks" backAction={{ onAction: () => navigate("/app") }}>
      <BlockStack gap="600">
        {/* Hero Header */}
        <Card>
          <div style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            margin: "-16px",
            padding: "32px 28px",
            borderRadius: "12px",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              background: "radial-gradient(circle at 80% 20%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(16,185,129,0.1) 0%, transparent 50%)",
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span style={{ fontSize: "28px" }}>⚡</span>
                <span style={{ color: "white", fontSize: "22px", fontWeight: 700 }}>Conversion Blocks</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", margin: "0 0 16px 0", maxWidth: "500px" }}>
                {totalBlocks} powerful blocks to boost your product page conversions. Add countdown timers, social proof, upsells, and more.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{
                  background: isPremium ? "rgba(16,185,129,0.2)" : "rgba(251,191,36,0.2)",
                  color: isPremium ? "#6ee7b7" : "#fcd34d",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}>
                  {isPremium ? "✓ All Unlocked" : "🔒 Premium Required"}
                </span>
                <span style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.8)",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: 500,
                }}>
                  {totalBlocks} blocks
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Upgrade Banner for non-premium */}
        {!isPremium && (
          <Card>
            <InlineStack align="space-between" blockAlign="center" gap="400" wrap={false}>
              <BlockStack gap="100">
                <Text as="p" variant="headingSm">👑 Unlock all Conversion Blocks</Text>
                <Text as="p" variant="bodySm" tone="subdued">Get all {totalBlocks} blocks + all premium sections for just €8/month.</Text>
              </BlockStack>
              <UpgradeButton />
            </InlineStack>
          </Card>
        )}

        {/* How to use */}
        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm">How to use</Text>
            <InlineStack gap="400" wrap>
              {[
                { step: "1", icon: "🎨", text: "Open Theme Editor" },
                { step: "2", icon: "📄", text: "Go to Product Page" },
                { step: "3", icon: "➕", text: "Add Block → Section Hub" },
                { step: "4", icon: "✨", text: "Customize & Save" },
              ].map((s) => (
                <div key={s.step} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "#f8f9fa", borderRadius: "8px", padding: "8px 14px",
                }}>
                  <span style={{ fontSize: "16px" }}>{s.icon}</span>
                  <Text as="span" variant="bodySm">{s.text}</Text>
                </div>
              ))}
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Blocks Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
        }}>
          {ALL_BLOCKS.map((block) => (
            <Card key={block.id}>
              <BlockStack gap="300">
                {/* Preview Image – compact */}
                <div style={{
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid #e3e5e7",
                  background: "#fafbfc",
                  position: "relative",
                  opacity: isPremium ? 1 : 0.65,
                  transition: "opacity 0.2s ease",
                }}>
                  <div style={{
                    maxHeight: "140px",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                  }}>
                    <img
                      src={block.preview}
                      alt={block.name}
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        transform: "scale(0.85)",
                        transformOrigin: "top center",
                      }}
                    />
                  </div>
                  {!isPremium && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(255,255,255,0.35)",
                      backdropFilter: "blur(1px)",
                    }}>
                      <span style={{
                        fontSize: "20px",
                        background: "rgba(0,0,0,0.06)",
                        borderRadius: "50%",
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>🔒</span>
                    </div>
                  )}
                </div>
                {/* Block Info */}
                <InlineStack align="space-between" blockAlign="start" gap="200" wrap={false}>
                  <BlockStack gap="050">
                    <Text as="h3" variant="headingSm">{block.name}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{block.description}</Text>
                  </BlockStack>
                  {isPremium
                    ? <Badge tone="success">Active</Badge>
                    : <Badge tone="attention">Locked</Badge>
                  }
                </InlineStack>
              </BlockStack>
            </Card>
          ))}
        </div>

        {/* Bottom CTA for non-premium */}
        {!isPremium && (
          <Card>
            <BlockStack gap="300" inlineAlign="center">
              <Text as="p" variant="headingMd" alignment="center">Ready to boost your conversions?</Text>
              <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                Unlock all {totalBlocks} conversion blocks and all premium sections.
              </Text>
              <div style={{ maxWidth: "320px", width: "100%", margin: "0 auto" }}>
                <UpgradeButton fullWidth size="large" />
              </div>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
