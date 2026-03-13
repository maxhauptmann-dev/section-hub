import { useState, useEffect } from "react";
import { useNavigate, useLoaderData } from "react-router";
import { useFetcher } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Badge,
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
    <div className="sh-help-faq-item">
      <button
        onClick={() => setOpen(!open)}
        className="sh-help-faq-btn"
      >
        <Text as="p" variant="bodyMd" fontWeight="semibold">{question}</Text>
        <span style={{
          fontSize: 14,
          color: open ? "#6366f1" : "#94a3b8",
          transform: open ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.25s ease, color 0.25s ease",
          flexShrink: 0,
        }}>
          ▾
        </span>
      </button>
      <div className={`sh-help-faq-answer ${open ? 'open' : ''}`}>
        <div style={{ padding: "0 4px 14px 4px" }}>
          <Text as="p" variant="bodySm" tone="subdued">
            {answer.split("\n").map((line, i) => (
              <span key={i}>
                {line}
                {i < answer.split("\n").length - 1 && <br />}
              </span>
            ))}
          </Text>
        </div>
      </div>
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
      backAction={{ onAction: () => navigate("/app") }}
    >
      <style>{`
        @keyframes sh-gradient-move{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes sh-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes sh-fade-up{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes sh-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes sh-pulse-soft{0%,100%{box-shadow:0 2px 16px rgba(99,102,241,0.08)}50%{box-shadow:0 4px 28px rgba(99,102,241,0.16)}}

        .sh-help-hero{
          position:relative;overflow:hidden;border-radius:16px;padding:28px 24px;
          background-size:300% 300%;
          animation:sh-gradient-move 8s ease infinite, sh-pulse-soft 5s ease-in-out infinite;
        }
        .sh-help-hero.premium{background:linear-gradient(-45deg,#ede9fe,#ddd6fe,#c4b5fd,#e9d5ff)}
        .sh-help-hero.free{background:linear-gradient(-45deg,#ecfdf5,#d1fae5,#a7f3d0,#bbf7d0)}
        .sh-help-hero::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.5) 50%,transparent 60%);
          background-size:200% 200%;animation:sh-shimmer 4s ease-in-out infinite;pointer-events:none;
        }
        .sh-help-hero::after{
          content:'';position:absolute;top:-40%;right:-20%;width:60%;height:80%;
          background:radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%);
          pointer-events:none;
        }

        .sh-help-glass{
          background:rgba(255,255,255,0.65);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,0.8);
          border-radius:14px;padding:18px 20px;
          box-shadow:0 2px 12px rgba(0,0,0,0.04);
        }

        .sh-help-glass-stat{
          background:rgba(255,255,255,0.55);
          backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
          border:1px solid rgba(255,255,255,0.7);
          border-radius:12px;padding:14px 16px;text-align:center;
          transition:all .25s cubic-bezier(.4,0,.2,1);
          box-shadow:0 1px 4px rgba(0,0,0,0.04);
          flex:1;min-width:100px;
        }
        .sh-help-glass-stat:hover{background:rgba(255,255,255,0.8);transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,0.08)}

        .sh-help-guide-grid{display:grid;grid-template-columns:1fr;gap:14px}
        @media(min-width:640px){.sh-help-guide-grid{grid-template-columns:repeat(3,1fr)}}

        .sh-help-guide{
          border-radius:14px;border:1px solid #e5e7eb;background:#fff;
          padding:20px;cursor:pointer;
          transition:all .3s cubic-bezier(.4,0,.2,1);
          animation:sh-fade-up .5s ease both;
        }
        .sh-help-guide:nth-child(1){animation-delay:.05s}
        .sh-help-guide:nth-child(2){animation-delay:.1s}
        .sh-help-guide:nth-child(3){animation-delay:.15s}
        .sh-help-guide:hover{
          box-shadow:0 8px 28px rgba(0,0,0,0.08);
          border-color:#c7d2fe;
          transform:translateY(-3px);
        }
        .sh-help-guide:hover .sh-help-guide-icon{transform:scale(1.1)}

        .sh-help-guide-icon{
          width:48px;height:48px;border-radius:14px;
          display:flex;align-items:center;justify-content:center;
          font-size:24px;flex-shrink:0;
          transition:transform .2s ease;
        }

        .sh-help-step-num{
          width:22px;height:22px;border-radius:50%;
          background:linear-gradient(135deg,#6366f1,#4f46e5);
          color:white;font-size:11px;font-weight:700;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
        }

        .sh-help-faq-card{
          border-radius:14px;border:1px solid #e5e7eb;background:#fff;
          overflow:hidden;
          transition:all .25s cubic-bezier(.4,0,.2,1);
          animation:sh-fade-up .5s ease both;
        }
        .sh-help-faq-card:nth-child(1){animation-delay:.05s}
        .sh-help-faq-card:nth-child(2){animation-delay:.1s}
        .sh-help-faq-card:nth-child(3){animation-delay:.15s}
        .sh-help-faq-card:nth-child(4){animation-delay:.2s}
        .sh-help-faq-card:nth-child(5){animation-delay:.25s}
        .sh-help-faq-card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.06);border-color:#ddd6fe}

        .sh-help-faq-header{
          display:flex;align-items:center;gap:10px;padding:16px 20px;
          border-bottom:1px solid #f1f5f9;
        }
        .sh-help-faq-header-icon{
          width:36px;height:36px;border-radius:10px;
          display:flex;align-items:center;justify-content:center;
          font-size:18px;flex-shrink:0;
          background:linear-gradient(135deg,#f5f3ff,#ede9fe);
        }

        .sh-help-faq-item{border-bottom:1px solid #f8fafc}
        .sh-help-faq-item:last-child{border-bottom:none}

        .sh-help-faq-btn{
          width:100%;display:flex;justify-content:space-between;align-items:center;
          padding:14px 20px;border:none;background:transparent;cursor:pointer;text-align:left;
          transition:background .2s ease;
        }
        .sh-help-faq-btn:hover{background:#fafbfc}

        .sh-help-faq-answer{
          max-height:0;overflow:hidden;
          transition:max-height .3s ease;
          padding:0 20px;
        }
        .sh-help-faq-answer.open{max-height:500px}

        .sh-help-contact{
          position:relative;overflow:hidden;border-radius:16px;
          background:linear-gradient(-45deg,#f8fafc,#f1f5f9,#e2e8f0,#f1f5f9);
          background-size:300% 300%;
          animation:sh-gradient-move 12s ease infinite;
          padding:4px;
        }
        .sh-help-contact-inner{
          background:rgba(255,255,255,0.85);border-radius:12px;padding:24px;
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
        }

        .sh-help-premium-banner{
          background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%);
          border:1px solid #ddd6fe;border-radius:12px;padding:14px 18px;
          display:flex;align-items:center;gap:12px;
          transition:all .2s ease;
        }
        .sh-help-premium-banner:hover{box-shadow:0 4px 12px rgba(139,92,246,.08)}

        .sh-help-contact-grid{display:grid;grid-template-columns:1fr;gap:16px}
        @media(min-width:640px){.sh-help-contact-grid{grid-template-columns:1fr 1fr}}

        .sh-help-links{
          position:relative;overflow:hidden;border-radius:16px;padding:20px;
          background:linear-gradient(-45deg,#eef2ff,#e0e7ff,#c7d2fe,#ddd6fe);
          background-size:300% 300%;
          animation:sh-gradient-move 10s ease infinite;
          transition:all .25s ease;
        }
        .sh-help-links::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.4) 50%,transparent 60%);
          background-size:200% 200%;animation:sh-shimmer 4s ease-in-out infinite;pointer-events:none;
        }

        .sh-help-icon-float{animation:sh-float 3s ease-in-out infinite;display:inline-block}

        .sh-help-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
        .sh-help-badge-premium{background:rgba(139,92,246,0.12);color:#7c3aed;border:1px solid rgba(139,92,246,0.25)}
        .sh-help-badge-success{background:rgba(22,163,74,0.12);color:#15803d;border:1px solid rgba(22,163,74,0.25)}
        .sh-help-badge-info{background:rgba(99,102,241,0.1);color:#4338ca;border:1px solid rgba(99,102,241,0.2)}
      `}</style>

      <div style={{ maxWidth: "100%", overflowX: "hidden" }}>
      <BlockStack gap="500">

        {/* ═══ HERO ═══ */}
        <div className={`sh-help-hero ${isPremium ? 'premium' : 'free'}`}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="sh-help-glass" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: isPremium ? "rgba(139,92,246,0.15)" : "rgba(16,185,129,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, flexShrink: 0,
                }}>
                  <span className="sh-help-icon-float">{isPremium ? "👑" : "💬"}</span>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#1e1b4b" }}>
                    {isPremium ? "Premium Support" : "Help Center"}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                    {isPremium
                      ? "We personally handle your requests within 24–48h"
                      : "Guides, FAQs, and support for Section Hub"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
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
              </div>
            </div>

            {/* Quick stat pills */}
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              {[
                { icon: "📚", label: "FAQ Topics", value: `${FAQ_SECTIONS.length}` },
                { icon: "📋", label: "Guides", value: `${QUICK_GUIDES.length}` },
                { icon: "❓", label: "Questions", value: `${FAQ_SECTIONS.reduce((a, s) => a + s.items.length, 0)}` },
                { icon: "⚡", label: "Response", value: isPremium ? "24-48h" : "< 24h" },
              ].map((s) => (
                <div key={s.label} className="sh-help-glass-stat">
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{s.icon} {s.label}</div>
                  <div style={{ color: isPremium ? "#7c3aed" : "#047857", fontSize: 18, fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ QUICK START GUIDES ═══ */}
        <BlockStack gap="300">
          <InlineStack gap="200" blockAlign="center">
            <span style={{ fontSize: 18 }}>🚀</span>
            <Text as="h2" variant="headingMd">Quick Start Guides</Text>
          </InlineStack>

          <div className="sh-help-guide-grid">
            {QUICK_GUIDES.map((guide, idx) => (
              <div
                key={guide.title}
                className="sh-help-guide"
                onClick={() => setExpandedGuide(expandedGuide === idx ? null : idx)}
                onKeyDown={() => {}}
                role="button"
                tabIndex={0}
              >
                <BlockStack gap="300">
                  <InlineStack gap="300" blockAlign="center">
                    <div className="sh-help-guide-icon" style={{
                      background: idx === 0 ? "linear-gradient(135deg,#eff6ff,#dbeafe)" :
                                  idx === 1 ? "linear-gradient(135deg,#f5f3ff,#ede9fe)" :
                                  "linear-gradient(135deg,#ecfdf5,#d1fae5)",
                    }}>
                      {guide.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text as="h3" variant="headingSm">{guide.title}</Text>
                      <div style={{ marginTop: 2 }}>
                        <span className="sh-help-badge sh-help-badge-info">
                          {guide.steps.length} steps
                        </span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 14, color: "#94a3b8",
                      transform: expandedGuide === idx ? "rotate(180deg)" : "rotate(0)",
                      transition: "transform 0.25s ease",
                    }}>▾</span>
                  </InlineStack>

                  {expandedGuide === idx && (
                    <BlockStack gap="200">
                      {guide.steps.map((step, i) => (
                        <InlineStack key={i} gap="200" blockAlign="start">
                          <div className="sh-help-step-num">{i + 1}</div>
                          <Text as="p" variant="bodySm">{step}</Text>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </div>
            ))}
          </div>
        </BlockStack>

        {/* ═══ FAQ ═══ */}
        <div id="faq-section">
          <BlockStack gap="400">
            <InlineStack gap="200" blockAlign="center">
              <span style={{ fontSize: 18 }}>❓</span>
              <Text as="h2" variant="headingMd">Frequently Asked Questions</Text>
              <Badge>{`${FAQ_SECTIONS.reduce((a, s) => a + s.items.length, 0)} questions`}</Badge>
            </InlineStack>

            {FAQ_SECTIONS.map((section, sIdx) => (
              <div key={section.title} className="sh-help-faq-card" style={{ animationDelay: `${sIdx * 0.05}s` }}>
                <div className="sh-help-faq-header">
                  <div className="sh-help-faq-header-icon">{section.icon}</div>
                  <div style={{ flex: 1 }}>
                    <Text as="h3" variant="headingSm">{section.title}</Text>
                  </div>
                  <span className="sh-help-badge sh-help-badge-info">{section.items.length}</span>
                </div>
                <div>
                  {section.items.map((item, i) => (
                    <FaqItem key={i} question={item.q} answer={item.a} />
                  ))}
                </div>
              </div>
            ))}
          </BlockStack>
        </div>

        {/* ═══ CONTACT SUPPORT ═══ */}
        <div id="contact-section">
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <span style={{ fontSize: 18 }}>{isPremium ? "👑" : "💬"}</span>
              <Text as="h2" variant="headingMd">
                {isPremium ? "Premium Support" : "Contact Support"}
              </Text>
              {isPremium && <span className="sh-help-badge sh-help-badge-premium">Priority</span>}
            </InlineStack>

            <div className="sh-help-contact">
              <div className="sh-help-contact-inner">
                <BlockStack gap="400">

                  {isPremium && (
                    <div className="sh-help-premium-banner">
                      <span style={{ fontSize: 20 }}>🛠️</span>
                      <div>
                        <Text as="p" variant="bodySm" fontWeight="semibold">
                          <span style={{ color: "#4f46e5" }}>Hands-On Support included</span>
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Need a tweak or running into an issue? We handle it within 24–48h. Like having your own section developer.
                        </Text>
                      </div>
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
                      ? "Describe what you need — a customization, a fix, or anything else."
                      : "Send us a message directly. We usually respond within a few hours."}
                  </Text>

                  <div className="sh-help-contact-grid">
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
                        ? "👑 We'll handle your request within 24–48h"
                        : "📧 We'll reply to your store's Shopify email"}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </div>
            </div>
          </BlockStack>
        </div>

        {/* ═══ QUICK LINKS ═══ */}
        <div className="sh-help-links">
          <div className="sh-help-glass" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
            <span className="sh-help-icon-float" style={{ fontSize: 24 }}>🔍</span>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Text as="h2" variant="headingSm">Need more help?</Text>
              <Text as="p" variant="bodySm" tone="subdued">Explore the app or reach out to us</Text>
            </div>
            <InlineStack gap="200">
              <Button size="slim" onClick={() => navigate("/app/analyzer")}>Run Analyzer</Button>
              <Button size="slim" onClick={() => navigate("/app/explore")}>Browse Sections</Button>
              <Button size="slim" variant="primary" onClick={() => {
                const el = document.getElementById("contact-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}>
                {isPremium ? "Premium Support" : "Contact"}
              </Button>
            </InlineStack>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", padding: "4px 0 12px" }}>
          <Button url="/app/explore" variant="primary" size="slim">Explore Sections</Button>
          <Button url="/app/premium" size="slim">Premium</Button>
          <Button url="/app/suggest" variant="plain" size="slim">Suggest a Feature</Button>
        </div>

      </BlockStack>
      </div>
    </Page>
  );
}
