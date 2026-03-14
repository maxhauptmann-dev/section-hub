import { useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
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
  Banner,
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
  category: string;
}

const ALL_BLOCKS: ConversionBlock[] = [
  { id: "countdown", name: "Countdown Timer", description: "Create urgency with a countdown timer for limited offers", preview: "/previews/blocks/countdown.svg", premium: true, category: "Urgency" },
  { id: "inventory-bar", name: "Inventory Bar", description: "Show stock levels with a colored progress bar", preview: "/previews/blocks/inventory-bar.svg", premium: true, category: "Urgency" },
  { id: "copy-discount-code", name: "Copy Discount Code", description: "Clickable discount code with copy-to-clipboard functionality", preview: "/previews/blocks/copy-discount-code.svg", premium: true, category: "Conversion" },
  { id: "badges", name: "Badges", description: "Colorful tags like Trending, Bestseller, Only a few left", preview: "/previews/blocks/badges.svg", premium: true, category: "Trust" },
  { id: "payment-icons", name: "Payment Icons", description: "Show accepted payment methods to build customer trust", preview: "/previews/blocks/payment-icons.svg", premium: true, category: "Trust" },
  { id: "shipping-info", name: "Shipping Info", description: "Estimated shipping date with status indicator and fast shipping badge", preview: "/previews/blocks/shipping-info.svg", premium: true, category: "Info" },
  { id: "social-proof", name: "Social Proof", description: "Display user avatars and testimonials with verified badges", preview: "/previews/blocks/social-proof.svg", premium: true, category: "Trust" },
  { id: "benefit-boxes", name: "Benefit Boxes", description: "Highlight key benefits (Free Shipping, Returns, Support, etc.)", preview: "/previews/blocks/benefit-boxes.svg", premium: true, category: "Info" },
  { id: "feature-list", name: "Feature List", description: "Display product features with checkmark bullets", preview: "/previews/blocks/feature-list.svg", premium: true, category: "Info" },
  { id: "video-carousel", name: "Video Carousel", description: "Horizontal scroll carousel with video thumbnails and play buttons", preview: "/previews/blocks/video-carousel.svg", premium: true, category: "Media" },
  { id: "upsell", name: "Upsell", description: "Frequently bought together product recommendations with Add button", preview: "/previews/blocks/upsell.svg", premium: true, category: "Conversion" },
  { id: "wrapper", name: "Wrapper", description: "Container card with benefit icons row for product info area", preview: "/previews/blocks/wrapper.svg", premium: true, category: "Layout" },
  { id: "trustpilot-review", name: "Review Summary", description: "Trustpilot-style review rating with star boxes and review count", preview: "/previews/blocks/trustpilot-review.svg", premium: true, category: "Trust" },
  { id: "inventory-status", name: "Inventory Status", description: "Display stock status badges with pulsing indicator", preview: "/previews/blocks/inventory-status.svg", premium: true, category: "Urgency" },
  { id: "countdown-shipping", name: "Countdown Shipping Bar", description: "Order within X hours for same-day shipping with live timer", preview: "/previews/blocks/countdown-shipping.svg", premium: true, category: "Urgency" },
  { id: "smart-upsell", name: "Smart Upsell Carousel", description: "Dynamic product recommendations with one-click add to cart", preview: "/previews/blocks/smart-upsell.svg", premium: true, category: "Conversion" },
  { id: "upsell-spotlight-bar", name: "Upsell Spotlight Bar", description: "Elegant horizontal bar with product image, savings badge, urgency indicator and trust badges", preview: "/previews/blocks/upsell-spotlight-bar.svg", premium: true, category: "Upsell" },
  { id: "upsell-card-stack", name: "Upsell Card Stack", description: "Dark-themed stacked product cards with glow effects, shine animation and savings badges", preview: "/previews/blocks/upsell-card-stack.svg", premium: true, category: "Upsell" },
  { id: "upsell-carousel-drawer", name: "Upsell Carousel", description: "Snap carousel with glassmorphism cards, navigation arrows, dot indicators and progress bar", preview: "/previews/blocks/upsell-carousel-drawer.svg", premium: true, category: "Upsell" },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Urgency: { bg: "rgba(239,68,68,0.08)", text: "#b91c1c", border: "rgba(239,68,68,0.2)" },
  Trust: { bg: "rgba(22,163,74,0.08)", text: "#15803d", border: "rgba(22,163,74,0.2)" },
  Conversion: { bg: "rgba(99,102,241,0.08)", text: "#4338ca", border: "rgba(99,102,241,0.2)" },
  Info: { bg: "rgba(59,130,246,0.08)", text: "#1d4ed8", border: "rgba(59,130,246,0.2)" },
  Media: { bg: "rgba(168,85,247,0.08)", text: "#7e22ce", border: "rgba(168,85,247,0.2)" },
  Layout: { bg: "rgba(107,114,128,0.08)", text: "#374151", border: "rgba(107,114,128,0.2)" },
  Upsell: { bg: "rgba(184,134,78,0.1)", text: "#92400e", border: "rgba(184,134,78,0.25)" },
};

