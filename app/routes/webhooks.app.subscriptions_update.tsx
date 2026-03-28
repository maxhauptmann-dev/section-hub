import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { setPremiumMetafield } from "../lib/premium-metafield.server";
import { invalidatePremiumCache } from "../lib/is-premium.server";

/**
 * Webhook: APP_SUBSCRIPTIONS_UPDATE
 *
 * Fired by Shopify whenever a subscription status changes:
 * - Customer cancels via Shopify Admin
 * - Payment fails / subscription expires
 * - Subscription is activated after approval
 *
 * Payload includes: app_subscription.admin_graphql_api_id, status, etc.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (!shop || !payload) {
    return new Response();
  }

  const subscription = payload as {
    app_subscription?: {
      admin_graphql_api_id?: string;
      status?: string;
      name?: string;
    };
  };

  const appSub = subscription.app_subscription;
  if (!appSub) {
    console.log("No app_subscription in payload");
    return new Response();
  }

  const chargeId = appSub.admin_graphql_api_id;
  const status = appSub.status?.toUpperCase();

  console.log(`Subscription update: chargeId=${chargeId} status=${status} shop=${shop}`);

  // Invalidate premium cache immediately
  invalidatePremiumCache(shop);

  // Find the subscription in our DB
  const dbSubscription = await db.subscription.findUnique({ where: { shop } });

  if (!dbSubscription) {
    console.log(`No subscription record for ${shop}, ignoring`);
    return new Response();
  }

  // Get the offline session for metafield updates
  const session = await db.session.findFirst({
    where: { shop, isOnline: false },
    orderBy: { expires: "desc" },
  });

  if (status === "ACTIVE") {
    // Subscription activated (e.g. after approval or renewal)
    await db.subscription.update({
      where: { shop },
      data: {
        plan: "premium",
        status: "active",
        chargeId: chargeId || dbSubscription.chargeId,
      },
    });

    if (session?.accessToken) {
      try {
        await setPremiumMetafield(shop, session.accessToken, true);
      } catch (e) {
        console.error(`Failed to set premium metafield for ${shop}:`, e);
      }
    }

    console.log(`✅ Subscription activated for ${shop}`);
  } else if (
    status === "CANCELLED" ||
    status === "DECLINED" ||
    status === "EXPIRED" ||
    status === "FROZEN"
  ) {
    // Subscription ended — revoke premium
    await db.subscription.update({
      where: { shop },
      data: {
        plan: "free",
        status: "cancelled",
        cancelledAt: new Date(),
      },
    });

    if (session?.accessToken) {
      try {
        await setPremiumMetafield(shop, session.accessToken, false);
      } catch (e) {
        console.error(`Failed to remove premium metafield for ${shop}:`, e);
      }
    }

    console.log(`❌ Subscription ${status} for ${shop} — premium revoked`);
  } else if (status === "PENDING") {
    // Payment pending — don't change anything yet
    console.log(`⏳ Subscription pending for ${shop}`);
  }

  return new Response();
};
