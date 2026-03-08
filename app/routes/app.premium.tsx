import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useNavigate, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import { getAllSections } from "../lib/sections.server";
import prisma from "../db.server";
import { setPremiumMetafieldViaAdmin } from "../lib/premium-metafield.server";
import { checkIsPremium } from "../lib/is-premium.server";
import {
  Page,
  Text,
  Button,
  Badge,
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
      console.log("Subscription cancel response:", JSON.stringify(json, null, 2));

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
  const fetcher = useFetcher<{ confirmationUrl?: string; error?: string }>();
  const cancelFetcher = useFetcher<{ success?: boolean; cancelled?: boolean; error?: string }>();
  const navigate = useNavigate();
  const isLoading = fetcher.state !== "idle";
  const isCancelLoading = cancelFetcher.state !== "idle";

  const periodEndDate = periodEnd ? new Date(periodEnd) : null;
  const periodEndFormatted = periodEndDate
    ? periodEndDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  if (fetcher.data?.confirmationUrl) {
    window.open(fetcher.data.confirmationUrl, "_top");
  }

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
        .pm-page { max-width: 720px; margin: 0 auto; }
        .pm-hero {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4f46e5 100%);
          border-radius: 20px; padding: 40px 36px; text-align: center;
          position: relative; overflow: hidden;
        }
        .pm-hero::before {
          content: ""; position: absolute; top: -60px; right: -60px;
          width: 200px; height: 200px; border-radius: 50%;
          background: rgba(139,92,246,0.3); filter: blur(60px);
        }
        .pm-hero::after {
          content: ""; position: absolute; bottom: -40px; left: -40px;
          width: 160px; height: 160px; border-radius: 50%;
          background: rgba(99,102,241,0.25); filter: blur(50px);
        }
        .pm-crown { font-size: 48px; margin-bottom: 8px; display: block; line-height: 1; }
        .pm-title { color: white; font-size: 28px; font-weight: 800; margin: 0 0 6px; }
        .pm-subtitle { color: rgba(255,255,255,0.7); font-size: 15px; margin: 0 0 24px; }
        .pm-price-row { display: flex; align-items: baseline; justify-content: center; gap: 4px; margin-bottom: 24px; }
        .pm-price { color: white; font-size: 52px; font-weight: 800; letter-spacing: -2px; }
        .pm-per { color: rgba(255,255,255,0.6); font-size: 16px; }
        .pm-cta-wrap { position: relative; z-index: 1; }
        .pm-cta {
          display: inline-flex; align-items: center; gap: 8px;
          background: white; color: #312e81; border: none;
          padding: 14px 36px; border-radius: 14px; font-size: 16px; font-weight: 700;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .pm-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
        .pm-cancel { color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 12px; }

        .pm-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 20px; }
        .pm-stat {
          background: #f8fafc; border-radius: 14px; padding: 18px 14px; text-align: center;
          border: 1px solid #e2e8f0;
        }
        .pm-stat-num { font-size: 28px; font-weight: 800; color: #4f46e5; }
        .pm-stat-label { font-size: 12px; color: #64748b; margin-top: 2px; }

        .pm-features { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
        .pm-feat {
          display: flex; align-items: flex-start; gap: 12px;
          background: white; border: 1px solid #e2e8f0; border-radius: 14px;
          padding: 16px 18px; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pm-feat:hover { border-color: #c7d2fe; box-shadow: 0 2px 12px rgba(99,102,241,0.08); }
        .pm-feat-icon {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; flex-shrink: 0;
        }
        .pm-feat-title { font-size: 14px; font-weight: 600; color: #1e293b; }
        .pm-feat-desc { font-size: 12px; color: #64748b; margin-top: 2px; }

        .pm-compare { margin-top: 20px; background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
        .pm-compare-header {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0;
          background: #f8fafc; border-bottom: 1px solid #e2e8f0;
        }
        .pm-compare-header > div { padding: 14px 18px; font-size: 13px; font-weight: 700; color: #374151; }
        .pm-compare-header > div:nth-child(3) { color: #4f46e5; }
        .pm-compare-row { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #f1f5f9; }
        .pm-compare-row:last-child { border-bottom: none; }
        .pm-compare-row > div { padding: 12px 18px; font-size: 13px; display: flex; align-items: center; }
        .pm-compare-row > div:first-child { font-weight: 500; color: #374151; }
        .pm-compare-row > div:nth-child(2) { color: #94a3b8; justify-content: center; }
        .pm-compare-row > div:nth-child(3) { color: #22c55e; font-weight: 600; justify-content: center; }

        .pm-faq { margin-top: 20px; }
        .pm-faq-item {
          border: 1px solid #e2e8f0; border-radius: 12px;
          padding: 16px 20px; margin-bottom: 8px; background: white;
        }
        .pm-faq-q { font-size: 14px; font-weight: 600; color: #1e293b; }
        .pm-faq-a { font-size: 13px; color: #64748b; margin-top: 6px; }

        .pm-bottom-cta {
          margin-top: 20px; text-align: center;
          background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
          border: 1px solid #ddd6fe; border-radius: 16px; padding: 28px 24px;
        }

        .pm-active-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(34,197,94,0.15); color: #16a34a;
          padding: 10px 24px; border-radius: 12px; font-size: 15px; font-weight: 700;
        }

        @media(max-width: 640px) {
          .pm-features { grid-template-columns: 1fr; }
          .pm-stats { grid-template-columns: 1fr 1fr 1fr; }
          .pm-hero { padding: 28px 20px; }
          .pm-price { font-size: 40px; }
        }
      `}</style>

      <div className="pm-page">
        {fetcher.data?.error && (
          <div style={{ marginBottom: 16 }}>
            <Banner tone="critical" title="Error">
              <Text as="p" variant="bodySm">{fetcher.data.error}</Text>
            </Banner>
          </div>
        )}

        {/* ═══ HERO ═══ */}
        <div className="pm-hero">
          <div className="pm-crown">👑</div>
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
              <div className="pm-active-badge" style={{ background: "rgba(251,191,36,0.15)", color: "#b45309" }}>
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
          <p className="pm-cancel">Cancel anytime · Test charges won't be billed</p>
        </div>

        {/* ═══ STATS ═══ */}
        <div className="pm-stats">
          <div className="pm-stat">
            <div className="pm-stat-num">{totalSections}</div>
            <div className="pm-stat-label">Total Sections</div>
          </div>
          <div className="pm-stat">
            <div className="pm-stat-num">{paidSections}</div>
            <div className="pm-stat-label">Premium Sections</div>
          </div>
          <div className="pm-stat">
            <div className="pm-stat-num">∞</div>
            <div className="pm-stat-label">Installs</div>
          </div>
        </div>

        {/* ═══ FEATURES ═══ */}
        <div className="pm-features">
          {[
            { icon: "📦", bg: "#ede9fe", title: "All Sections Included", desc: "Install any section from our library – no extra cost per section" },
            { icon: "🆕", bg: "#e0f2fe", title: "New Sections Monthly", desc: "Get instant access to every new section we release" },
            { icon: "⚡", bg: "#fef3c7", title: "One-Click Install", desc: "Install directly to your live theme in seconds" },
            { icon: "🎯", bg: "#dcfce7", title: "Premium Blocks", desc: "All conversion blocks unlocked for maximum impact" },
            { icon: "🔄", bg: "#fce7f3", title: "Lifetime Updates", desc: "Every section stays current with free updates forever" },
            { icon: "🛠️", bg: "#fff7ed", title: "Hands-On Support", desc: "Need a tweak or running into an issue? We fix it for you within 24–48h" },
          ].map((f) => (
            <div className="pm-feat" key={f.title}>
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
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Frequently Asked Questions</h2>
          {[
            {
              q: "Can I cancel anytime?",
              a: "Yes! Cancel your subscription at any time through Shopify. No questions asked, no hidden fees.",
            },
            {
              q: "What happens to installed sections if I cancel?",
              a: "Sections you've already installed stay in your theme. You just won't be able to install new premium sections.",
            },
            {
              q: "Do I get new sections automatically?",
              a: "Yes! Every new section we release is instantly available for Premium subscribers at no extra cost.",
            },
            {
              q: "Is there a free trial?",
              a: "You can try any section in a demo theme for 24 hours before subscribing. This way you see exactly what you get!",
            },
            {
              q: "What if I need help or want changes to a section?",
              a: "Just reach out! We personally handle customization requests and fix issues within 24–48 hours depending on the scope of the change. It's like having your own section developer.",
            },
          ].map((item) => (
            <div className="pm-faq-item" key={item.q}>
              <div className="pm-faq-q">{item.q}</div>
              <div className="pm-faq-a">{item.a}</div>
            </div>
          ))}
        </div>

        {/* ═══ BOTTOM CTA ═══ */}
        {!isPremium && (
          <div className="pm-bottom-cta">
            <div style={{ fontSize: 28, marginBottom: 8 }}>👑</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#312e81", margin: "0 0 6px" }}>
              Ready to upgrade your store?
            </h3>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
              Join merchants who boost conversions with premium sections
            </p>
            <fetcher.Form method="post" action="/app/api/subscribe">
              <Button variant="primary" size="large" loading={isLoading} submit>
                Upgrade to Premium – €8/month
              </Button>
            </fetcher.Form>
          </div>
        )}

        {/* ═══ ALREADY PREMIUM ═══ */}
        {isPremium && !subscriptionCancelling && (
          <div style={{
            marginTop: 20, textAlign: "center",
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "1px solid #bbf7d0", borderRadius: 16, padding: "28px 24px",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#166534", margin: "0 0 6px" }}>
              You're on Premium!
            </h3>
            <p style={{ fontSize: 13, color: "#4ade80", margin: "0 0 16px" }}>
              All sections are unlocked. Install anything with one click.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <Button onClick={() => navigate("/app/explore")}>Browse Sections</Button>
              <Button variant="plain" onClick={() => navigate("/app/analyzer")}>Run Analyzer</Button>
            </div>
          </div>
        )}

        {/* ═══ SUBSCRIPTION ENDING NOTICE ═══ */}
        {subscriptionCancelling && (
          <div style={{
            marginTop: 20, textAlign: "center",
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            border: "1px solid #fde68a", borderRadius: 16, padding: "28px 24px",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#92400e", margin: "0 0 6px" }}>
              Your subscription ends {periodEndFormatted}
            </h3>
            <p style={{ fontSize: 13, color: "#b45309", margin: "0 0 16px" }}>
              You still have full access to all premium features until then. After that, premium sections and blocks will be deactivated.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <Button onClick={() => navigate("/app/explore")}>Browse Sections</Button>
              <fetcher.Form method="post" action="/app/api/subscribe">
                <Button variant="primary" tone="success" loading={isLoading} submit>
                  Resubscribe
                </Button>
              </fetcher.Form>
            </div>
          </div>
        )}

        {/* ═══ CANCEL SUBSCRIPTION ═══ */}
        {isPremium && !subscriptionCancelling && (
          <div style={{
            marginTop: 20, textAlign: "center",
            background: "#fafafa", border: "1px solid #e5e7eb",
            borderRadius: 12, padding: "20px 24px",
          }}>
            {cancelFetcher.data?.error && (
              <div style={{ marginBottom: 12 }}>
                <Banner tone="critical" title="Error">
                  <Text as="p" variant="bodySm">{cancelFetcher.data.error}</Text>
                </Banner>
              </div>
            )}
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 12px" }}>
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
