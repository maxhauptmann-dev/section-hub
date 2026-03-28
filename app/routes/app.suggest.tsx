import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useFetcher } from "react-router";
import {
  Page,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  Button,
  Banner,
  Select,
  Badge,
} from "@shopify/polaris";

const IDEA_CATEGORIES = [
  { label: "New Section Idea", value: "section" },
  { label: "New Block Idea", value: "block" },
  { label: "Feature Request", value: "feature" },
  { label: "Design Improvement", value: "design" },
  { label: "Other", value: "other" },
];

const CATEGORY_META: Record<string, { icon: string; color: string; gradient: string }> = {
  section: { icon: "🧩", color: "#7c3aed", gradient: "linear-gradient(135deg,rgba(139,92,246,0.15),rgba(99,102,241,0.15))" },
  block: { icon: "⚡", color: "#2563eb", gradient: "linear-gradient(135deg,rgba(59,130,246,0.15),rgba(37,99,235,0.15))" },
  feature: { icon: "🚀", color: "#059669", gradient: "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.15))" },
  design: { icon: "🎨", color: "#d946ef", gradient: "linear-gradient(135deg,rgba(217,70,239,0.15),rgba(168,85,247,0.15))" },
  other: { icon: "💭", color: "#64748b", gradient: "linear-gradient(135deg,rgba(100,116,139,0.15),rgba(71,85,105,0.15))" },
};

const INSPIRATION = [
  { icon: "🎬", label: "Video Hero with Parallax" },
  { icon: "🛒", label: "Before & After Slider" },
  { icon: "📱", label: "App-Download Banner" },
  { icon: "🗓️", label: "Event / Countdown Section" },
  { icon: "🏆", label: "Awards & Certifications" },
  { icon: "💬", label: "Live Chat Prompt Section" },
  { icon: "📸", label: "Instagram / UGC Gallery" },
  { icon: "🎯", label: "Product Quiz / Finder" },
];

