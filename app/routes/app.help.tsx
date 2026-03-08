import { useState, useEffect } from "react";
import { useNavigate, useLoaderData } from "react-router";
import { useFetcher } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
  Divider,
  TextField,
  Select,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { checkIsPremium } from "../lib/is-premium.server";

const SUPPORT_EMAIL = "support@sectionhub.io";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { isPremium } = await checkIsPremium(session.shop);
  return { isPremium };
};

/* ── FAQ Data ── */
const FAQ_SECTIONS = [
  {
    title: "Getting Started",
    icon: "🚀",
    items: [
      {
        q: "How do I install a section?",
        a: "Go to 'Explore Sections', find a section you like, and click 'View Details'. On the detail page, click 'Install to Theme'. The section will be uploaded to your active theme. Then open the Shopify Theme Editor and add the section to your page.",
      },
      {
        q: "What is 'Try Before You Buy'?",
        a: "You can preview any section for free in a separate demo theme. Click the '✨ Try Free' button on any section card. A demo theme will be created where you can see the section live in the Theme Editor. The demo expires after 24 hours. Your live store is never affected.",
      },
      {
        q: "How do I add a section to my page after installing?",
        a: "1. Go to your Shopify Admin → Online Store → Themes\n2. Click 'Customize' on your active theme\n3. Click 'Add section' in the left sidebar\n4. Search for the section name (e.g. 'Section Hub - Hero Banner')\n5. Click to add it and customize the settings",
      },
      {
        q: "What does 'OS 2.0 Ready' mean?",
        a: "All our sections are built for Shopify's Online Store 2.0 architecture. They work with JSON templates, have full Theme Editor settings, and support blocks for flexible customization — no code editing needed.",
      },
    ],
  },
  {
    title: "Purchases & Billing",
    icon: "💳",
    items: [
      {
        q: "How does payment work?",
        a: "Section Hub Premium is a monthly subscription (€8/month) billed through Shopify. The charge appears on your regular Shopify invoice. You can cancel anytime.",
      },
      {
        q: "What is Section Hub Premium?",
        a: "Premium is a monthly subscription (€8/mo) that gives you:\n• Access to all sections in the library\n• Unlimited installs\n• All Premium Conversion Blocks\n• New sections as soon as they release\n• Hands-on support — we fix issues and handle customization requests within 24–48h",
      },
      {
        q: "Can I get a refund?",
        a: "Since payments go through Shopify Billing, refund requests are handled according to Shopify's policies. Contact us at " + SUPPORT_EMAIL + " and we'll help you.",
      },
      {
        q: "What happens if I cancel?",
        a: "Sections you've already installed stay in your theme. You just won't be able to install new premium sections or receive updates. You can resubscribe anytime.",
      },
    ],
  },
  {
    title: "Sections & Customization",
    icon: "🎨",
    items: [
      {
        q: "Can I customize the sections?",
        a: "Yes! Every section comes with Theme Editor settings (colors, fonts, spacing, content, etc.). You can customize everything without coding. For advanced customization, the Liquid/CSS code is accessible in your theme files.",
      },
      {
        q: "Will sections work with my theme?",
        a: "Our sections are designed to work with any Shopify OS 2.0 theme (Dawn, Debut, Sense, Craft, etc.). They use standard Shopify section architecture and adapt to your theme's color scheme.",
      },
      {
        q: "How do I update a section to the latest version?",
        a: "Go to 'Updates' in the sidebar. If updates are available, you'll see them listed with changelogs. Click 'Update' to install the latest version. Your customizations in the Theme Editor will be preserved.",
      },
      {
        q: "What happens if I uninstall the Section Hub app?",
        a: "Your sections stay in your theme! They're installed as regular Liquid files. Uninstalling the app won't remove them. However, you won't receive updates or be able to install new sections.",
      },
      {
        q: "Can I use sections on multiple stores?",
        a: "Each purchase is per store. If you want to use a section on another store, you'll need to purchase it again for that store.",
      },
    ],
  },
  {
    title: "Store Analyzer",
    icon: "📊",
    items: [
      {
        q: "What is the Store Analyzer?",
        a: "The Store Analyzer scans your active theme and compares it to what top-performing Shopify stores use. It identifies missing section types (like FAQ, Testimonials, Newsletter) and gives you a Store Score from 0-100.",
      },
      {
        q: "Is the Store Analyzer free?",
        a: "Yes, the Store Analyzer is completely free for all users. You can run it anytime to check your store's optimization level.",
      },
      {
        q: "How is the Store Score calculated?",
        a: "The score is based on which section types are active in your theme. Each type is weighted by priority:\n• Critical (Header, Hero, Products, Footer) = highest weight\n• High (Reviews, FAQ, Newsletter, Trust) = high weight\n• Medium (CTA, Logos, Announcements) = medium weight\nHaving all types active gives you 100/100.",
      },
    ],
  },
  {
    title: "Conversion Blocks",
    icon: "⚡",
    items: [
      {
        q: "What are Conversion Blocks?",
        a: "Conversion Blocks are small, powerful app blocks that you can add to any page in the Theme Editor. They include countdown timers, trust badges, stock counters, and more — designed to boost conversions on product pages.",
      },
      {
        q: "Are Conversion Blocks free?",
        a: "9 blocks are free for all users. 7 premium blocks require a Section Hub Premium subscription (€8/mo).",
      },
    ],
  },
];

