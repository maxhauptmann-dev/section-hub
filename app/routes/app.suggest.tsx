import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useFetcher } from "react-router";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  Button,
  Banner,
  Select,
  Divider,
} from "@shopify/polaris";

const IDEA_CATEGORIES = [
  { label: "New Section Idea", value: "section" },
  { label: "New Block Idea", value: "block" },
  { label: "Feature Request", value: "feature" },
  { label: "Design Improvement", value: "design" },
  { label: "Other", value: "other" },
];

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
        name: "Section Hub User",
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

  return (
    <Page
      title="Suggest an Idea 💡"
      subtitle="Help us build what you need — every suggestion is reviewed"
      backAction={{ onAction: () => navigate("/app") }}
    >
      <BlockStack gap="600">

        {/* ── Hero ── */}
        <Card padding="0">
          <div style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #c4b5fd 100%)",
            borderRadius: 12,
            padding: "28px 32px",
          }}>
            <BlockStack gap="200">
              <Text as="h1" variant="headingXl">
                <span style={{ color: "white" }}>What section would help your store? 🚀</span>
              </Text>
              <Text as="p" variant="bodyLg">
                <span style={{ color: "rgba(255,255,255,0.9)" }}>
                  We build sections based on community suggestions. Your idea could be next!
                </span>
              </Text>
            </BlockStack>
          </div>
        </Card>

        <Layout>
          {/* ── Main Form ── */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Describe Your Idea</Text>

                {showSuccess && (
                  <Banner
                    title="Idea submitted!"
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

                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!idea.trim() || isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Idea →"}
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* ── Sidebar ── */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">

              {/* Inspiration */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">💡 Need Inspiration?</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Click any idea below to use it as a starting point:
                  </Text>
                  <Divider />
                  <BlockStack gap="200">
                    {INSPIRATION.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => handleInspirationClick(item.label)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          background: "white",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#7c3aed";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{item.icon}</span>
                        <Text as="p" variant="bodySm">{item.label}</Text>
                      </button>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>

              {/* How it works */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">📋 How It Works</Text>
                  <Divider />
                  {[
                    { step: "1", text: "Describe your section idea" },
                    { step: "2", text: "We review every submission" },
                    { step: "3", text: "Popular ideas get prioritized" },
                    { step: "4", text: "We build and ship it 🚀" },
                  ].map((item) => (
                    <InlineStack key={item.step} gap="200" blockAlign="start">
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: "#7c3aed", color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>{item.step}</div>
                      <Text as="p" variant="bodySm">{item.text}</Text>
                    </InlineStack>
                  ))}
                </BlockStack>
              </Card>

            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
