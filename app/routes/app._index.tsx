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
    analyzedAt = savedAnalysis.analyzedAt ? savedAnalysis.analyzedAt.toISOString() : null;
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
        .sh-two-col{display:grid;grid-template-columns:1fr;gap:12px;align-items:stretch}
        @media(min-width:640px){.sh-two-col{grid-template-columns:3fr 2fr;gap:16px}}
        .sh-actions{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
        @media(min-width:640px){.sh-actions{grid-template-columns:repeat(5,1fr);gap:12px}}
        .sh-tips{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        @media(min-width:640px){.sh-tips{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}}
        .sh-discount-pills{display:flex;gap:8px;flex-wrap:wrap}
        .sh-discount-pill{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 14px;text-align:center;flex:1;min-width:80px}

        @keyframes sh-gradient-move{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes sh-pulse-soft{0%,100%{box-shadow:0 2px 16px rgba(99,102,241,0.08)}50%{box-shadow:0 4px 28px rgba(99,102,241,0.16)}}
        @keyframes sh-score-pop{0%{transform:scale(0.8);opacity:0}100%{transform:scale(1);opacity:1}}
        @keyframes sh-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes sh-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes sh-ring-fill{0%{stroke-dashoffset:251}100%{stroke-dashoffset:var(--sh-ring-target)}}
        @keyframes sh-fade-up{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes sh-icon-bounce{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}

        .sh-score-card{
          position:relative;overflow:hidden;border-radius:16px;padding:24px;
          background:linear-gradient(-45deg,#eef2ff,#e0e7ff,#c7d2fe,#ddd6fe);
          background-size:300% 300%;
          animation:sh-gradient-move 10s ease infinite, sh-pulse-soft 5s ease-in-out infinite;
          min-height:180px;
        }
        .sh-score-card::before{
          content:'';position:absolute;top:-40%;right:-40%;width:80%;height:80%;
          background:radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%);
          pointer-events:none;
        }
        .sh-score-card::after{
          content:'';position:absolute;bottom:-30%;left:-20%;width:60%;height:60%;
          background:radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%);
          pointer-events:none;
        }

        .sh-premium-card{
          position:relative;overflow:hidden;border-radius:16px;padding:24px;
          background:linear-gradient(-45deg,#ecfdf5,#d1fae5,#a7f3d0,#bbf7d0);
          background-size:300% 300%;
          animation:sh-gradient-move 8s ease infinite;
          min-height:180px;
          display:flex;flex-direction:column;justify-content:center;
        }
        .sh-premium-card::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.4) 50%,transparent 60%);
          background-size:200% 200%;
          animation:sh-shimmer 4s ease-in-out infinite;
          pointer-events:none;
        }
        .sh-premium-card::after{
          content:'';position:absolute;top:-40%;right:-20%;width:60%;height:80%;
          background:radial-gradient(circle,rgba(52,211,153,0.12) 0%,transparent 70%);
          pointer-events:none;
        }
        .sh-premium-upsell{
          position:relative;overflow:hidden;border-radius:16px;padding:24px;
          background:linear-gradient(-45deg,#4c1d95,#5b21b6,#7c3aed,#8b5cf6);
          background-size:300% 300%;
          animation:sh-gradient-move 8s ease infinite;
          min-height:180px;
          display:flex;flex-direction:column;justify-content:space-between;
        }
        .sh-premium-upsell::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);
          background-size:200% 200%;
          animation:sh-shimmer 4s ease-in-out infinite;
          pointer-events:none;
        }
        .sh-premium-upsell::after{
          content:'';position:absolute;top:-40%;right:-20%;width:60%;height:80%;
          background:radial-gradient(circle,rgba(167,139,250,0.18) 0%,transparent 70%);
          pointer-events:none;
        }

        .sh-glass-stat{
          background:rgba(255,255,255,0.55);
          backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
          border:1px solid rgba(255,255,255,0.7);
          border-radius:12px;padding:12px 14px;text-align:center;
          transition:all .25s cubic-bezier(.4,0,.2,1);
          box-shadow:0 1px 4px rgba(0,0,0,0.04);
        }
        .sh-glass-stat:hover{background:rgba(255,255,255,0.75);transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.08)}

        .sh-glass-inner{
          background:rgba(255,255,255,0.65);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,0.8);
          border-radius:14px;padding:18px 20px;
          box-shadow:0 2px 12px rgba(0,0,0,0.04);
        }

        .sh-score-ring{animation:sh-score-pop .6s cubic-bezier(.68,-.55,.27,1.55) both;animation-delay:.2s}
        .sh-score-ring circle.sh-ring-progress{
          animation:sh-ring-fill 1.5s ease-out both;animation-delay:.5s;
          stroke-linecap:round;
        }

        .sh-badge-glow{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
        .sh-badge-critical{background:rgba(239,68,68,0.12);color:#b91c1c;border:1px solid rgba(239,68,68,0.25)}
        .sh-badge-warning{background:rgba(245,158,11,0.12);color:#92400e;border:1px solid rgba(245,158,11,0.25)}
        .sh-badge-success{background:rgba(22,163,74,0.12);color:#15803d;border:1px solid rgba(22,163,74,0.25)}

        .sh-crown{display:inline-block;animation:sh-float 3s ease-in-out infinite;font-size:28px}

        .sh-action-card{
          background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:14px 10px;
          cursor:pointer;text-align:center;
          transition:all .25s cubic-bezier(.4,0,.2,1);
          animation:sh-fade-up .5s ease both;
        }
        .sh-action-card:nth-child(1){animation-delay:.05s}
        .sh-action-card:nth-child(2){animation-delay:.1s}
        .sh-action-card:nth-child(3){animation-delay:.15s}
        .sh-action-card:nth-child(4){animation-delay:.2s}
        .sh-action-card:nth-child(5){animation-delay:.25s}
        .sh-action-card:hover{
          box-shadow:0 8px 24px rgba(99,102,241,.1);
          border-color:#c7d2fe;
          transform:translateY(-4px);
        }
        .sh-action-card:hover .sh-action-icon{animation:sh-icon-bounce .4s ease}

        .sh-action-icon{font-size:26px;transition:transform .2s ease;display:inline-block}

        .sh-try-banner{
          position:relative;overflow:hidden;border-radius:12px;padding:16px 20px;
          background:linear-gradient(-45deg,#eff6ff,#dbeafe,#bfdbfe,#dbeafe);
          background-size:300% 300%;
          animation:sh-gradient-move 8s ease infinite;
          transition:all .25s ease;
        }
        .sh-try-banner:hover{box-shadow:0 6px 20px rgba(59,130,246,.12);transform:translateY(-2px)}
        .sh-try-banner::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.5) 50%,transparent 60%);
          background-size:200% 200%;animation:sh-shimmer 5s ease-in-out infinite;pointer-events:none;
        }

        .sh-section-row{
          display:flex;align-items:center;gap:12px;padding:12px 0;cursor:pointer;
          transition:all .2s ease;border-radius:8px;margin:0 -8px;padding-left:8px;padding-right:8px;
        }
        .sh-section-row:hover{background:#f8fafc;transform:translateX(4px)}

        .sh-tip-card{
          display:flex;align-items:center;gap:8px;
          padding:8px 12px;background:#fffbeb;border-radius:10px;
          border:1px solid #fde68a;cursor:pointer;
          transition:all .2s ease;
        }
        .sh-tip-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(245,158,11,.1);background:#fef3c7}

        .sh-upgrade-banner{
          position:relative;overflow:hidden;border-radius:12px;padding:20px 24px;
          background:linear-gradient(-45deg,#f5f3ff,#ede9fe,#ddd6fe,#e9d5ff);
          background-size:300% 300%;
          animation:sh-gradient-move 8s ease infinite;
          transition:all .25s ease;
        }
        .sh-upgrade-banner:hover{box-shadow:0 6px 20px rgba(139,92,246,.12);transform:translateY(-2px)}
        .sh-upgrade-banner::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.4) 50%,transparent 60%);
          background-size:200% 200%;animation:sh-shimmer 4s ease-in-out infinite;pointer-events:none;
        }
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
            {/* ── STORE SCORE ── */}
            <div className="sh-score-card" onClick={() => navigate("/app/analyzer")} onKeyDown={() => {}} role="button" tabIndex={0} style={{ cursor: "pointer" }}>
              <div style={{ position: "relative", zIndex: 1 }}>
                {!hasAnalysis ? (
                  <div className="sh-glass-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "24px 20px" }}>
                    <span style={{ fontSize: 40 }}>📊</span>
                    <span style={{ color: "#475569", fontSize: 14 }}>Run your first analysis to see your score</span>
                    <Button variant="primary" onClick={() => navigate("/app/analyzer")}>Analyze Now</Button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <span style={{ color: "#4f46e5", fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.2 }}>Store Score</span>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                          {analyzedAt ? `Updated ${formatAnalyzedAt(analyzedAt)}` : ""}
                        </div>
                      </div>
                      <span className={`sh-badge-glow ${storeScore >= 80 ? 'sh-badge-success' : storeScore >= 50 ? 'sh-badge-warning' : 'sh-badge-critical'}`}>
                        {scoreLabel}
                      </span>
                    </div>

                    <div className="sh-glass-inner">
                      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div className="sh-score-ring" style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
                          <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: "rotate(-90deg)" }}>
                            <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="7" />
                            <circle
                              className="sh-ring-progress"
                              cx="45" cy="45" r="38" fill="none"
                              stroke={storeScore >= 80 ? "#22c55e" : storeScore >= 50 ? "#eab308" : "#ef4444"}
                              strokeWidth="7"
                              strokeDasharray="251"
                              strokeDashoffset="251"
                              style={{ "--sh-ring-target": `${251 - (storeScore / 100) * 251}` } as React.CSSProperties}
                            />
                          </svg>
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 28, fontWeight: 800, color: "#1e1b4b", lineHeight: 1 }}>{storeScore}</span>
                            <span style={{ fontSize: 10, color: "#6b7280" }}>/ 100</span>
                          </div>
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ color: "#334155", fontSize: 14, fontWeight: 500, marginBottom: 10 }}>
                            {activeCount} of {totalTypes} pages optimized
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {missingCritical.length > 0 && (
                              <span className="sh-badge-glow sh-badge-critical">🔴 {missingCritical.length} critical</span>
                            )}
                            {missingHigh.length > 0 && (
                              <span className="sh-badge-glow sh-badge-warning">🟡 {missingHigh.length} high</span>
                            )}
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <Button size="slim" variant="primary" onClick={() => navigate("/app/analyzer")}>
                              🔄 Re-analyze
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {!isPremium ? (
              <div className="sh-premium-upsell" onClick={() => navigate("/app/premium")} onKeyDown={() => {}} role="button" tabIndex={0} style={{ cursor: "pointer" }}>
                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", gap: 14 }}>
                  <div>
                    <InlineStack gap="200" blockAlign="center" wrap>
                      <span style={{ fontSize: 24 }}>👑</span>
                      <Text as="h2" variant="headingMd"><span style={{ color: "white" }}>Premium</span></Text>
                      <span style={{
                        background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)",
                        color: "white", fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                      }}>€8/mo</span>
                    </InlineStack>
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                      {["📦 All sections included", "🔓 All Premium Blocks", "🆕 New sections monthly", "⚡ Priority support"].map((t) => (
                        <Text key={t} as="p" variant="bodySm"><span style={{ color: "rgba(255,255,255,0.9)" }}>{t}</span></Text>
                      ))}
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate("/app/premium"); }}
                      style={{
                        background: "white", color: "#5b21b6", border: "none", borderRadius: 10,
                        padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
                        transition: "all .2s ease", display: "inline-flex", alignItems: "center", gap: 6,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = ""; }}
                    >
                      Upgrade → 
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sh-premium-card">
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span className="sh-crown">👑</span>
                    <div>
                      <span style={{ color: "#047857", fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.2 }}>Premium</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span style={{ color: "#1e293b", fontSize: 16, fontWeight: 700 }}>Active</span>
                        <span className="sh-badge-glow sh-badge-success">✓</span>
                      </div>
                    </div>
                  </div>
                  <div className="sh-glass-inner" style={{ padding: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[
                        { label: "Owned", value: `${totalOwned}`, icon: "📦" },
                        { label: "Available", value: `${totalAvailable}`, icon: "🔍" },
                        { label: "Free/mo", value: "5", icon: "🎁" },
                        { label: "Blocks", value: "All 16", icon: "⚡" },
                      ].map((stat) => (
                        <div key={stat.label} className="sh-glass-stat">
                          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{stat.icon} {stat.label}</div>
                          <div style={{ color: "#047857", fontSize: 20, fontWeight: 700 }}>{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
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
                <span className="sh-action-icon">{a.icon}</span>
                <Text as="p" variant="headingSm">{a.title}</Text>
                <Text as="p" variant="bodySm" tone="subdued">{a.subtitle}</Text>
              </BlockStack>
            </div>
          ))}
        </div>

        {/* ═══ TRY BEFORE YOU BUY ═══ */}
        <div className="sh-try-banner" onClick={() => navigate("/app/explore")} onKeyDown={() => {}} role="button" tabIndex={0} style={{ cursor: "pointer" }}>
          <div className="sh-glass-inner" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "rgba(59,130,246,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}>✨</div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text as="h2" variant="headingSm">Try Before You Buy</Text>
                <Badge tone="info">24h Free</Badge>
              </div>
              <Text as="p" variant="bodySm" tone="subdued">Preview any section in a demo theme</Text>
            </div>
            <Button size="slim" onClick={() => navigate("/app/explore")}>Browse Sections</Button>
          </div>
        </div>

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
                      className="sh-section-row"
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
                  <div key={item.key} className="sh-tip-card"
                    onClick={() => navigate("/app/explore")} onKeyDown={() => {}} role="button" tabIndex={0}>
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
          <div className="sh-upgrade-banner" onClick={() => navigate("/app/premium")} onKeyDown={() => {}} role="button" tabIndex={0} style={{ cursor: "pointer" }}>
            <div className="sh-glass-inner" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span className="sh-crown">👑</span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Text as="h2" variant="headingMd">Unlock All Sections</Text>
                <Text as="p" variant="bodySm" tone="subdued">Get every section with Premium – €8/mo, cancel anytime</Text>
              </div>
              <Button variant="primary" onClick={() => navigate("/app/premium")}>Upgrade to Premium →</Button>
            </div>
          </div>
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
