import { useState, useEffect } from "react";
import { useNavigate, useLoaderData, useFetcher } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllSections } from "../lib/sections.server";
import type { SectionMeta } from "../lib/sections.server";
import { Page, BlockStack, Banner } from "@shopify/polaris";

/* ── Bundle definitions ─────────────────────────────────── */
const BUNDLES = [
  {
    id: "scroll-triggered",
    name: "Scroll Triggered Pack",
    icon: "⬇️",
    color: "#0d9488",
    gradientFrom: "#0d9488",
    gradientTo: "#14b8a6",
    description: "13 scroll-driven animation sections — parallax, fade, split reveal, storytelling, zoom, velocity text, and more. Create stunning scroll experiences.",
    sectionIds: [
      "scroll-card-cascade", "scroll-card-stack", "scroll-counter-reveal",
      "scroll-fade-layers", "scroll-highlight-text", "scroll-morph-gallery",
      "scroll-parallax-grid", "scroll-pin-timeline", "scroll-split-reveal",
      "scroll-storyteller", "scroll-text-magnify", "scroll-velocity-text",
      "scroll-zoom-reveal",
    ],
    bundlePrice: 35,
  },
  {
    id: "video-suite",
    name: "Video Suite",
    icon: "🎬",
    color: "#ec4899",
    gradientFrom: "#ec4899",
    gradientTo: "#f472b6",
    description: "6 premium video sections — cinema hero, feature reel, marquee loop, showcase reel, card gallery, and split player. Bring your brand to life.",
    sectionIds: [
      "video-card-gallery", "video-cinema-hero", "video-feature-reel",
      "video-marquee-loop", "video-showcase-reel", "video-split-player",
    ],
    bundlePrice: 29,
  },
  {
    id: "before-after",
    name: "Before & After Collection",
    icon: "🔄",
    color: "#f97316",
    gradientFrom: "#f97316",
    gradientTo: "#fb923c",
    description: "6 before/after sections — comparison slider, gallery, hotspots, morph cards, results slideshow, and timeline. Perfect for beauty, fitness, and lifestyle brands.",
    sectionIds: [
      "before-after-comparison", "before-after-gallery", "before-after-hotspots",
      "before-after-morph", "before-after-results", "before-after-timeline",
    ],
    bundlePrice: 19,
  },
  {
    id: "complete-library",
    name: "Complete Library",
    icon: "🏆",
    color: "#7c3aed",
    gradientFrom: "#7c3aed",
    gradientTo: "#a78bfa",
    description: "Every single paid section in the library — 120+ sections across all categories. The ultimate value deal for serious store builders.",
    sectionIds: [] as string[],
    bundlePrice: 99,
    isComplete: true,
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const sections = getAllSections();
  return { sections };
};

function tierLabel(section: SectionMeta): string {
  const tier = (section as any).tier;
  if (section.price.type === "free") return "Free";
  if (tier === "premium") return "Premium";
  if (tier === "advanced") return "Advanced";
  return "Basic";
}

function tierColor(section: SectionMeta): string {
  const tier = (section as any).tier;
  if (section.price.type === "free") return "#16a34a";
  if (tier === "premium") return "#7c3aed";
  if (tier === "advanced") return "#d97706";
  return "#2563eb";
}

export default function BundlesPage() {
  const { sections } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<string | null>(null);

  // Detect purchase callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchased") === "true") setPurchaseStatus("success");
    else if (params.get("purchase") === "declined") setPurchaseStatus("declined");
    else if (params.get("purchase") === "error") setPurchaseStatus("error");
    else if (params.get("purchase") === "already_done") setPurchaseStatus("already");
  }, []);

  // Redirect to Shopify payment confirmation when API returns URL
  useEffect(() => {
    const data = fetcher.data as any;
    if (data?.confirmationUrl) {
      try {
        window.open(data.confirmationUrl, "_top");
      } catch {
        window.location.assign(data.confirmationUrl);
      }
    }
  }, [fetcher.data]);

  const sectionMap = new Map<string, SectionMeta>();
  for (const s of sections) {
    sectionMap.set(s.id, s);
  }

  function getBundleSections(bundle: typeof BUNDLES[0]): SectionMeta[] {
    if ((bundle as any).isComplete) {
      return sections.filter((s) => s.price.type !== "free");
    }
    return bundle.sectionIds
      .map((id) => sectionMap.get(id))
      .filter(Boolean) as SectionMeta[];
  }

  function getRetailTotal(bundleSections: SectionMeta[]): number {
    return bundleSections.reduce((sum, s) => sum + (s.price.amount || 0), 0);
  }

  return (
    <Page title="Bundles & Pricing" subtitle="Save big with bundles or subscribe to Pro for unlimited access">
      <style>{`
        @keyframes bun-fade-up{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes bun-gradient{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes bun-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes bun-pulse{0%,100%{box-shadow:0 2px 20px rgba(124,58,237,0.1)}50%{box-shadow:0 8px 40px rgba(124,58,237,0.2)}}

        .bun-hero{
          position:relative;overflow:hidden;border-radius:20px;padding:36px 40px;
          background:linear-gradient(-45deg,#f5f3ff,#ede9fe,#ddd6fe,#c4b5fd);
          background-size:300% 300%;
          animation:bun-gradient 10s ease infinite, bun-pulse 5s ease-in-out infinite;
          margin-bottom:28px;
        }
        .bun-hero::before{
          content:'';position:absolute;inset:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.4) 50%,transparent 60%);
          background-size:200% 200%;animation:bun-shimmer 4s ease-in-out infinite;pointer-events:none;
        }

        .bun-pro-card{
          background:rgba(255,255,255,0.7);
          backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
          border:2px solid rgba(124,58,237,0.2);
          border-radius:16px;padding:28px 32px;
          box-shadow:0 4px 20px rgba(124,58,237,0.08);
          margin-bottom:32px;
          animation:bun-fade-up .5s ease both;
        }

        .bun-card{
          position:relative;overflow:hidden;
          background:rgba(255,255,255,0.75);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(226,232,240,0.6);
          border-radius:18px;
          transition:all .3s cubic-bezier(.4,0,.2,1);
          box-shadow:0 2px 12px rgba(0,0,0,0.04);
          animation:bun-fade-up .5s ease both;
        }
        .bun-card:hover{border-color:rgba(99,102,241,0.3);box-shadow:0 8px 32px rgba(0,0,0,0.08);transform:translateY(-2px)}

        .bun-card-header{
          padding:28px 28px 0;display:flex;align-items:flex-start;gap:16px;
        }

        .bun-card-icon{
          width:52px;height:52px;border-radius:14px;
          display:flex;align-items:center;justify-content:center;
          font-size:26px;flex-shrink:0;
          box-shadow:0 4px 16px rgba(0,0,0,0.1);
        }

        .bun-card-body{padding:16px 28px 24px}

        .bun-pricing-row{
          display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;
          margin-top:4px;
        }

        .bun-bundle-price{font-size:36px;font-weight:900;letter-spacing:-0.02em}
        .bun-retail-price{font-size:15px;color:#94a3b8;text-decoration:line-through}
        .bun-save-badge{
          display:inline-flex;padding:4px 10px;border-radius:8px;
          font-size:12px;font-weight:700;letter-spacing:.3px;
          background:rgba(220,252,231,0.8);color:#166534;
        }

        .bun-sections-toggle{
          width:100%;background:none;border:none;
          padding:14px 28px;cursor:pointer;
          display:flex;align-items:center;justify-content:space-between;
          font-size:13px;font-weight:600;color:#6366f1;
          border-top:1px solid rgba(226,232,240,0.5);
          transition:background .15s;
        }
        .bun-sections-toggle:hover{background:rgba(238,242,255,0.5)}

        .bun-sections-list{
          padding:0 28px 24px;
          display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;
        }

        .bun-section-item{
          display:flex;align-items:center;gap:10px;
          padding:8px 12px;border-radius:10px;
          background:rgba(248,250,252,0.6);
          border:1px solid rgba(226,232,240,0.4);
          transition:all .15s;cursor:pointer;
        }
        .bun-section-item:hover{background:rgba(238,242,255,0.6);border-color:rgba(199,210,254,0.6);transform:translateY(-1px)}

        .bun-section-tier{
          display:inline-flex;padding:2px 7px;border-radius:6px;
          font-size:9px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;
        }

        .bun-buy-btn{
          display:inline-flex;align-items:center;gap:8px;
          padding:12px 28px;border-radius:12px;
          border:none;cursor:pointer;font-size:14px;font-weight:700;
          color:#fff;transition:all .25s cubic-bezier(.4,0,.2,1);
          box-shadow:0 4px 16px rgba(0,0,0,0.15);
          letter-spacing:.3px;
        }
        .bun-buy-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.2)}

        .bun-pro-btn{
          display:inline-flex;align-items:center;gap:8px;
          padding:12px 28px;border-radius:12px;
          border:none;cursor:pointer;font-size:14px;font-weight:700;
          color:#fff;
          background:linear-gradient(135deg,#7c3aed,#a78bfa);
          transition:all .25s cubic-bezier(.4,0,.2,1);
          box-shadow:0 4px 16px rgba(124,58,237,0.25);
        }
        .bun-pro-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,58,237,0.35)}

        .bun-compare{
          display:grid;grid-template-columns:repeat(3,1fr);gap:2px;
          border-radius:14px;overflow:hidden;margin:24px 0 4px;
          box-shadow:0 2px 12px rgba(0,0,0,0.06);
          animation:bun-fade-up .5s ease both;animation-delay:.15s;
        }
        .bun-compare-col{background:rgba(255,255,255,0.8);padding:20px 16px;text-align:center}
        .bun-compare-col.highlight{background:rgba(237,233,254,0.6);border-top:3px solid #7c3aed}
        .bun-compare-tier{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px}
        .bun-compare-price{font-size:28px;font-weight:900;margin-bottom:2px;letter-spacing:-0.02em}
        .bun-compare-unit{font-size:11px;color:#94a3b8;margin-bottom:12px}
        .bun-compare-feat{font-size:12px;color:#64748b;padding:6px 0;border-top:1px solid rgba(226,232,240,0.4)}
        .bun-compare-feat .yes{color:#16a34a;font-weight:600}
        .bun-compare-feat .no{color:#cbd5e1}

        /* Mobile Responsiveness */
        @media(max-width:640px){
          .bun-hero{padding:20px 16px;border-radius:14px}
          .bun-pro-card{padding:20px 16px}
          .bun-card-header{padding:16px 16px 0}
          .bun-card-body{padding:12px 16px 20px}
          .bun-sections-toggle{padding:12px 16px}
          .bun-sections-list{padding:0 16px 16px}
        }
      `}</style>

      <BlockStack gap="400">

        {/* Purchase callback banners */}
        {purchaseStatus === "success" && (
          <Banner title="Bundle purchased! 🎉" tone="success" onDismiss={() => setPurchaseStatus(null)}>
            <p>All sections in the bundle are now unlocked. Go to any section and click &quot;Install to Theme&quot;.</p>
          </Banner>
        )}
        {purchaseStatus === "declined" && (
          <Banner title="Purchase cancelled" tone="warning" onDismiss={() => setPurchaseStatus(null)}>
            <p>The payment was not completed. You can try again anytime.</p>
          </Banner>
        )}
        {purchaseStatus === "error" && (
          <Banner title="Something went wrong" tone="critical" onDismiss={() => setPurchaseStatus(null)}>
            <p>We couldn&apos;t verify your purchase. Please try again or contact support.</p>
          </Banner>
        )}
        {purchaseStatus === "already" && (
          <Banner title="Already purchased" tone="info" onDismiss={() => setPurchaseStatus(null)}>
            <p>All sections in this bundle are already unlocked.</p>
          </Banner>
        )}

        {/* ─── Hero ─── */}
        <div className="bun-hero">
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>📦</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#1e1b4b", letterSpacing: "-0.02em", marginBottom: 6 }}>
              Save up to 80% with Bundles
            </div>
            <div style={{ fontSize: 14, color: "#64748b", maxWidth: 500, lineHeight: 1.6 }}>
              Buy individual sections, grab a category bundle, or subscribe to Pro for unlimited access to all current and future sections.
            </div>
          </div>
        </div>

        {/* ─── Pricing Tiers Comparison ─── */}
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1e1b4b", marginBottom: -8 }}>Individual Pricing</div>
        <div className="bun-compare">
          <div className="bun-compare-col">
            <div className="bun-compare-tier" style={{ color: "#2563eb" }}>🟢 Basic</div>
            <div className="bun-compare-price" style={{ color: "#2563eb" }}>€5</div>
            <div className="bun-compare-unit">per section</div>
            <div className="bun-compare-feat">Standard layouts</div>
            <div className="bun-compare-feat">Simple interactions</div>
            <div className="bun-compare-feat">Headers, Footers, Cards</div>
            <div className="bun-compare-feat"><span className="yes">✓</span> Mobile Responsive</div>
            <div className="bun-compare-feat"><span className="yes">✓</span> OS 2.0 Ready</div>
          </div>
          <div className="bun-compare-col">
            <div className="bun-compare-tier" style={{ color: "#d97706" }}>🔵 Advanced</div>
            <div className="bun-compare-price" style={{ color: "#d97706" }}>€10</div>
            <div className="bun-compare-unit">per section</div>
            <div className="bun-compare-feat">Rich interactions</div>
            <div className="bun-compare-feat">FAQs, Galleries, Sliders</div>
            <div className="bun-compare-feat">Before/After Basic</div>
            <div className="bun-compare-feat"><span className="yes">✓</span> Mobile Responsive</div>
            <div className="bun-compare-feat"><span className="yes">✓</span> OS 2.0 Ready</div>
          </div>
          <div className="bun-compare-col highlight">
            <div className="bun-compare-tier" style={{ color: "#7c3aed" }}>🟣 Premium</div>
            <div className="bun-compare-price" style={{ color: "#7c3aed" }}>€15</div>
            <div className="bun-compare-unit">per section</div>
            <div className="bun-compare-feat">Experimental animations</div>
            <div className="bun-compare-feat">Scroll Triggered, 3D, Parallax</div>
            <div className="bun-compare-feat">Complex video & collections</div>
            <div className="bun-compare-feat"><span className="yes">✓</span> Mobile Responsive</div>
            <div className="bun-compare-feat"><span className="yes">✓</span> OS 2.0 Ready</div>
          </div>
        </div>

        {/* ─── Pro Subscription ─── */}
        <div className="bun-pro-card">
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            <span style={{ fontSize: 36 }}>💎</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#1e1b4b", letterSpacing: "-0.02em" }}>
                Pro Subscription
              </div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                Unlimited access to all {sections.length}+ sections — current and future
              </div>
            </div>
          </div>
          <div className="bun-pricing-row" style={{ marginBottom: 16 }}>
            <span className="bun-bundle-price" style={{ color: "#7c3aed" }}>€19</span>
            <span style={{ fontSize: 15, color: "#94a3b8" }}>/month</span>
            <span className="bun-save-badge" style={{ background: "rgba(237,233,254,0.8)", color: "#5b21b6" }}>
              Best Value
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {[
              "✨ All sections included",
              "🆕 New sections weekly",
              "⚡ Cancel anytime",
              "🛡️ Priority support",
            ].map((feat) => (
              <span key={feat} style={{
                display: "inline-flex", padding: "5px 12px", borderRadius: 8,
                background: "rgba(237,233,254,0.4)", fontSize: 12, fontWeight: 600,
                color: "#5b21b6",
              }}>{feat}</span>
            ))}
          </div>
          <button className="bun-pro-btn" onClick={() => navigate("/app/premium")}>
            Subscribe to Pro →
          </button>
        </div>

        {/* ─── Bundles ─── */}
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1e1b4b", marginBottom: -4 }}>Category Bundles</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {BUNDLES.map((bundle, idx) => {
            const bundleSections = getBundleSections(bundle);
            const retailTotal = getRetailTotal(bundleSections);
            const savePct = retailTotal > 0 ? Math.round((1 - bundle.bundlePrice / retailTotal) * 100) : 0;
            const isExpanded = expandedBundle === bundle.id;

            return (
              <div key={bundle.id} className="bun-card" style={{ animationDelay: `${idx * 0.08}s` }}>
                <div className="bun-card-header">
                  <div className="bun-card-icon" style={{ background: `linear-gradient(135deg, ${bundle.gradientFrom}, ${bundle.gradientTo})` }}>
                    {bundle.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#1e1b4b", letterSpacing: "-0.01em" }}>
                      {bundle.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                      {bundleSections.length} Section{bundleSections.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <div className="bun-card-body">
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55, marginBottom: 16 }}>
                    {bundle.description}
                  </div>

                  <div className="bun-pricing-row">
                    <span className="bun-bundle-price" style={{ color: bundle.color }}>€{bundle.bundlePrice}</span>
                    {retailTotal > 0 && (
                      <span className="bun-retail-price">€{retailTotal}</span>
                    )}
                    {savePct > 0 && (
                      <span className="bun-save-badge">Save {savePct}%</span>
                    )}
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <button
                      className="bun-buy-btn"
                      style={{ background: `linear-gradient(135deg, ${bundle.gradientFrom}, ${bundle.gradientTo})` }}
                      onClick={() => {
                        const ids = getBundleSections(bundle).map((s) => s.id);
                        fetcher.submit(
                          { sections: ids, discount: 0, total: bundle.bundlePrice },
                          { method: "POST", action: "/app/api/purchase-bundle", encType: "application/json" },
                        );
                      }}
                      disabled={fetcher.state !== "idle"}
                    >
                      {fetcher.state !== "idle" ? "Redirecting..." : "📦 Buy Bundle"}
                    </button>
                  </div>
                </div>

                <button
                  className="bun-sections-toggle"
                  onClick={() => setExpandedBundle(isExpanded ? null : bundle.id)}
                >
                  <span>{isExpanded ? "Hide" : "Show"} included sections</span>
                  <span style={{ fontSize: 16 }}>{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded && (
                  <div className="bun-sections-list">
                    {bundleSections.map((section) => (
                      <div
                        key={section.id}
                        className="bun-section-item"
                        onClick={() => navigate(`/app/section?id=${section.id}`)}
                      >
                        <span className="bun-section-tier" style={{
                          background: `${tierColor(section)}15`,
                          color: tierColor(section),
                        }}>
                          {tierLabel(section)}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#1e1b4b", flex: 1 }}>
                          {section.name.replace(/^SIQ - /, "")}
                        </span>
                        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                          €{section.price.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Bottom CTA ─── */}
        <div style={{
          textAlign: "center",
          padding: "32px 20px",
          background: "rgba(248,250,252,0.6)",
          borderRadius: 16,
          border: "1px solid rgba(226,232,240,0.4)",
          marginTop: 8,
        }}>
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 8 }}>
            Or browse individual sections and buy exactly what you need.
          </div>
          <button
            onClick={() => navigate("/app/explore")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 24px", borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              color: "#fff", fontWeight: 700, fontSize: 14,
              border: "none", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(99,102,241,0.25)",
              transition: "all .2s",
            }}
          >
            ✨ Explore All Sections
          </button>
        </div>

      </BlockStack>
    </Page>
  );
}
