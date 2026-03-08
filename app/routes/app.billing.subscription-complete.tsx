import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import prisma from "../db.server";
import { setPremiumMetafield } from "../lib/premium-metafield.server";

const API_VERSION = "2024-10";

/**
 * Callback nach Shopify Abo-Genehmigung
 * URL: /app/billing/subscription-complete?shop=<shop>&charge_id=<id>
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";

  if (!shop) return redirect("/auth/login");

  // Offline-Session aus DB laden
  const session = await prisma.session.findFirst({
    where: { shop, isOnline: false },
    orderBy: { expires: "desc" },
  });

  if (!session?.accessToken) {
    console.warn(`No offline session for shop=${shop}`);
    return redirect("/auth/login");
  }

  // Subscription aus DB laden
  const subscription = await prisma.subscription.findUnique({
    where: { shop },
  });

  if (!subscription?.chargeId) {
    console.warn(`No pending subscription for shop=${shop}`);
    return redirect(`/app/premium`);
  }

  const shopHandle = shop.replace(".myshopify.com", "");
  const clientId = process.env.SHOPIFY_API_KEY || "fdaa930bde855ab7d9821c6c51375169";

  try {
    // Status bei Shopify prüfen
    const query = `
      query getSubscription($id: ID!) {
        node(id: $id) {
          ... on AppSubscription {
            id
            status
            name
          }
        }
      }
    `;

    const res = await fetch(
      `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": session.accessToken,
        },
        body: JSON.stringify({
          query,
          variables: { id: subscription.chargeId },
        }),
      },
    );

    const json = await res.json();
    const status = json?.data?.node?.status;
    console.log(`Subscription status for ${subscription.chargeId}: ${status}`);

    let redirectParam = "";

    if (status === "ACTIVE" || status === "ACCEPTED") {
      await prisma.subscription.update({
        where: { shop },
        data: { plan: "premium", status: "active" },
      });
      // Set shop metafield so premium blocks render in the storefront
      await setPremiumMetafield(shop, session.accessToken, true);
      console.log(`✅ Premium activated for ${shop}`);
      redirectParam = "subscribed=true";
    } else if (status === "DECLINED" || status === "EXPIRED" || status === "CANCELLED") {
      await prisma.subscription.update({
        where: { shop },
        data: { status: "cancelled" },
      });
      // Remove premium metafield so premium blocks stop rendering
      await setPremiumMetafield(shop, session.accessToken, false);
      redirectParam = "subscription=declined";
    }

    // Render a page that redirects via Shopify App Bridge or top-level navigation
    const targetUrl = `https://admin.shopify.com/store/${shopHandle}/apps/${clientId}/app/premium${redirectParam ? `?${redirectParam}` : ""}`;
    
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
</head>
<body>
  <p>Redirecting back to SectionIQ...</p>
  <script>
    // Try top-level redirect (works when not in iframe)
    if (window.top === window.self) {
      window.location.href = ${JSON.stringify(targetUrl)};
    } else {
      // In iframe context, use parent redirect
      window.top.location.href = ${JSON.stringify(targetUrl)};
    }
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=${targetUrl}" />
  </noscript>
</body>
</html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  } catch (error) {
    console.error("Subscription verify error:", error);
    const targetUrl = `https://admin.shopify.com/store/${shopHandle}/apps/${clientId}/app/premium?subscription=error`;
    return new Response(
      `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting...</title></head>
<body>
  <p>Redirecting...</p>
  <script>
    if (window.top === window.self) {
      window.location.href = ${JSON.stringify(targetUrl)};
    } else {
      window.top.location.href = ${JSON.stringify(targetUrl)};
    }
  </script>
  <noscript><meta http-equiv="refresh" content="0;url=${targetUrl}" /></noscript>
</body>
</html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
};