/* ── Accordion Item ── */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 0",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Text as="p" variant="bodyMd" fontWeight="semibold">{question}</Text>
        <span style={{
          fontSize: 18,
          color: "#6b7280",
          transform: open ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.2s ease",
        }}>
          ▾
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: 14, paddingLeft: 4 }}>
          <Text as="p" variant="bodySm" tone="subdued">
            {answer.split("\n").map((line, i) => (
              <span key={i}>
                {line}
                {i < answer.split("\n").length - 1 && <br />}
              </span>
            ))}
          </Text>
        </div>
      )}
    </div>
  );
}

/* ── Guide Steps ── */
const QUICK_GUIDES = [
  {
    icon: "📦",
    title: "Install Your First Section",
    steps: [
      "Go to 'Explore Sections' in the sidebar",
      "Browse or search for a section you like",
      "Click 'View Details' → then 'Install to Theme'",
      "Open your Shopify Theme Editor",
      "Click 'Add section' → search for the section name",
      "Customize settings and save!",
    ],
  },
  {
    icon: "✨",
    title: "Try a Section for Free",
    steps: [
      "Find any section in 'Explore Sections'",
      "Click the '✨ Try Free' button",
      "A demo theme opens in the Theme Editor",
      "Preview the section with your store's data",
      "Demo expires after 24h — your live store is not affected",
    ],
  },
  {
    icon: "📊",
    title: "Analyze Your Store",
    steps: [
      "Go to 'Store Analyzer' in the sidebar",
      "The analyzer scans your active theme automatically",
      "See your Store Score (0-100)",
      "Check which section types are missing",
      "Click on recommendations to find matching sections",
    ],
  },
];

