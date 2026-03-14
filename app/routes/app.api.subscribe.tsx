import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * API Route: Erstellt ein monatliches Abo (Recurring Charge)
 * POST /app/api/subscribe
 *
 * Called via fetcher (XHR). On success, returns either:
 * - A 401 with X-Shopify-API-Request-Failure-Reauthorize-Url header
 *   (App Bridge intercepts this and navigates to the billing URL cleanly)
 * - Or a JSON response with confirmationUrl as fallback
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // Prüfen ob bereits Premium
  const existing = await prisma.subscription.findUnique({
    where: { shop },
  });

  if (existing?.plan === "premium" && existing?.status === "active") {
    return Response.json({ success: true, alreadyPremium: true });
  }

  const appUrl =
    process.env.SHOPIFY_APP_URL || "https://section-hub-app.fly.dev";
  const returnUrl = `${appUrl}/app/billing/subscription-complete?shop=${encodeURIComponent(shop)}`;

  // Development stores cannot accept real charges – use test mode
  const isTestCharge = shop.includes("sections-test") || process.env.NODE_ENV === "development";

  const response = await admin.graphql(
    `#graphql
    mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean!) {
      appSubscriptionCreate(name: $name, lineItems: $lineItems, returnUrl: $returnUrl, test: $test) {
        appSubscription {
          id
          status
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        name: "Section Hub Premium",
        returnUrl,
        test: isTestCharge,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: "8.00", currencyCode: "EUR" },
                interval: "EVERY_30_DAYS",
              },
            },
          },
        ],
      },
    },
  );

  const json = await response.json();

  const result = json.data?.appSubscriptionCreate;

  if (result?.userErrors?.length > 0) {
    const errors = result.userErrors
      .map((e: { message: string }) => e.message)
      .join(", ");
    return Response.json({ success: false, error: errors }, { status: 400 });
  }

  const confirmationUrl = result?.confirmationUrl;
  const subscription = result?.appSubscription;

  if (!confirmationUrl || !subscription) {
    return Response.json(
      { success: false, error: "Kein Bestätigungs-Link erhalten. Bitte erneut versuchen." },
      { status: 500 },
    );
  }

  // PENDING-Eintrag in DB speichern
  await prisma.subscription.upsert({
    where: { shop },
    create: {
      shop,
      plan: "free",
      chargeId: subscription.id,
      status: "pending",
    },
    update: {
      chargeId: subscription.id,
      status: "pending",
    },
  });

  // Return confirmationUrl to the client for redirect via App Bridge
  // App Bridge's fetch interceptor sees the 401 + header and navigates
  // the top-level window cleanly, before React Router processes the response.
  // Fallback: also include confirmationUrl in a JSON body for client-side handling.
  return new Response(JSON.stringify({ success: true, confirmationUrl }), {
    status: 401,
    statusText: "Unauthorized",
    headers: {
      "X-Shopify-API-Request-Failure-Reauthorize-Url": confirmationUrl,
      "Content-Type": "application/json",
    },
  });
};
