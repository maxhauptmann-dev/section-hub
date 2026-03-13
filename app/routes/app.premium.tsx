import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { useEffect } from "react";
import { authenticate } from "../shopify.server";
import { getAllSections } from "../lib/sections.server";
import prisma from "../db.server";
import { setPremiumMetafieldViaAdmin } from "../lib/premium-metafield.server";
import { checkIsPremium } from "../lib/is-premium.server";
import {
  Page,
  Text,
  Button,
  Banner,
} from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  const { isPremium, isCancelling, currentPeriodEnd } = await checkIsPremium(session.shop);
  const periodEnd = currentPeriodEnd?.toISOString() || null;
  const totalSections = getAllSections().length;
  const paidSections = getAllSections().filter(s => s.price?.type !== "free").length;

  // Sync premium metafield for storefront blocks
  try {
    const metaResult = await setPremiumMetafieldViaAdmin(admin, isPremium);
    console.log(`Premium metafield synced: isPremium=${isPremium}`, JSON.stringify(metaResult?.data?.metafieldsSet?.metafields || metaResult?.data?.metafieldsSet?.userErrors || "no data"));
  } catch (e) {
    console.error("Failed to sync premium metafield:", e);
  }

  return { isPremium, isCancelling, periodEnd, totalSections, paidSections };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "cancel") {
    const subscription = await prisma.subscription.findUnique({ where: { shop } });

    if (!subscription || subscription.status !== "active" || !subscription.chargeId) {
      return Response.json({ success: false, error: "No active subscription found." });
    }

    try {
      // First, get the current period end date from Shopify
      const subQueryResponse = await admin.graphql(
        `#graphql
        query getSubscription($id: ID!) {
          node(id: $id) {
            ... on AppSubscription {
              id
              status
              currentPeriodEnd
            }
          }
        }`,
        { variables: { id: subscription.chargeId } },
      );
      const subQueryJson = await subQueryResponse.json();
      const currentPeriodEnd = subQueryJson.data?.node?.currentPeriodEnd;
      console.log(`Subscription currentPeriodEnd: ${currentPeriodEnd}`);

      // Cancel the subscription at Shopify
      const response = await admin.graphql(
        `#graphql
        mutation appSubscriptionCancel($id: ID!) {
          appSubscriptionCancel(id: $id) {
            appSubscription { id status }
            userErrors { field message }
          }
        }`,
        { variables: { id: subscription.chargeId } },
      );

      const json = await response.json();

      const result = json.data?.appSubscriptionCancel;
      if (result?.userErrors?.length > 0) {
        const errors = result.userErrors.map((e: { message: string }) => e.message).join(", ");
        return Response.json({ success: false, error: errors });
      }

      // Set status to "cancelling" – blocks stay active until currentPeriodEnd
      await prisma.subscription.update({
        where: { shop },
        data: {
          status: "cancelling",
          cancelledAt: new Date(),
          currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : new Date(),
        },
      });

      // DON'T set metafield to inactive yet – blocks stay active until period ends

      return Response.json({ success: true, cancelled: true, periodEnd: currentPeriodEnd });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      return Response.json({ success: false, error: "Error cancelling subscription. Please try again." });
    }
  }

  return Response.json({ success: false, error: "Unknown action" });
};

