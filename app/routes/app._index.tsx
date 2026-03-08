import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { getAllSections } from "../lib/sections.server";
import type { SectionMeta } from "../lib/sections.server";
import prisma from "../db.server";
import { checkIsPremium } from "../lib/is-premium.server";
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

/* ─────────────────────────────────────────────────
   No action here – analysis is handled exclusively
   by the analyzer route to ensure a single source
   of truth. The "Re-analyze" button navigates there.
   ───────────────────────────────────────────────── */

const TOTAL_PAGE_TYPES = 9;

/* ─────────────────────────────────────────────────
   Loader (loads saved analysis from DB)
   ───────────────────────────────────────────────── */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const availableSections = getAllSections();

  // ── Premium status ──
  const { isPremium } = await checkIsPremium(shop);

  // ── Purchased sections ──
  const purchases = await prisma.sectionPurchase.findMany({
    where: { shop, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
  });

  const ownedSections = purchases
    .flatMap((p) => p.sectionHandle.split(",").map((h) => h.trim()))
    .filter((h, i, a) => a.indexOf(h) === i)
    .map((handle) => {
      const meta = availableSections.find((s) => s.id === handle);
      return {
        id: handle,
        name: meta?.name ?? handle,
        version: meta?.version ?? "1.0.0",
        category: Array.isArray(meta?.category) ? meta.category[0] : (meta?.category ?? "Section"),
        previewColor: meta?.previewColor ?? "#6366f1",
      };
    });

  // ── Load saved analysis from DB ──
  const savedAnalysis = await prisma.storeAnalysis.findUnique({ where: { shop } });

  let storeScore = 0;
  let activeCount = 0;
  let totalTypes = TOTAL_PAGE_TYPES;
  let missingCritical: { key: string; label: string; icon: string }[] = [];
  let missingHigh: { key: string; label: string; icon: string }[] = [];
  let hasAnalysis = false;
  let analyzedAt: string | null = null;

  if (savedAnalysis) {
    hasAnalysis = true;
    storeScore = savedAnalysis.storeScore;
    activeCount = savedAnalysis.activeCount;
    totalTypes = savedAnalysis.totalTypes;
    analyzedAt = savedAnalysis.analyzedAt.toISOString();
    try {
      missingCritical = JSON.parse(savedAnalysis.missingCritical);
      missingHigh = JSON.parse(savedAnalysis.missingHigh);
    } catch { /* ignore parse errors */ }
  }

  return {
    shop,
    isPremium,
    sections: ownedSections,
    totalOwned: ownedSections.length,
    totalAvailable: availableSections.length,
    storeScore,
    activeCount,
    totalTypes,
    missingCritical,
    missingHigh,
    hasAnalysis,
    analyzedAt,
  };
};

type OwnedSection = {
  id: string;
  name: string;
  version: string;
  category: string;
  previewColor: string;
};