export default function SuggestIdeaPage() {
  const navigate = useNavigate();
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  const [idea, setIdea] = useState("");
  const [category, setCategory] = useState("section");
  const [reference, setReference] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data?.success) {
      setIdea("");
      setReference("");
      setCategory("section");
      setShowSuccess(true);
    }
  }, [fetcher.data]);

  const handleSubmit = () => {
    if (!idea.trim()) return;
    fetcher.submit(
      {
        name: "SectionIQ User",
        topic: "feature",
        message: `[IDEA SUGGESTION]\n\nCategory: ${IDEA_CATEGORIES.find((c) => c.value === category)?.label || category}\n\nIdea:\n${idea}${reference ? `\n\nReference/Example URL:\n${reference}` : ""}`,
      },
      { method: "POST", action: "/app/api/contact" },
    );
  };

  const handleInspirationClick = (label: string) => {
    setIdea((prev) => (prev ? `${prev}\n\n` : "") + label + ": ");
    setCategory("section");
  };

  const catMeta = CATEGORY_META[category] || CATEGORY_META.other;

  return (
    <Page title="Suggest an Idea" backAction={{ onAction: () => navigate("/app") }}>
      <style>{`
        @keyframes sh-gradient-move{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes sh-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes sh-fade-up{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes sh-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes sh-pulse-soft{0%,100%{box-shadow:0 2px 16px rgba(139,92,246,0.08)}50%{box-shadow:0 4px 28px rgba(139,92,246,0.16)}}
        @keyframes sh-bulb-glow{0%,100%{filter:drop-shadow(0 0 4px rgba(250,204,21,0.3))}50%{filter:drop-shadow(0 0 12px rgba(250,204,21,0.6))}}

        .sh-sug-hero{
          position:relative;overflow:hidden;border-radius:16px;padding:28px 24px;
          background:linear-gradient(-45deg,#fef3c7,#fde68a,#fbbf24,#f59e0b,#fcd34d,#fef9c3);
          background-size:300% 300%;
          animation:sh-gradient-move 8s ease infinite, sh-pulse-soft 5s ease-in-out infinite;
        }
        .sh-sug-hero::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.5) 50%,transparent 60%);
          background-size:200% 200%;animation:sh-shimmer 4s ease-in-out infinite;pointer-events:none;
        }
        .sh-sug-hero::after{
          content:'';position:absolute;top:-40%;right:-20%;width:60%;height:80%;
          background:radial-gradient(circle,rgba(250,204,21,0.15) 0%,transparent 70%);
          pointer-events:none;
        }

        .sh-sug-glass{
          background:rgba(255,255,255,0.65);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,0.8);
          border-radius:14px;padding:18px 20px;
          box-shadow:0 2px 12px rgba(0,0,0,0.04);
        }

        .sh-sug-stat{
          background:rgba(255,255,255,0.55);
          backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
          border:1px solid rgba(255,255,255,0.7);
          border-radius:12px;padding:12px 16px;text-align:center;
          transition:all .25s cubic-bezier(.4,0,.2,1);
          box-shadow:0 1px 4px rgba(0,0,0,0.04);
          flex:1;min-width:80px;
        }
        .sh-sug-stat:hover{background:rgba(255,255,255,0.8);transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,0.08)}

        .sh-sug-form-card{
          border-radius:16px;overflow:hidden;
          border:1px solid #e5e7eb;background:#fff;
          animation:sh-fade-up .5s ease both;animation-delay:.1s;
          transition:all .3s ease;
        }
        .sh-sug-form-card:hover{box-shadow:0 8px 28px rgba(0,0,0,0.06);border-color:#c7d2fe}

        .sh-sug-layout{display:grid;grid-template-columns:1fr;gap:16px}
        @media(min-width:780px){.sh-sug-layout{grid-template-columns:1fr 300px}}

        .sh-sug-inspire-card{
          border-radius:14px;overflow:hidden;
          border:1px solid #e5e7eb;background:#fff;
          animation:sh-fade-up .5s ease both;animation-delay:.2s;
          transition:all .3s ease;
        }
        .sh-sug-inspire-card:hover{box-shadow:0 8px 28px rgba(0,0,0,0.06);border-color:#fbbf24}

        .sh-sug-inspire-btn{
          display:flex;align-items:center;gap:10px;
          padding:10px 14px;
          border:1px solid rgba(0,0,0,0.06);
          border-radius:12px;
          background:rgba(255,255,255,0.6);
          backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
          cursor:pointer;text-align:left;width:100%;
          transition:all .2s cubic-bezier(.4,0,.2,1);
        }
        .sh-sug-inspire-btn:hover{
          background:rgba(250,204,21,0.08);
          border-color:rgba(250,204,21,0.4);
          transform:translateX(4px);
          box-shadow:0 2px 10px rgba(0,0,0,0.04);
        }

        .sh-sug-steps-card{
          border-radius:14px;overflow:hidden;
          border:1px solid #e5e7eb;background:#fff;
          animation:sh-fade-up .5s ease both;animation-delay:.3s;
          transition:all .3s ease;
        }
        .sh-sug-steps-card:hover{box-shadow:0 8px 28px rgba(0,0,0,0.06);border-color:#c7d2fe}

        .sh-sug-step{
          display:flex;align-items:center;gap:12px;
          padding:10px 14px;
          background:rgba(255,255,255,0.5);
          backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
          border:1px solid rgba(0,0,0,0.04);
          border-radius:12px;
          transition:all .2s ease;
        }
        .sh-sug-step:hover{background:rgba(139,92,246,0.04);transform:translateX(3px)}

        .sh-sug-step-num{
          width:26px;height:26px;border-radius:50%;
          background:linear-gradient(135deg,#8b5cf6,#7c3aed);
          color:white;font-size:12px;font-weight:700;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
        }

        .sh-sug-cat-pill{
          display:inline-flex;align-items:center;gap:5px;
          padding:6px 14px;border-radius:20px;
          font-size:12px;font-weight:600;
          border:1px solid rgba(0,0,0,0.08);
          background:rgba(255,255,255,0.7);
          backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
          transition:all .2s ease;cursor:default;
        }

        .sh-sug-submit-bar{
          position:relative;overflow:hidden;border-radius:14px;padding:20px;
          background:linear-gradient(-45deg,#ede9fe,#ddd6fe,#c4b5fd,#e9d5ff);
          background-size:300% 300%;
          animation:sh-gradient-move 8s ease infinite;
          transition:all .25s ease;
        }
        .sh-sug-submit-bar::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.4) 50%,transparent 60%);
          background-size:200% 200%;animation:sh-shimmer 4s ease-in-out infinite;pointer-events:none;
        }
        .sh-sug-submit-bar:hover{box-shadow:0 6px 20px rgba(139,92,246,.12);transform:translateY(-2px)}

        .sh-sug-icon-float{animation:sh-float 3s ease-in-out infinite;display:inline-block}
        .sh-sug-bulb{animation:sh-bulb-glow 2s ease-in-out infinite;display:inline-block}

        /* Mobile Responsiveness */
        @media(max-width:640px){
          .sh-sug-hero{padding:20px 16px;border-radius:14px}
          .sh-sug-glass{padding:14px 16px}
          .sh-sug-submit-bar{padding:16px}
        }
      `}</style>

      <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <BlockStack gap="500">

        {/* ═══ HERO ═══ */}
        <div className="sh-sug-hero">
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="sh-sug-glass" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(250,204,21,0.2) 0%, rgba(245,158,11,0.2) 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, flexShrink: 0,
                }}>
                  <span className="sh-sug-bulb">💡</span>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#78350f" }}>
                    Suggest an Idea
                  </div>
                  <div style={{ fontSize: 13, color: "#92400e", marginTop: 2 }}>
                    Help us build what you need — every idea is reviewed
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="sh-sug-cat-pill" style={{ background: "rgba(250,204,21,0.12)", color: "#92400e", borderColor: "rgba(250,204,21,0.3)" }}>
                  ✨ Community Driven
                </span>
              </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              {[
                { label: "Categories", value: "5", icon: "📂" },
                { label: "Inspiration", value: String(INSPIRATION.length), icon: "💡" },
                { label: "Response", value: "< 48h", icon: "⚡" },
                { label: "Built Ideas", value: "20+", icon: "🚀" },
              ].map((s) => (
                <div key={s.label} className="sh-sug-stat">
                  <div style={{ fontSize: 11, color: "#92400e", marginBottom: 4 }}>{s.icon} {s.label}</div>
                  <div style={{ color: "#78350f", fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ SUCCESS / ERROR BANNERS ═══ */}
        {showSuccess && (
          <Banner
            title="Idea submitted! 🎉"
            tone="success"
            onDismiss={() => setShowSuccess(false)}
          >
            Thanks for your suggestion! We review every idea and will consider it for future updates.
          </Banner>
        )}
        {fetcher.data?.error && (
          <Banner title="Could not submit idea" tone="critical">
            {fetcher.data.error}. Please try again later.
          </Banner>
        )}

        {/* ═══ MAIN LAYOUT ═══ */}
        <div className="sh-sug-layout">

          {/* ── Form Column ── */}
          <div>
            <BlockStack gap="400">
              <div className="sh-sug-form-card">
                <div style={{ padding: "20px 22px" }}>
                  <BlockStack gap="400">
                    <InlineStack gap="200" blockAlign="center">
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: catMeta.gradient,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16,
                      }}>{catMeta.icon}</div>
                      <Text as="h2" variant="headingMd">Describe Your Idea</Text>
                    </InlineStack>

                    <Select
                      label="Category"
                      options={IDEA_CATEGORIES}
                      value={category}
                      onChange={setCategory}
                    />

                    <TextField
                      label="Your Idea"
                      value={idea}
                      onChange={setIdea}
                      multiline={5}
                      autoComplete="off"
                      placeholder="Describe what the section should look like, what it should do, and how it would help your store..."
                      helpText="Be as specific as possible — layout, features, colors, animations..."
                    />

                    <TextField
                      label="Reference URL (optional)"
                      value={reference}
                      onChange={setReference}
                      autoComplete="url"
                      placeholder="https://example.com — a store or page that inspires your idea"
                    />
                  </BlockStack>
                </div>
              </div>

              {/* Submit bar */}
              <div className="sh-sug-submit-bar">
                <div className="sh-sug-glass" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
                  <span className="sh-sug-icon-float" style={{ fontSize: 24 }}>📨</span>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b" }}>Ready to share?</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Your idea could become the next section</div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={!idea.trim() || isSubmitting}
                    loading={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Idea →"}
                  </Button>
                </div>
              </div>
            </BlockStack>
          </div>

          {/* ── Sidebar ── */}
          <div>
            <BlockStack gap="400">

              {/* Inspiration */}
              <div className="sh-sug-inspire-card">
                <div style={{ padding: "18px 20px" }}>
                  <BlockStack gap="300">
                    <InlineStack gap="200" blockAlign="center">
                      <div style={{
                        width: 30, height: 30, borderRadius: 9,
                        background: "linear-gradient(135deg,rgba(250,204,21,0.15),rgba(245,158,11,0.15))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 15,
                      }}>💡</div>
                      <Text as="h2" variant="headingSm">Need Inspiration?</Text>
                    </InlineStack>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Click any idea as a starting point:</div>
                    <BlockStack gap="200">
                      {INSPIRATION.map((item) => (
                        <button
                          key={item.label}
                          className="sh-sug-inspire-btn"
                          onClick={() => handleInspirationClick(item.label)}
                        >
                          <span style={{ fontSize: 17 }}>{item.icon}</span>
                          <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{item.label}</span>
                        </button>
                      ))}
                    </BlockStack>
                  </BlockStack>
                </div>
              </div>

              {/* How it works */}
              <div className="sh-sug-steps-card">
                <div style={{ padding: "18px 20px" }}>
                  <BlockStack gap="300">
                    <InlineStack gap="200" blockAlign="center">
                      <div style={{
                        width: 30, height: 30, borderRadius: 9,
                        background: "linear-gradient(135deg,rgba(139,92,246,0.15),rgba(99,102,241,0.15))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 15,
                      }}>📋</div>
                      <Text as="h2" variant="headingSm">How It Works</Text>
                    </InlineStack>
                    <BlockStack gap="200">
                      {[
                        { step: "1", icon: "✏️", text: "Describe your idea" },
                        { step: "2", icon: "👀", text: "We review every one" },
                        { step: "3", icon: "🔥", text: "Popular ideas get priority" },
                        { step: "4", icon: "🚀", text: "We build and ship it" },
                      ].map((item) => (
                        <div key={item.step} className="sh-sug-step">
                          <div className="sh-sug-step-num">{item.step}</div>
                          <span style={{ fontSize: 15 }}>{item.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{item.text}</span>
                        </div>
                      ))}
                    </BlockStack>
                  </BlockStack>
                </div>
              </div>

            </BlockStack>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", padding: "4px 0 12px" }}>
          <Button url="/app/explore" variant="primary" size="slim">Explore Sections</Button>
          <Button url="/app/blocks" size="slim">Conversion Blocks</Button>
          <Button url="/app/help" size="slim">Help Center</Button>
        </div>

      </BlockStack>
      </div>
    </Page>
  );
}
