import { useState, useMemo } from "react";
import { useNavigate, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllSections } from "../lib/sections.server";
import type { SectionMeta, SectionPreview } from "../lib/sections.server";
import {
  Page,
  BlockStack,
  TextField,
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
  { id: "before and after", label: "Before & After", icon: "🔄", color: "#f97316", textColor: "#fff" },
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
  { id: "Premium", label: "Premium", icon: "💎", color: "#7c3aed", textColor: "#fff" },
  { id: "Pop-up", label: "Pop-up", icon: "🎉", color: "#e11d48", textColor: "#fff" },
  { id: "Footer", label: "Footer", icon: "📞", color: "#64748b", textColor: "#fff" },
  { id: "Scroll Triggered", label: "Scroll Triggered", icon: "⬇️", color: "#0d9488", textColor: "#fff" },
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
      className={`ex-cat-btn ${isActive ? "active" : ""}`}
      style={{
        "--cat-color": category.color,
        "--cat-text": category.textColor,
      } as React.CSSProperties}
    >
      <span style={{ fontSize: 15 }}>{category.icon}</span>
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
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
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
          <span style={{ color: "white", fontSize: 16, fontWeight: 600 }}>{section.name}</span>
        </div>
      )}

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
  const [tryingSection, setTryingSection] = useState<string | null>(null);
  const [tryEditorUrl, setTryEditorUrl] = useState<string | null>(null);
  const [tryErrorMsg, setTryErrorMsg] = useState<string | null>(null);

  const handleTryFree = async (sectionId: string) => {
    setTryingSection(sectionId);
    setTryEditorUrl(null);
    setTryErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("sectionId", sectionId);
      const res = await fetch("/app/api/try-section", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.editorUrl) {
        setTryEditorUrl(data.editorUrl);
      } else {
        setTryErrorMsg(data.error || "Could not start preview");
      }
    } catch {
      setTryErrorMsg("Request failed");
    } finally {
      setTryingSection(null);
    }
  };

  const filteredSections = useMemo(() => {
    let list = [...sections];

    if (selectedCategory === "free") {
      list = list.filter((s) => s.price.type === "free");
    } else if (selectedCategory !== "all") {
      list = list.filter((s) => {
        const cats = Array.isArray(s.category) ? s.category : [s.category];
        return cats.some((c: string) => c.toLowerCase() === selectedCategory.toLowerCase());
      });
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
    <Page
      title="Explore Sections"
      subtitle="Discover professional sections for your store"
    >
      <style>{`
        @keyframes ex-gradient-move{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes ex-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes ex-fade-up{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes ex-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes ex-pulse{0%,100%{box-shadow:0 2px 16px rgba(99,102,241,0.06)}50%{box-shadow:0 6px 28px rgba(99,102,241,0.14)}}

        .ex-hero{
          position:relative;overflow:hidden;border-radius:18px;padding:32px 36px;
          background:linear-gradient(-45deg,#eef2ff,#e0e7ff,#c7d2fe,#ddd6fe);
          background-size:300% 300%;
          animation:ex-gradient-move 10s ease infinite, ex-pulse 5s ease-in-out infinite;
        }
        .ex-hero::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.45) 50%,transparent 60%);
          background-size:200% 200%;animation:ex-shimmer 4s ease-in-out infinite;pointer-events:none;
        }
        .ex-hero::after{
          content:'';position:absolute;top:-40%;right:-20%;width:70%;height:80%;
          background:radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%);pointer-events:none;
        }

        .ex-glass{
          background:rgba(255,255,255,0.65);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,0.8);
          border-radius:14px;padding:18px 22px;
          box-shadow:0 2px 12px rgba(0,0,0,0.04);
        }

        .ex-search-wrap{
          background:rgba(255,255,255,0.6);
          backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
          border:1px solid rgba(226,232,240,0.5);
          border-radius:16px;padding:20px 22px;
          box-shadow:0 2px 12px rgba(0,0,0,0.04);
          animation:ex-fade-up .4s cubic-bezier(.4,0,.2,1) both;
          animation-delay:.1s;
        }

        .ex-cat-btn{
          display:inline-flex;align-items:center;gap:6px;
          padding:8px 14px;border-radius:20px;
          border:2px solid rgba(226,232,240,0.6);
          background:rgba(255,255,255,0.6);
          backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
          color:#374151;font-size:13px;font-weight:500;
          cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1);
          white-space:nowrap;
        }
        .ex-cat-btn:hover{border-color:var(--cat-color);background:rgba(255,255,255,0.85);transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.06)}
        .ex-cat-btn.active{border-color:var(--cat-color);background:var(--cat-color);color:var(--cat-text);font-weight:600;box-shadow:0 4px 16px color-mix(in srgb,var(--cat-color) 30%,transparent)}

        .category-scroll-container::-webkit-scrollbar{display:none}

        .ex-section-card{
          display:flex;flex-direction:column;
          background:rgba(255,255,255,0.7);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(226,232,240,0.5);
          border-radius:16px;overflow:hidden;
          transition:all .3s cubic-bezier(.4,0,.2,1);
          box-shadow:0 1px 4px rgba(0,0,0,0.04);
          animation:ex-fade-up .5s cubic-bezier(.4,0,.2,1) both;
        }
        .ex-section-card:hover{border-color:#c7d2fe;box-shadow:0 12px 36px rgba(99,102,241,.12);transform:translateY(-4px)}

        .ex-card-content{padding:18px 20px;display:flex;flex-direction:column;flex:1;min-height:180px}

        .ex-card-title{
          cursor:pointer;border:none;background:transparent;padding:0;text-align:left;width:100%;
          font-size:15px;font-weight:700;color:#1e1b4b;transition:color .2s;
        }
        .ex-card-title:hover{color:#6366f1}

        .ex-card-desc{
          margin:8px 0;min-height:36px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
          font-size:13px;color:#64748b;line-height:1.5;
        }

        .ex-tag{
          display:inline-flex;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:600;
          background:rgba(226,232,240,0.5);color:#475569;
          backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
        }
        .ex-tag.cat{background:rgba(199,210,254,0.5);color:#4338ca}

        .ex-view-btn{
          flex:1;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:none;
          padding:9px 16px;border-radius:10px;font-size:13px;font-weight:600;
          cursor:pointer;transition:all .25s cubic-bezier(.4,0,.2,1);
          box-shadow:0 2px 8px rgba(99,102,241,.2);
        }
        .ex-view-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,.3)}

        .ex-try-btn{
          display:inline-flex;align-items:center;gap:4px;
          padding:8px 14px;border-radius:10px;
          border:2px solid #0ea5e9;
          background:rgba(224,242,254,0.6);
          backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
          color:#0369a1;font-size:13px;font-weight:600;
          cursor:pointer;white-space:nowrap;
          transition:all .25s cubic-bezier(.4,0,.2,1);
        }
        .ex-try-btn:hover{background:#0ea5e9;color:#fff;transform:translateY(-1px);box-shadow:0 4px 12px rgba(14,165,233,.25)}

        .ex-price-badge{
          position:absolute;top:12px;right:12px;
          padding:4px 10px;border-radius:10px;font-size:11px;font-weight:700;
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          letter-spacing:.3px;text-transform:uppercase;
        }
        .ex-price-badge.free{background:rgba(220,252,231,0.85);color:#166534;border:1px solid rgba(187,247,208,0.5)}
        .ex-price-badge.premium{background:rgba(237,233,254,0.85);color:#5b21b6;border:1px solid rgba(221,214,254,0.5)}

        .ex-empty{
          text-align:center;padding:40px 20px;
          background:rgba(255,255,255,0.5);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(226,232,240,0.4);border-radius:16px;
        }

        .ex-scroll-btn{
          background:rgba(255,255,255,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
          border:1px solid rgba(226,232,240,0.5);border-radius:10px;width:34px;height:34px;
          display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;
          transition:all .2s;font-size:14px;
        }
        .ex-scroll-btn:hover{background:rgba(255,255,255,0.85);transform:scale(1.05);box-shadow:0 2px 8px rgba(0,0,0,0.06)}

        .ex-hero-pill{
          display:inline-flex;align-items:center;gap:6px;
          padding:7px 14px;border-radius:10px;
          background:rgba(255,255,255,0.5);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.7);
          font-size:12px;font-weight:600;color:#4338ca;
          transition:all .2s;
        }
        .ex-hero-pill:hover{background:rgba(255,255,255,0.75);transform:translateY(-1px)}
      `}</style>

      <BlockStack gap="500">
        {/* ─── Hero Banner ─── */}
        <div className="ex-hero">
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="ex-glass">
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: 42, animation: "ex-float 3s ease-in-out infinite" }}>✨</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#1e1b4b", margin: 0, lineHeight: 1.3 }}>Premium Sections for Shopify</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>One-Click Install · All Sections Included · OS 2.0 Ready</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                {[
                  { icon: "🎯", text: "Try before you subscribe – free 24h demo" },
                  { icon: "💎", text: "All sections with Premium – €8/mo" },
                  { icon: "⚡", text: "Cancel anytime" },
                ].map((item) => (
                  <span key={item.text} className="ex-hero-pill">{item.icon} {item.text}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Search & Categories ─── */}
        <div className="ex-search-wrap">
          <BlockStack gap="400">
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e1b4b" }}>Search</div>
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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={scrollLeft} className="ex-scroll-btn" aria-label="Scroll left">←</button>
              <div
                ref={setScrollContainerRef}
                className="category-scroll-container"
                style={{ display: "flex", gap: 10, overflowX: "auto", scrollBehavior: "smooth", scrollbarWidth: "none", flex: 1 }}
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
              <button onClick={scrollRight} className="ex-scroll-btn" aria-label="Scroll right">→</button>
            </div>
          </BlockStack>
        </div>

        {/* ─── Section Grid ─── */}
        <div>
          {/* Try-section result banner */}
          {tryEditorUrl && (
            <div style={{
              marginBottom: 16,
              padding: "14px 18px",
              borderRadius: 12,
              background: "rgba(220,252,231,0.9)",
              border: "1px solid rgba(134,239,172,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>Demo theme ready!</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <a
                  href={tryEditorUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 16px", borderRadius: 8,
                    background: "linear-gradient(135deg,#059669,#10b981)",
                    color: "#fff", fontWeight: 700, fontSize: 13,
                    textDecoration: "none",
                    boxShadow: "0 2px 8px rgba(5,150,105,0.3)",
                  }}
                >
                  🎨 Open Theme Editor
                </a>
                <button
                  onClick={() => setTryEditorUrl(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#64748b", lineHeight: 1 }}
                  aria-label="Dismiss"
                >×</button>
              </div>
            </div>
          )}
          {tryErrorMsg && (
            <div style={{
              marginBottom: 16,
              padding: "14px 18px",
              borderRadius: 12,
              background: "rgba(254,226,226,0.9)",
              border: "1px solid rgba(252,165,165,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>❌</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#991b1b" }}>{tryErrorMsg}</span>
              </div>
              <button
                onClick={() => setTryErrorMsg(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#64748b", lineHeight: 1 }}
                aria-label="Dismiss"
              >×</button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#1e1b4b" }}>
              {selectedCategory === "all" ? "All Sections" : CATEGORIES.find(c => c.id === selectedCategory)?.label || selectedCategory}
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
              {filteredSections.length} Section{filteredSections.length !== 1 ? "s" : ""}
            </div>
          </div>

          {filteredSections.length === 0 ? (
            <div className="ex-empty">
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 14, color: "#64748b" }}>No sections found.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {filteredSections.map((section, idx) => (
                <div key={section.id} className="ex-section-card" style={{ animationDelay: `${idx * 0.04}s` }}>
                  {/* Preview Slider */}
                  <PreviewSlider 
                    section={section} 
                    onNavigate={() => navigate(`/app/section?id=${section.id}`)}
                  />

                  {/* Price Badge overlay */}
                  <div style={{ position: "relative" }}>
                    <span className={`ex-price-badge ${section.price.type === "free" ? "free" : "premium"}`}
                      style={{ position: "absolute", top: -168, right: 12 }}>
                      {section.price.type === "free" ? "Free" : "Premium"}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="ex-card-content">
                    <button
                      type="button"
                      className="ex-card-title"
                      onClick={() => navigate(`/app/section?id=${section.id}`)}
                    >
                      {section.name}
                    </button>
                    <div className="ex-card-desc">{section.description}</div>
                    <div style={{ marginTop: "auto" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                        {(Array.isArray(section.category) ? section.category : [section.category]).map((cat: string) => (
                          <span key={cat} className="ex-tag cat">{cat}</span>
                        ))}
                        {section.tags.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="ex-tag">{tag}</span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          className="ex-view-btn"
                          onClick={() => navigate(`/app/section?id=${section.id}`)}
                        >
                          View Details
                        </button>
                        <button
                          className="ex-try-btn"
                          disabled={tryingSection === section.id}
                          onClick={() => handleTryFree(section.id)}
                        >
                          {tryingSection === section.id ? "⏳ Loading…" : "✨ Try Free"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </BlockStack>
    </Page>
  );
}