export default function DashboardPage() {
  const {
    shop, isPremium, sections, totalOwned, totalAvailable,
    storeScore, activeCount, totalTypes, missingCritical, missingHigh,
    hasAnalysis, analyzedAt,
  } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const shopName = shop.replace(".myshopify.com", "");
  const isNewUser = totalOwned === 0;

  const scoreColor = storeScore >= 80 ? "#22c55e" : storeScore >= 50 ? "#f59e0b" : "#ef4444";
  const scoreLabel = storeScore >= 80 ? "Excellent" : storeScore >= 50 ? "Good" : "Needs Work";
  const scoreEmoji = storeScore >= 80 ? "🏆" : storeScore >= 50 ? "👍" : "⚠️";

  // Format the analyzed date
  const formatAnalyzedAt = (isoDate: string | null) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Page title={`Welcome back, ${shopName} 👋`}>
      <style>{`
        .sh-steps{display:grid;grid-template-columns:1fr;gap:10px}
        @media(min-width:640px){.sh-steps{grid-template-columns:repeat(3,1fr)}}
        .sh-two-col{display:grid;grid-template-columns:1fr;gap:12px}
        @media(min-width:640px){.sh-two-col{grid-template-columns:1fr 1fr;gap:16px}}
        .sh-actions{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
        @media(min-width:640px){.sh-actions{grid-template-columns:repeat(5,1fr);gap:12px}}
        .sh-action-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px 10px;cursor:pointer;text-align:center;transition:box-shadow .15s,border-color .15s}
        .sh-action-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.08);border-color:#c7d2fe}
        .sh-tips{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        @media(min-width:640px){.sh-tips{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}}
        .sh-discount-pills{display:flex;gap:8px;flex-wrap:wrap}
        .sh-discount-pill{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 14px;text-align:center;flex:1;min-width:80px}
      `}</style>
      <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <BlockStack gap="500">

        {/* ═══ ONBOARDING (new users) ═══ */}
        {isNewUser && (
          <Card padding="0">
            <div style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
              borderRadius: 12, padding: "28px 20px",
            }}>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingLg">
                    <span style={{ color: "white" }}>Get started 🚀</span>
                  </Text>
                  <Text as="p" variant="bodySm">
                    <span style={{ color: "rgba(255,255,255,0.8)" }}>
                      3 steps to boost your store
                    </span>
                  </Text>
                </BlockStack>
                <div className="sh-steps">
                  {/* Step 1: Analyze */}
                  <div style={{
                    background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
                    borderRadius: 14, padding: "14px 16px",
                    display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: "rgba(255,255,255,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: "white",
                      }}>1</div>
                      <span style={{ fontSize: 18 }}>📊</span>
                      <Text as="h3" variant="headingSm">
                        <span style={{ color: "white" }}>Analyze</span>
                      </Text>
                    </div>
                    <Text as="p" variant="bodySm">
                      <span style={{ color: "rgba(255,255,255,0.7)" }}>
                        {hasAnalysis ? `Score: ${storeScore}/100` : "Find what's missing"}
                      </span>
                    </Text>
                    <div style={{ marginTop: "auto" }}>
                      {hasAnalysis ? (
                        <InlineStack gap="100">
                          <Badge tone="success">Done ✓</Badge>
                          <Button size="slim" onClick={() => navigate("/app/analyzer")}>Re-run</Button>
                        </InlineStack>
                      ) : (
                        <Button size="slim" onClick={() => navigate("/app/analyzer")}>Analyze</Button>
                      )}
                    </div>
                  </div>

                  {/* Step 2 & 3 */}
                  {[
                    { step: "2", icon: "💎", title: "Pick Sections", desc: `${totalAvailable} available`, action: "Browse", url: "/app/explore" },
                    { step: "3", icon: "⚡", title: "Go Live", desc: "One-click install", action: "Guide", url: "/app/help" },
                  ].map((s) => (
                    <div key={s.step} style={{
                      background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
                      borderRadius: 14, padding: "14px 16px",
                      display: "flex", flexDirection: "column", gap: 8,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: "50%",
                          background: "rgba(255,255,255,0.3)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, color: "white",
                        }}>{s.step}</div>
                        <span style={{ fontSize: 18 }}>{s.icon}</span>
                        <Text as="h3" variant="headingSm">
                          <span style={{ color: "white" }}>{s.title}</span>
                        </Text>
                      </div>
                      <Text as="p" variant="bodySm">
                        <span style={{ color: "rgba(255,255,255,0.7)" }}>{s.desc}</span>
                      </Text>
                      <div style={{ marginTop: "auto" }}>
                        <Button size="slim" onClick={() => navigate(s.url)}>{s.action}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </BlockStack>
            </div>
          </Card>
        )}

        {/* ═══ STORE SCORE + PREMIUM (returning users) ═══ */}
        {!isNewUser && (
          <div className="sh-two-col">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <span style={{ fontSize: 20 }}>{hasAnalysis ? scoreEmoji : "📊"}</span>
                    <Text as="h2" variant="headingMd">Store Score</Text>
                  </InlineStack>
                  {hasAnalysis && (
                    <Badge tone={storeScore >= 80 ? "success" : storeScore >= 50 ? "warning" : "critical"}>{scoreLabel}</Badge>
                  )}
                </InlineStack>

                {/* No analysis yet */}
                {!hasAnalysis && (
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300" inlineAlign="center">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Run your first analysis to see your store score
                      </Text>
                      <Button variant="primary" onClick={() => navigate("/app/analyzer")}>
                        Analyze Now
                      </Button>
                    </BlockStack>
                  </Box>
                )}

                {/* Has analysis results */}
                {hasAnalysis && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 60, height: 60, borderRadius: "50%",
                        background: `conic-gradient(${scoreColor} ${storeScore * 3.6}deg, #e5e7eb ${storeScore * 3.6}deg)`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: "50%", background: "white",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontSize: 17, fontWeight: 800, color: scoreColor }}>{storeScore}</span>
                          <span style={{ fontSize: 8, color: "#6b7280" }}>/ 100</span>
                        </div>
                      </div>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">{`${activeCount} of ${totalTypes} pages optimized`}</Text>
                        <InlineStack gap="100" wrap>
                          {missingCritical.length > 0 && <Badge tone="critical" size="small">{`${missingCritical.length} critical`}</Badge>}
                          {missingHigh.length > 0 && <Badge tone="warning" size="small">{`${missingHigh.length} high`}</Badge>}
                        </InlineStack>
                        {analyzedAt && (
                          <Text as="p" variant="bodySm" tone="subdued">
                            Updated {formatAnalyzedAt(analyzedAt)}
                          </Text>
                        )}
                      </BlockStack>
                    </div>
                    <InlineStack gap="200" align="space-between">
                      <Button size="slim" onClick={() => navigate("/app/analyzer")} icon={undefined}>
                        🔄 Re-analyze
                      </Button>
                    </InlineStack>
                  </>
                )}
              </BlockStack>
            </Card>

            {!isPremium ? (
              <Card padding="0">
                <div style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 40%, #a78bfa 100%)",
                  borderRadius: 12, padding: "18px 20px", height: "100%",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                }}>
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center" wrap>
                      <span style={{ fontSize: 22 }}>👑</span>
                      <Text as="h2" variant="headingMd"><span style={{ color: "white" }}>Premium</span></Text>
                      <Badge tone="info">€8/mo</Badge>
                    </InlineStack>
                    <BlockStack gap="050">
                      {["📦 All sections included", "🔓 All Premium Blocks", "🆕 New sections monthly", "⚡ Priority support"].map((t) => (
                        <Text key={t} as="p" variant="bodySm"><span style={{ color: "rgba(255,255,255,0.9)" }}>{t}</span></Text>
                      ))}
                    </BlockStack>
                  </BlockStack>
                  <div style={{ marginTop: 12 }}>
                    <Button variant="primary" onClick={() => navigate("/app/premium")}>Upgrade →</Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <span style={{ fontSize: 22 }}>👑</span>
                    <Text as="h2" variant="headingMd">Premium Active</Text>
                    <Badge tone="success">Active</Badge>
                  </InlineStack>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[
                      { label: "Owned", value: `${totalOwned}`, icon: "📦" },
                      { label: "Available", value: `${totalAvailable}`, icon: "🔍" },
                      { label: "Free/mo", value: "5", icon: "🎁" },
                      { label: "Blocks", value: "All 16", icon: "⚡" },
                    ].map((stat) => (
                      <div key={stat.label} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                        <Text as="p" variant="bodySm" tone="subdued">{stat.icon} {stat.label}</Text>
                        <Text as="p" variant="headingSm">{stat.value}</Text>
                      </div>
                    ))}
                  </div>
                </BlockStack>
              </Card>
            )}
          </div>
        )}

        {/* ═══ QUICK ACTIONS ═══ */}
        <div className="sh-actions">
          {[
            { icon: "🔍", title: "Explore", subtitle: `${totalAvailable} sections`, url: "/app/explore" },
            { icon: "📊", title: "Analyzer", subtitle: "Score your store", url: "/app/analyzer" },
            { icon: "👑", title: "Premium", subtitle: "All sections", url: "/app/premium" },
            { icon: "⚡", title: "Blocks", subtitle: "Boost conversions", url: "/app/blocks" },
            { icon: "🔄", title: "Updates", subtitle: "All up to date", url: "/app/updates" },
          ].map((a) => (
            <div key={a.title} className="sh-action-card" onClick={() => navigate(a.url)} onKeyDown={() => {}} role="button" tabIndex={0}>
              <BlockStack gap="100" inlineAlign="center">
                <span style={{ fontSize: 26 }}>{a.icon}</span>
                <Text as="p" variant="headingSm">{a.title}</Text>
                <Text as="p" variant="bodySm" tone="subdued">{a.subtitle}</Text>
              </BlockStack>
            </div>
          ))}
        </div>

        {/* ═══ TRY BEFORE YOU BUY ═══ */}
        <Card padding="0">
          <div style={{
            background: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 40%, #0ea5e9 100%)",
            borderRadius: 12, padding: "16px 20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(255,255,255,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
              }}>✨</div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text as="h2" variant="headingSm"><span style={{ color: "white" }}>Try Before You Buy</span></Text>
                  <Badge tone="info">24h Free</Badge>
                </div>
                <Text as="p" variant="bodySm"><span style={{ color: "rgba(255,255,255,0.8)" }}>Preview any section in a demo theme</span></Text>
              </div>
              <Button size="slim" onClick={() => navigate("/app/explore")}>Browse Sections</Button>
            </div>
          </div>
        </Card>

        {/* ═══ MY SECTIONS ═══ */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h2" variant="headingMd">My Sections</Text>
                <Badge>{`${totalOwned} owned`}</Badge>
              </InlineStack>
              <Button variant="plain" onClick={() => navigate("/app/my-sections")}>View all →</Button>
            </InlineStack>
            {sections.length === 0 ? (
              <Box padding="400">
                <BlockStack gap="300" inlineAlign="center">
                  <Text as="p" variant="bodySm" tone="subdued">You don't own any sections yet.</Text>
                  <Button url="/app/explore" variant="primary">Explore Sections</Button>
                </BlockStack>
              </Box>
            ) : (
              <BlockStack gap="0">
                {(sections as OwnedSection[]).slice(0, 5).map((section, index) => (
                  <div key={section.id}>
                    {index > 0 && <Divider />}
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", cursor: "pointer" }}
                      onClick={() => navigate(`/app/section?id=${section.id}`)}
                      onKeyDown={() => {}} role="button" tabIndex={0}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: `linear-gradient(135deg, ${section.previewColor} 0%, ${section.previewColor}99 100%)`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Text as="span" variant="bodySm"><span style={{ color: "white", fontSize: 16 }}>{section.name.charAt(0)}</span></Text>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">{section.name}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">{section.category} · v{section.version}</Text>
                      </div>
                      <Badge tone="success">Owned</Badge>
                    </div>
                  </div>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Card>

        {/* ═══ IMPROVE SCORE ═══ */}
        {(missingCritical.length > 0 || missingHigh.length > 0) && !isNewUser && (
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="200" blockAlign="center">
                <span style={{ fontSize: 18 }}>💡</span>
                <Text as="h2" variant="headingMd">Improve Your Score</Text>
              </InlineStack>
              <div className="sh-tips">
                {[...missingCritical, ...missingHigh].slice(0, 4).map((item) => (
                  <div key={item.key} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px", background: "#fef9f0", borderRadius: 10,
                    border: "1px solid #fde68a", cursor: "pointer",
                  }} onClick={() => navigate("/app/explore")} onKeyDown={() => {}} role="button" tabIndex={0}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <Text as="p" variant="bodySm" fontWeight="semibold">{item.label}</Text>
                  </div>
                ))}
              </div>
              <Button variant="plain" onClick={() => navigate("/app/analyzer")}>View full analysis →</Button>
            </BlockStack>
          </Card>
        )}

        {/* ═══ PREMIUM UPGRADE CTA ═══ */}
        {!isPremium && (
          <Card padding="0">
            <div style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #8b5cf6 100%)",
              borderRadius: 12, padding: "20px 24px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 28 }}>👑</span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Text as="h2" variant="headingMd"><span style={{ color: "white" }}>Unlock All Sections</span></Text>
                  <Text as="p" variant="bodySm"><span style={{ color: "rgba(255,255,255,0.8)" }}>Get every section with Premium – €8/mo, cancel anytime</span></Text>
                </div>
                <Button variant="primary" onClick={() => navigate("/app/premium")}>Upgrade to Premium →</Button>
              </div>
            </div>
          </Card>
        )}

        {/* ═══ FOOTER ═══ */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", padding: "4px 0 12px" }}>
          <Button url="/app/explore" variant="primary" size="slim">Explore Sections</Button>
          <Button url="/app/premium" size="slim">Premium</Button>
          <Button url="/app/help" size="slim">Help</Button>
          <Button url="/app/suggest" variant="plain" size="slim">Suggest a Feature</Button>
        </div>

      </BlockStack>
      </div>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