export default function ConversionBlocksPage() {
  const { isPremium } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const totalBlocks = ALL_BLOCKS.length;

  const subscribeFetcher = useFetcher<{ confirmationUrl?: string }>();
  const isSubscribing = subscribeFetcher.state !== "idle";

  useEffect(() => {
    const url = subscribeFetcher.data?.confirmationUrl;
    if (url) {
      try {
        window.open(url, "_top");
      } catch {
        window.location.assign(url);
      }
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
      <style>{`
        @keyframes sh-gradient-move{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes sh-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes sh-fade-up{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes sh-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes sh-pulse-soft{0%,100%{box-shadow:0 2px 16px rgba(99,102,241,0.08)}50%{box-shadow:0 4px 28px rgba(99,102,241,0.16)}}
        @keyframes sh-icon-bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}

        .sh-blk-hero{
          position:relative;overflow:hidden;border-radius:16px;padding:28px 24px;
          background:linear-gradient(-45deg,#ede9fe,#ddd6fe,#c4b5fd,#e9d5ff);
          background-size:300% 300%;
          animation:sh-gradient-move 8s ease infinite, sh-pulse-soft 5s ease-in-out infinite;
        }
        .sh-blk-hero::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.5) 50%,transparent 60%);
          background-size:200% 200%;animation:sh-shimmer 4s ease-in-out infinite;pointer-events:none;
        }
        .sh-blk-hero::after{
          content:'';position:absolute;top:-40%;right:-20%;width:60%;height:80%;
          background:radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%);
          pointer-events:none;
        }

        .sh-blk-glass{
          background:rgba(255,255,255,0.65);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,0.8);
          border-radius:14px;padding:18px 20px;
          box-shadow:0 2px 12px rgba(0,0,0,0.04);
        }

        .sh-blk-step{
          display:flex;align-items:center;gap:10px;
          background:rgba(255,255,255,0.55);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.7);
          border-radius:12px;padding:10px 16px;
          transition:all .25s cubic-bezier(.4,0,.2,1);
          box-shadow:0 1px 4px rgba(0,0,0,0.04);
          flex:1;min-width:140px;
        }
        .sh-blk-step:hover{background:rgba(255,255,255,0.8);transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,0.08)}

        .sh-blk-step-num{
          width:24px;height:24px;border-radius:50%;
          background:linear-gradient(135deg,#8b5cf6,#7c3aed);
          color:white;font-size:11px;font-weight:700;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
        }

        .sh-blk-grid{display:grid;grid-template-columns:1fr;gap:14px}
        @media(min-width:640px){.sh-blk-grid{grid-template-columns:repeat(2,1fr)}}

        .sh-blk-card{
          position:relative;overflow:hidden;border-radius:14px;
          border:1px solid #e5e7eb;background:#fff;
          transition:all .3s cubic-bezier(.4,0,.2,1);
          animation:sh-fade-up .5s ease both;
        }
        .sh-blk-card:nth-child(1){animation-delay:.03s}
        .sh-blk-card:nth-child(2){animation-delay:.06s}
        .sh-blk-card:nth-child(3){animation-delay:.09s}
        .sh-blk-card:nth-child(4){animation-delay:.12s}
        .sh-blk-card:nth-child(5){animation-delay:.15s}
        .sh-blk-card:nth-child(6){animation-delay:.18s}
        .sh-blk-card:nth-child(7){animation-delay:.21s}
        .sh-blk-card:nth-child(8){animation-delay:.24s}
        .sh-blk-card:nth-child(9){animation-delay:.27s}
        .sh-blk-card:nth-child(10){animation-delay:.30s}
        .sh-blk-card:nth-child(11){animation-delay:.33s}
        .sh-blk-card:nth-child(12){animation-delay:.36s}
        .sh-blk-card:nth-child(13){animation-delay:.39s}
        .sh-blk-card:nth-child(14){animation-delay:.42s}
        .sh-blk-card:nth-child(15){animation-delay:.45s}
        .sh-blk-card:nth-child(16){animation-delay:.48s}
        .sh-blk-card:nth-child(17){animation-delay:.51s}
        .sh-blk-card:nth-child(18){animation-delay:.54s}
        .sh-blk-card:nth-child(19){animation-delay:.57s}
        .sh-blk-card:hover{
          box-shadow:0 8px 28px rgba(0,0,0,0.08);
          border-color:#c7d2fe;
          transform:translateY(-3px);
        }
        .sh-blk-card:hover .sh-blk-preview img{transform:scale(0.9)}

        .sh-blk-preview{
          border-bottom:1px solid #f1f5f9;
          background:linear-gradient(135deg,#fafbfc 0%,#f1f5f9 100%);
          position:relative;overflow:hidden;
          height:130px;display:flex;align-items:flex-start;justify-content:center;
        }
        .sh-blk-preview img{
          width:100%;height:auto;display:block;
          transform:scale(0.85);transform-origin:top center;
          transition:transform .3s ease;
        }

        .sh-blk-locked-overlay{
          position:absolute;top:0;left:0;right:0;bottom:0;
          display:flex;align-items:center;justify-content:center;
          background:rgba(255,255,255,0.4);
          backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);
        }
        .sh-blk-lock-icon{
          width:40px;height:40px;border-radius:50%;
          background:rgba(255,255,255,0.8);
          backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
          border:1px solid rgba(255,255,255,0.9);
          display:flex;align-items:center;justify-content:center;
          font-size:18px;box-shadow:0 2px 12px rgba(0,0,0,0.08);
        }

        .sh-blk-info{padding:14px 16px}

        .sh-blk-cat-badge{
          display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;
          font-size:11px;font-weight:600;
        }

        .sh-blk-status-badge{
          display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;
          font-size:12px;font-weight:600;
        }
        .sh-blk-status-active{background:rgba(22,163,74,0.12);color:#15803d;border:1px solid rgba(22,163,74,0.25)}
        .sh-blk-status-locked{background:rgba(245,158,11,0.1);color:#92400e;border:1px solid rgba(245,158,11,0.2)}

        .sh-blk-stats{
          display:flex;gap:10px;flex-wrap:wrap;
        }
        .sh-blk-stat{
          background:rgba(255,255,255,0.55);
          backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
          border:1px solid rgba(255,255,255,0.7);
          border-radius:12px;padding:12px 16px;text-align:center;
          transition:all .25s cubic-bezier(.4,0,.2,1);
          box-shadow:0 1px 4px rgba(0,0,0,0.04);
          flex:1;min-width:80px;
        }
        .sh-blk-stat:hover{background:rgba(255,255,255,0.8);transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,0.08)}

        .sh-blk-upgrade{
          position:relative;overflow:hidden;border-radius:16px;padding:24px;
          background:linear-gradient(-45deg,#f5f3ff,#ede9fe,#ddd6fe,#e9d5ff);
          background-size:300% 300%;
          animation:sh-gradient-move 8s ease infinite;
          transition:all .25s ease;
        }
        .sh-blk-upgrade:hover{box-shadow:0 6px 20px rgba(139,92,246,.12);transform:translateY(-2px)}
        .sh-blk-upgrade::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.4) 50%,transparent 60%);
          background-size:200% 200%;animation:sh-shimmer 4s ease-in-out infinite;pointer-events:none;
        }

        .sh-blk-icon-float{animation:sh-float 3s ease-in-out infinite;display:inline-block}
      `}</style>

      <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <BlockStack gap="500">

        {/* ═══ HERO CARD ═══ */}
        <div className="sh-blk-hero">
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="sh-blk-glass" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.15) 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, flexShrink: 0,
                }}>
                  <span className="sh-blk-icon-float">⚡</span>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b" }}>
                    Conversion Blocks
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                    {totalBlocks} powerful blocks for your product pages
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className={`sh-blk-status-badge ${isPremium ? 'sh-blk-status-active' : 'sh-blk-status-locked'}`}>
                  {isPremium ? "✓ All Unlocked" : "🔒 Premium Required"}
                </span>
                <span className="sh-blk-status-badge" style={{ background: "rgba(99,102,241,0.1)", color: "#4338ca", border: "1px solid rgba(99,102,241,0.2)" }}>
                  {totalBlocks} blocks
                </span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="sh-blk-stats" style={{ marginTop: 14 }}>
              {[
                { label: "Urgency", value: ALL_BLOCKS.filter(b => b.category === "Urgency").length, icon: "🔥" },
                { label: "Trust", value: ALL_BLOCKS.filter(b => b.category === "Trust").length, icon: "🛡️" },
                { label: "Conversion", value: ALL_BLOCKS.filter(b => b.category === "Conversion").length, icon: "💰" },
                { label: "Upsell", value: ALL_BLOCKS.filter(b => b.category === "Upsell").length, icon: "🛒" },
                { label: "Info & More", value: ALL_BLOCKS.filter(b => !["Urgency","Trust","Conversion","Upsell"].includes(b.category)).length, icon: "📦" },
              ].map((s) => (
                <div key={s.label} className="sh-blk-stat">
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{s.icon} {s.label}</div>
                  <div style={{ color: "#4338ca", fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ UPGRADE BANNER (non-premium) ═══ */}
        {!isPremium && (
          <div className="sh-blk-upgrade" style={{ cursor: "pointer" }} onClick={() => navigate("/app/premium")}>
            <div className="sh-blk-glass" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
              <span className="sh-blk-icon-float" style={{ fontSize: 28 }}>👑</span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Text as="h2" variant="headingMd">Unlock All Conversion Blocks</Text>
                <Text as="p" variant="bodySm" tone="subdued">Get all {totalBlocks} blocks + all premium sections for €8/month</Text>
              </div>
              <UpgradeButton />
            </div>
          </div>
        )}

        {/* ═══ HOW TO USE ═══ */}
        <Card>
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <span style={{ fontSize: 18 }}>📋</span>
              <Text as="h3" variant="headingSm">How to use</Text>
            </InlineStack>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { step: "1", icon: "🎨", text: "Open Theme Editor" },
                { step: "2", icon: "📄", text: "Go to Product Page" },
                { step: "3", icon: "➕", text: "Add Block → Section Hub" },
                { step: "4", icon: "✨", text: "Customize & Save" },
              ].map((s) => (
                <div key={s.step} className="sh-blk-step">
                  <div className="sh-blk-step-num">{s.step}</div>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <Text as="span" variant="bodySm" fontWeight="semibold">{s.text}</Text>
                </div>
              ))}
            </div>
          </BlockStack>
        </Card>

        {/* ═══ BLOCKS GRID ═══ */}
        <BlockStack gap="300">
          <InlineStack gap="200" blockAlign="center">
            <span style={{ fontSize: 18 }}>⚡</span>
            <Text as="h2" variant="headingMd">All Blocks</Text>
            <Badge>{`${totalBlocks} total`}</Badge>
          </InlineStack>

          <div className="sh-blk-grid">
            {ALL_BLOCKS.map((block) => {
              const catColor = CATEGORY_COLORS[block.category] || CATEGORY_COLORS.Info;
              return (
                <div key={block.id} className="sh-blk-card">
                  {/* Preview */}
                  <div className="sh-blk-preview" style={{ opacity: isPremium ? 1 : 0.6 }}>
                    <img src={block.preview} alt={block.name} />
                    {!isPremium && (
                      <div className="sh-blk-locked-overlay">
                        <div className="sh-blk-lock-icon">🔒</div>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="sh-blk-info">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text as="h3" variant="headingSm">{block.name}</Text>
                        <div style={{ marginTop: 3 }}>
                          <Text as="p" variant="bodySm" tone="subdued">{block.description}</Text>
                        </div>
                      </div>
                      <span className={`sh-blk-status-badge ${isPremium ? 'sh-blk-status-active' : 'sh-blk-status-locked'}`}>
                        {isPremium ? "Active" : "Locked"}
                      </span>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <span className="sh-blk-cat-badge" style={{
                        background: catColor.bg, color: catColor.text, border: `1px solid ${catColor.border}`,
                      }}>
                        {block.category}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </BlockStack>

        {/* ═══ BOTTOM CTA (non-premium) ═══ */}
        {!isPremium && (
          <div className="sh-blk-upgrade">
            <div className="sh-blk-glass" style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
              <BlockStack gap="300" inlineAlign="center">
                <span className="sh-blk-icon-float" style={{ fontSize: 36 }}>🚀</span>
                <Text as="p" variant="headingMd">Ready to boost your conversions?</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Unlock all {totalBlocks} conversion blocks and all premium sections.
                </Text>
                <div style={{ maxWidth: 320, width: "100%", margin: "0 auto" }}>
                  <UpgradeButton fullWidth size="large" />
                </div>
              </BlockStack>
            </div>
          </div>
        )}

        {/* ═══ FOOTER ═══ */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", padding: "4px 0 12px" }}>
          <Button url="/app/explore" variant="primary" size="slim">Explore Sections</Button>
          <Button url="/app/premium" size="slim">Premium</Button>
          <Button url="/app/help" size="slim">Help</Button>
        </div>

      </BlockStack>
      </div>
    </Page>
  );
}
