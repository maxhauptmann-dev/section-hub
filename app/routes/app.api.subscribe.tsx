import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * API Route: Erstellt ein monatliches Abo (Recurring Charge)
 * POST /app/api/subscribe
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

  try {
    const appUrl =
      process.env.SHOPIFY_APP_URL || "https://section-hub-app.fly.dev";
    const returnUrl = `${appUrl}/app/billing/subscription-complete?shop=${encodeURIComponent(shop)}`;

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
          test: true,
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
    console.log("Subscription create response:", JSON.stringify(json, null, 2));

    const result = json.data?.appSubscriptionCreate;

    if (result?.userErrors?.length > 0) {
      const errors = result.userErrors
        .map((e: { message: string }) => e.message)
        .join(", ");
      return Response.json({ success: false, error: errors }, { status: 400 });
    }

    const confirmationUrl = result?.confirmationUrl;
    const subscription = result?.appSubscription;

    if (confirmationUrl && subscription) {
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

      return Response.json({ success: true, confirmationUrl });
    }

    return Response.json(
      { success: false, error: "Kein Bestätigungs-Link erhalten. Bitte erneut versuchen." },
      { status: 500 },
    );
  } catch (error) {
    console.error("Subscription error:", error);
    return Response.json(
      { success: false, error: "Fehler beim Erstellen des Abos. Bitte erneut versuchen." },
      { status: 500 },
    );
  }
};