export default function PremiumPage() {
  const { isPremium, isCancelling: subscriptionCancelling, periodEnd, totalSections, paidSections } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ confirmationUrl?: string; error?: string; alreadyPremium?: boolean }>();
  const cancelFetcher = useFetcher<{ success?: boolean; cancelled?: boolean; error?: string }>();
  const navigate = useNavigate();
  const isLoading = fetcher.state !== "idle";
  const isCancelLoading = cancelFetcher.state !== "idle";

  const periodEndDate = periodEnd ? new Date(periodEnd) : null;
  const periodEndFormatted = periodEndDate
    ? periodEndDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  // When we receive a confirmationUrl, redirect to Shopify billing page
  useEffect(() => {
    const url = fetcher.data?.confirmationUrl;
    if (url) {
      // In Shopify embedded apps, window.top is cross-origin (admin.shopify.com)
      // so we can't access window.top.location directly.
      // Use window.open with _top target - App Bridge intercepts this.
      // Fall back to window.location.assign which also works in the iframe.
      try {
        window.open(url, "_top");
      } catch {
        window.location.assign(url);
      }
    }
  }, [fetcher.data]);

  // Nach erfolgreicher Kündigung Seite neu laden
  if (cancelFetcher.data?.cancelled) {
    window.location.reload();
  }

  return (
    <Page
      title=""
      backAction={{ onAction: () => navigate("/app") }}
    >
      <style>{`
        @keyframes pm-gradient-move{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes pm-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes pm-fade-up{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes pm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes pm-pulse{0%,100%{box-shadow:0 2px 20px rgba(139,92,246,0.1)}50%{box-shadow:0 8px 40px rgba(139,92,246,0.2)}}
        @keyframes pm-crown-spin{0%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-4px) rotate(5deg)}50%{transform:translateY(0) rotate(0deg)}75%{transform:translateY(-4px) rotate(-5deg)}100%{transform:translateY(0) rotate(0deg)}}
        @keyframes pm-glow{0%,100%{text-shadow:0 0 20px rgba(255,255,255,0.3)}50%{text-shadow:0 0 40px rgba(255,255,255,0.6)}}

        .pm-page{max-width:720px;margin:0 auto}

        .pm-hero{
          position:relative;overflow:hidden;border-radius:20px;padding:44px 36px;text-align:center;
          background:linear-gradient(-45deg,#f5f3ff,#ede9fe,#ddd6fe,#c4b5fd);
          background-size:300% 300%;
          animation:pm-gradient-move 10s ease infinite, pm-pulse 5s ease-in-out infinite;
        }
        .pm-hero::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.5) 50%,transparent 60%);
          background-size:200% 200%;animation:pm-shimmer 4s ease-in-out infinite;pointer-events:none;
        }
        .pm-hero::after{
          content:'';position:absolute;top:-40%;right:-20%;width:70%;height:80%;
          background:radial-gradient(circle,rgba(139,92,246,0.12) 0%,transparent 70%);pointer-events:none;
        }

        .pm-glass{
          background:rgba(255,255,255,0.65);
          backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
          border:1px solid rgba(255,255,255,0.8);
          border-radius:16px;padding:28px 24px;
          box-shadow:0 2px 16px rgba(0,0,0,0.04);
        }

        .pm-crown{font-size:52px;display:block;line-height:1;margin-bottom:12px;animation:pm-crown-spin 4s ease-in-out infinite}
        .pm-title{font-size:30px;font-weight:800;color:#1e1b4b;margin:0 0 6px;letter-spacing:-.5px}
        .pm-subtitle{font-size:15px;color:#64748b;margin:0 0 24px}

        .pm-price-row{display:flex;align-items:baseline;justify-content:center;gap:4px;margin-bottom:26px}
        .pm-price{font-size:56px;font-weight:800;color:#4f46e5;letter-spacing:-2px;animation:pm-glow 3s ease-in-out infinite}
        .pm-per{font-size:16px;color:#94a3b8;font-weight:500}

        .pm-cta-wrap{position:relative;z-index:1}
        .pm-cta{
          display:inline-flex;align-items:center;gap:8px;
          background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:none;
          padding:14px 36px;border-radius:14px;font-size:16px;font-weight:700;
          cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);
          box-shadow:0 6px 24px rgba(99,102,241,.3);letter-spacing:.2px;
        }
        .pm-cta:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 10px 36px rgba(99,102,241,.4)}
        .pm-cta:active{transform:translateY(0) scale(0.98)}
        .pm-cancel-note{font-size:12px;color:#94a3b8;margin-top:14px}

        .pm-active-badge{
          display:inline-flex;align-items:center;gap:8px;
          background:rgba(220,252,231,0.7);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(187,247,208,0.6);
          color:#15803d;padding:12px 28px;border-radius:12px;font-size:15px;font-weight:700;
        }

        .pm-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px}
        .pm-stat{
          background:rgba(255,255,255,0.6);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(226,232,240,0.5);
          border-radius:14px;padding:20px 14px;text-align:center;
          transition:all .25s cubic-bezier(.4,0,.2,1);
          box-shadow:0 1px 4px rgba(0,0,0,0.04);
          animation:pm-fade-up .4s cubic-bezier(.4,0,.2,1) both;
        }
        .pm-stat:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.08);background:rgba(255,255,255,0.8)}
        .pm-stat-num{font-size:30px;font-weight:800;color:#4f46e5}
        .pm-stat-label{font-size:12px;color:#64748b;margin-top:3px;font-weight:500}

        .pm-features{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}
        .pm-feat{
          display:flex;align-items:flex-start;gap:14px;
          background:rgba(255,255,255,0.6);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(226,232,240,0.5);
          border-radius:14px;padding:18px 20px;
          transition:all .3s cubic-bezier(.4,0,.2,1);
          box-shadow:0 1px 4px rgba(0,0,0,0.04);
          animation:pm-fade-up .4s cubic-bezier(.4,0,.2,1) both;
        }
        .pm-feat:hover{border-color:#c7d2fe;box-shadow:0 8px 24px rgba(99,102,241,.1);transform:translateY(-3px)}
        .pm-feat:hover .pm-feat-icon{animation:pm-float .5s ease}
        .pm-feat-icon{
          width:42px;height:42px;border-radius:12px;
          display:flex;align-items:center;justify-content:center;
          font-size:22px;flex-shrink:0;transition:transform .2s;
        }
        .pm-feat-title{font-size:14px;font-weight:700;color:#1e1b4b}
        .pm-feat-desc{font-size:12px;color:#64748b;margin-top:3px;line-height:1.5}

        .pm-compare{
          margin-top:20px;
          background:rgba(255,255,255,0.6);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(226,232,240,0.5);
          border-radius:16px;overflow:hidden;
          box-shadow:0 2px 12px rgba(0,0,0,0.04);
          animation:pm-fade-up .5s cubic-bezier(.4,0,.2,1) both;
          animation-delay:.15s;
        }
        .pm-compare-header{
          display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;
          background:rgba(245,243,255,0.6);
          backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
          border-bottom:1px solid rgba(226,232,240,0.4);
        }
        .pm-compare-header>div{padding:14px 18px;font-size:13px;font-weight:700;color:#374151}
        .pm-compare-header>div:nth-child(3){color:#4f46e5}
        .pm-compare-row{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid rgba(241,245,249,0.5);transition:background .2s}
        .pm-compare-row:last-child{border-bottom:none}
        .pm-compare-row:hover{background:rgba(245,243,255,0.3)}
        .pm-compare-row>div{padding:13px 18px;font-size:13px;display:flex;align-items:center}
        .pm-compare-row>div:first-child{font-weight:600;color:#374151}
        .pm-compare-row>div:nth-child(2){color:#94a3b8;justify-content:center}
        .pm-compare-row>div:nth-child(3){color:#22c55e;font-weight:600;justify-content:center}

        .pm-faq{margin-top:20px}
        .pm-faq-item{
          background:rgba(255,255,255,0.6);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(226,232,240,0.5);
          border-radius:14px;padding:18px 22px;margin-bottom:10px;
          transition:all .25s cubic-bezier(.4,0,.2,1);
          box-shadow:0 1px 4px rgba(0,0,0,0.04);
          animation:pm-fade-up .4s cubic-bezier(.4,0,.2,1) both;
        }
        .pm-faq-item:hover{border-color:#c7d2fe;box-shadow:0 4px 16px rgba(99,102,241,.08);transform:translateY(-2px)}
        .pm-faq-q{font-size:14px;font-weight:700;color:#1e1b4b}
        .pm-faq-a{font-size:13px;color:#64748b;margin-top:6px;line-height:1.5}

        .pm-bottom-cta{
          margin-top:20px;text-align:center;
          position:relative;overflow:hidden;border-radius:18px;padding:32px 28px;
          background:linear-gradient(-45deg,#f5f3ff,#ede9fe,#ddd6fe,#c4b5fd);
          background-size:300% 300%;
          animation:pm-gradient-move 12s ease infinite;
        }
        .pm-bottom-cta::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.4) 50%,transparent 60%);
          background-size:200% 200%;animation:pm-shimmer 5s ease-in-out infinite;pointer-events:none;
        }

        .pm-active-section{
          margin-top:20px;text-align:center;
          position:relative;overflow:hidden;border-radius:18px;padding:32px 28px;
          background:linear-gradient(-45deg,#ecfdf5,#d1fae5,#a7f3d0,#bbf7d0);
          background-size:300% 300%;
          animation:pm-gradient-move 10s ease infinite;
        }
        .pm-active-section::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.45) 50%,transparent 60%);
          background-size:200% 200%;animation:pm-shimmer 4s ease-in-out infinite;pointer-events:none;
        }

        .pm-ending-section{
          margin-top:20px;text-align:center;
          position:relative;overflow:hidden;border-radius:18px;padding:32px 28px;
          background:linear-gradient(-45deg,#fffbeb,#fef3c7,#fde68a,#fcd34d);
          background-size:300% 300%;
          animation:pm-gradient-move 10s ease infinite;
        }
        .pm-ending-section::before{
          content:'';position:absolute;top:0;left:0;right:0;bottom:0;
          background:linear-gradient(135deg,transparent 40%,rgba(255,255,255,0.4) 50%,transparent 60%);
          background-size:200% 200%;animation:pm-shimmer 5s ease-in-out infinite;pointer-events:none;
        }

        .pm-cancel-section{
          margin-top:20px;text-align:center;
          background:rgba(255,255,255,0.5);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(226,232,240,0.4);
          border-radius:14px;padding:22px 24px;
        }

        .pm-cta-upgrade{
          display:inline-flex;align-items:center;gap:8px;
          background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;border:none;
          padding:12px 28px;border-radius:12px;font-size:14px;font-weight:700;
          cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);
          box-shadow:0 4px 16px rgba(99,102,241,.25);
        }
        .pm-cta-upgrade:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(99,102,241,.35)}

        @media(max-width:640px){
          .pm-features{grid-template-columns:1fr}
          .pm-stats{grid-template-columns:1fr 1fr 1fr}
          .pm-hero{padding:28px 20px}
          .pm-price{font-size:44px}
        }
      `}</style>

      <div className="pm-page">

        {/* ═══ HERO ═══ */}
        <div className="pm-hero">
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="pm-glass">
              <span className="pm-crown">👑</span>
              <h1 className="pm-title">SectionIQ Premium</h1>
              <p className="pm-subtitle">All sections. One subscription. No limits.</p>

              <div className="pm-price-row">
                <span className="pm-price">€8</span>
                <span className="pm-per">/month</span>
              </div>

              <div className="pm-cta-wrap">
                {isPremium && !subscriptionCancelling ? (
                  <div className="pm-active-badge">✓ Premium Active</div>
                ) : isPremium && subscriptionCancelling ? (
                  <div className="pm-active-badge" style={{ background: "rgba(254,243,199,0.7)", color: "#92400e", borderColor: "rgba(253,230,138,0.6)" }}>
                    ⏳ Active until {periodEndFormatted}
                  </div>
                ) : (
                  <fetcher.Form method="post" action="/app/api/subscribe">
                    <button className="pm-cta" type="submit" disabled={isLoading}>
                      {isLoading ? "Redirecting..." : "🚀 Upgrade Now"}
                    </button>
                  </fetcher.Form>
                )}
              </div>
              <p className="pm-cancel-note">Cancel anytime · Test charges won't be billed</p>
            </div>
          </div>
        </div>

        {/* ═══ STATS ═══ */}
        <div className="pm-stats">
          {[
            { num: totalSections, label: "Total Sections", delay: "0s" },
            { num: paidSections, label: "Premium Sections", delay: ".06s" },
            { num: "∞", label: "Installs", delay: ".12s" },
          ].map((s) => (
            <div key={s.label} className="pm-stat" style={{ animationDelay: s.delay }}>
              <div className="pm-stat-num">{s.num}</div>
              <div className="pm-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ═══ FEATURES ═══ */}
        <div className="pm-features">
          {[
            { icon: "📦", bg: "#ede9fe", title: "All Sections Included", desc: "Install any section from our library – no extra cost per section", delay: "0s" },
            { icon: "🆕", bg: "#e0f2fe", title: "New Sections Monthly", desc: "Get instant access to every new section we release", delay: ".05s" },
            { icon: "⚡", bg: "#fef3c7", title: "One-Click Install", desc: "Install directly to your live theme in seconds", delay: ".1s" },
            { icon: "🎯", bg: "#dcfce7", title: "Premium Blocks", desc: "All conversion blocks unlocked for maximum impact", delay: ".15s" },
            { icon: "🔄", bg: "#fce7f3", title: "Lifetime Updates", desc: "Every section stays current with free updates forever", delay: ".2s" },
            { icon: "🛠️", bg: "#fff7ed", title: "Hands-On Support", desc: "Need a tweak or running into an issue? We fix it for you within 24–48h", delay: ".25s" },
          ].map((f) => (
            <div className="pm-feat" key={f.title} style={{ animationDelay: f.delay }}>
              <div className="pm-feat-icon" style={{ background: f.bg }}>{f.icon}</div>
              <div>
                <div className="pm-feat-title">{f.title}</div>
                <div className="pm-feat-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ COMPARISON TABLE ═══ */}
        <div className="pm-compare">
          <div className="pm-compare-header">
            <div>Feature</div>
            <div style={{ textAlign: "center" }}>Free</div>
            <div style={{ textAlign: "center" }}>Premium</div>
          </div>
          {[
            ["Sections", "Free only", "All sections"],
            ["Section Installs", "Limited", "Unlimited"],
            ["New Sections", "—", "Instant access"],
            ["Conversion Blocks", "—", "All blocks"],
            ["Section Updates", "—", "Included"],
            ["Store Analyzer", "✓", "✓"],
            ["Try Before Install", "✓", "✓"],
            ["Support", "Standard", "Hands-on · 24–48h"],
          ].map(([feature, free, premium]) => (
            <div className="pm-compare-row" key={feature}>
              <div>{feature}</div>
              <div>{free}</div>
              <div>{premium}</div>
            </div>
          ))}
        </div>

        {/* ═══ FAQ ═══ */}
        <div className="pm-faq">
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e1b4b", marginBottom: 14 }}>Frequently Asked Questions</div>
          {[
            {
              q: "Can I cancel anytime?",
              a: "Yes! Cancel your subscription at any time through Shopify. No questions asked, no hidden fees.",
              delay: "0s",
            },
            {
              q: "What happens to installed sections if I cancel?",
              a: "Sections you've already installed stay in your theme. You just won't be able to install new premium sections.",
              delay: ".05s",
            },
            {
              q: "Do I get new sections automatically?",
              a: "Yes! Every new section we release is instantly available for Premium subscribers at no extra cost.",
              delay: ".1s",
            },
            {
              q: "Is there a free trial?",
              a: "You can try any section in a demo theme for 24 hours before subscribing. This way you see exactly what you get!",
              delay: ".15s",
            },
            {
              q: "What if I need help or want changes to a section?",
              a: "Just reach out! We personally handle customization requests and fix issues within 24–48 hours depending on the scope of the change. It's like having your own section developer.",
              delay: ".2s",
            },
          ].map((item) => (
            <div className="pm-faq-item" key={item.q} style={{ animationDelay: item.delay }}>
              <div className="pm-faq-q">{item.q}</div>
              <div className="pm-faq-a">{item.a}</div>
            </div>
          ))}
        </div>

        {/* ═══ BOTTOM CTA ═══ */}
        {!isPremium && (
          <div className="pm-bottom-cta">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="pm-glass" style={{ padding: "24px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 8, animation: "pm-float 3s ease-in-out infinite" }}>👑</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1e1b4b", margin: "0 0 6px" }}>
                  Ready to upgrade your store?
                </div>
                <div style={{ fontSize: 13, color: "#64748b", margin: "0 0 18px" }}>
                  Join merchants who boost conversions with premium sections
                </div>
                <fetcher.Form method="post" action="/app/api/subscribe">
                  <button className="pm-cta-upgrade" type="submit" disabled={isLoading}>
                    {isLoading ? "Redirecting..." : "Upgrade to Premium – €8/month"}
                  </button>
                </fetcher.Form>
              </div>
            </div>
          </div>
        )}

        {/* ═══ ALREADY PREMIUM ═══ */}
        {isPremium && !subscriptionCancelling && (
          <div className="pm-active-section">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="pm-glass" style={{ padding: "24px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 8, animation: "pm-float 3s ease-in-out infinite" }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#166534", margin: "0 0 6px" }}>
                  You're on Premium!
                </div>
                <div style={{ fontSize: 13, color: "#15803d", margin: "0 0 18px" }}>
                  All sections are unlocked. Install anything with one click.
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <Button onClick={() => navigate("/app/explore")}>Browse Sections</Button>
                  <Button variant="plain" onClick={() => navigate("/app/analyzer")}>Run Analyzer</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SUBSCRIPTION ENDING NOTICE ═══ */}
        {subscriptionCancelling && (
          <div className="pm-ending-section">
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="pm-glass" style={{ padding: "24px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 8, animation: "pm-float 3s ease-in-out infinite" }}>⏳</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#92400e", margin: "0 0 6px" }}>
                  Your subscription ends {periodEndFormatted}
                </div>
                <div style={{ fontSize: 13, color: "#b45309", margin: "0 0 18px", lineHeight: 1.5 }}>
                  You still have full access to all premium features until then. After that, premium sections and blocks will be deactivated.
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <Button onClick={() => navigate("/app/explore")}>Browse Sections</Button>
                  <fetcher.Form method="post" action="/app/api/subscribe">
                    <Button variant="primary" tone="success" loading={isLoading} submit>
                      Resubscribe
                    </Button>
                  </fetcher.Form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CANCEL SUBSCRIPTION ═══ */}
        {isPremium && !subscriptionCancelling && (
          <div className="pm-cancel-section">
            {cancelFetcher.data?.error && (
              <div style={{ marginBottom: 12 }}>
                <Banner tone="critical" title="Error">
                  <Text as="p" variant="bodySm">{cancelFetcher.data.error}</Text>
                </Banner>
              </div>
            )}
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 12px" }}>
              Want to cancel? Installed sections will stay in your theme.
            </p>
            <cancelFetcher.Form method="post">
              <input type="hidden" name="intent" value="cancel" />
              <Button variant="plain" tone="critical" loading={isCancelLoading} submit>
                Cancel Subscription
              </Button>
            </cancelFetcher.Form>
          </div>
        )}
      </div>
    </Page>
  );
}