export default function HelpcenterPage() {
  const { isPremium } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  const [expandedGuide, setExpandedGuide] = useState<number | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactTopic, setContactTopic] = useState("general");
  const [showSuccess, setShowSuccess] = useState(false);

  const isSubmitting = fetcher.state !== "idle";

  // Reset form on success
  useEffect(() => {
    if (fetcher.data?.success) {
      setContactName("");
      setContactMessage("");
      setContactTopic("general");
      setShowSuccess(true);
    }
  }, [fetcher.data]);

  const handleSubmit = () => {
    if (!contactMessage.trim()) return;
    fetcher.submit(
      { name: contactName, topic: contactTopic, message: contactMessage },
      { method: "POST", action: "/app/api/contact" },
    );
  };

  return (
    <Page
      title="Help Center"
      subtitle="Guides, FAQs, and support for Section Hub"
      backAction={{ onAction: () => navigate("/app") }}
    >
      <BlockStack gap="600">

        {/* ── Hero ── */}
        <Card padding="0">
          <div style={{
            background: isPremium
              ? "linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #6366f1 100%)"
              : "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)",
            borderRadius: 12,
            padding: "32px 36px",
          }}>
            <BlockStack gap="300">
              <Text as="h1" variant="headingXl">
                <span style={{ color: "white" }}>
                  {isPremium ? "Premium Support 👑" : "How can we help you? 👋"}
                </span>
              </Text>
              <Text as="p" variant="bodyLg">
                <span style={{ color: "rgba(255,255,255,0.9)" }}>
                  {isPremium
                    ? "As a Premium member, we personally handle your requests within 24–48 hours."
                    : "Find answers below or contact us directly — we usually reply within a few hours."}
                </span>
              </Text>
              <InlineStack gap="200">
                <Button onClick={() => {
                  const el = document.getElementById("contact-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}>
                  {isPremium ? "Send Request" : "Contact Support"}
                </Button>
                <Button variant="plain" onClick={() => {
                  const el = document.getElementById("faq-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}>
                  Browse FAQs ↓
                </Button>
              </InlineStack>
            </BlockStack>
          </div>
        </Card>

        {/* ── Quick Start Guides ── */}
        <BlockStack gap="300">
          <Text as="h2" variant="headingLg">Quick Start Guides</Text>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {QUICK_GUIDES.map((guide, idx) => (
              <Card key={guide.title}>
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() => setExpandedGuide(expandedGuide === idx ? null : idx)}
                  onKeyDown={() => {}}
                  role="button"
                  tabIndex={0}
                >
                  <BlockStack gap="300">
                    <InlineStack gap="200" blockAlign="center">
                      <span style={{ fontSize: 24 }}>{guide.icon}</span>
                      <Text as="h3" variant="headingSm">{guide.title}</Text>
                    </InlineStack>

                    {expandedGuide === idx ? (
                      <BlockStack gap="200">
                        {guide.steps.map((step, i) => (
                          <InlineStack key={i} gap="200" blockAlign="start">
                            <div style={{
                              width: 22, height: 22, borderRadius: "50%",
                              background: "#059669", color: "white",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
                            }}>{i + 1}</div>
                            <Text as="p" variant="bodySm">{step}</Text>
                          </InlineStack>
                        ))}
                      </BlockStack>
                    ) : (
                      <Text as="p" variant="bodySm" tone="subdued">
                        {guide.steps.length} steps — click to expand
                      </Text>
                    )}
                  </BlockStack>
                </div>
              </Card>
            ))}
          </div>
        </BlockStack>

        {/* ── FAQ ── */}
        <div id="faq-section">
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">Frequently Asked Questions</Text>

            {FAQ_SECTIONS.map((section) => (
              <Card key={section.title}>
                <BlockStack gap="0">
                  <InlineStack gap="200" blockAlign="center">
                    <span style={{ fontSize: 20 }}>{section.icon}</span>
                    <Text as="h3" variant="headingMd">{section.title}</Text>
                    <Badge>{`${section.items.length}`}</Badge>
                  </InlineStack>
                  <div style={{ marginTop: 8 }}>
                    {section.items.map((item, i) => (
                      <div key={i}>
                        {i > 0 && <Divider />}
                        <FaqItem question={item.q} answer={item.a} />
                      </div>
                    ))}
                  </div>
                </BlockStack>
              </Card>
            ))}
          </BlockStack>
        </div>

        {/* ── Contact Support ── */}
        <div id="contact-section">
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center">
                <span style={{ fontSize: 24 }}>{isPremium ? "�" : "�💬"}</span>
                <Text as="h2" variant="headingLg">
                  {isPremium ? "Premium Support" : "Contact Support"}
                </Text>
                {isPremium && <Badge tone="success">Priority</Badge>}
              </InlineStack>

              {isPremium && (
                <div style={{
                  background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
                  border: "1px solid #ddd6fe",
                  borderRadius: 10,
                  padding: "14px 18px",
                }}>
                  <Text as="p" variant="bodySm">
                    <span style={{ color: "#4f46e5", fontWeight: 600 }}>🛠️ Hands-On Support included with Premium</span>
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Need a tweak to a section or running into an issue? We personally handle your request within 24–48 hours depending on scope. It's like having your own section developer.
                  </Text>
                </div>
              )}

              {showSuccess && (
                <Banner
                  title="Message sent!"
                  tone="success"
                  onDismiss={() => setShowSuccess(false)}
                >
                  We received your message and will get back to you soon.
                </Banner>
              )}

              {fetcher.data?.error && (
                <Banner title="Could not send message" tone="critical">
                  {fetcher.data.error}. Please try again or email us directly at {SUPPORT_EMAIL}.
                </Banner>
              )}

              <Text as="p" variant="bodySm" tone="subdued">
                {isPremium
                  ? "Describe what you need — a customization, a fix, or anything else. We'll take care of it."
                  : "Send us a message directly from here — no email client needed. We usually respond within a few hours."}
              </Text>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <TextField
                  label="Your Name"
                  value={contactName}
                  onChange={setContactName}
                  placeholder="John Smith"
                  autoComplete="name"
                />
                <Select
                  label="Topic"
                  options={[
                    { label: "General Question", value: "general" },
                    { label: "Bug Report", value: "bug" },
                    { label: "Feature Request", value: "feature" },
                    { label: "Billing / Refund", value: "billing" },
                    { label: "Section Help", value: "section" },
                    ...(isPremium ? [{ label: "🛠️ Customization Request", value: "customization" }] : []),
                  ]}
                  value={contactTopic}
                  onChange={setContactTopic}
                />
              </div>

              <TextField
                label="Message"
                value={contactMessage}
                onChange={setContactMessage}
                multiline={4}
                placeholder="Describe your issue or question..."
                autoComplete="off"
              />

              <InlineStack gap="300" blockAlign="center">
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!contactMessage.trim() || isSubmitting}
                  loading={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : isPremium ? "Send Premium Request →" : "Send Message →"}
                </Button>
                <Text as="p" variant="bodySm" tone="subdued">
                  {isPremium
                    ? "👑 Premium · We'll handle your request within 24–48h"
                    : "📧 We'll reply to your store's Shopify email"}
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </div>

        {/* ── Quick Links ── */}
        <Layout>
          <Layout.Section>
            <Card>
              <InlineStack align="space-between" blockAlign="center" wrap>
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">Need more help?</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Explore the app or reach out to us
                  </Text>
                </BlockStack>
                <InlineStack gap="200">
                  <Button onClick={() => navigate("/app/analyzer")}>Run Store Analyzer</Button>
                  <Button onClick={() => navigate("/app/explore")}>Browse Sections</Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      const el = document.getElementById("contact-section");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    {isPremium ? "Premium Support" : "Contact Support"}
                  </Button>
                </InlineStack>
              </InlineStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
