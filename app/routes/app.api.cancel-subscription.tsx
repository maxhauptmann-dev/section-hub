import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * API Route: Kündigt das Premium-Abo
 * POST /app/api/cancel-subscription
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const subscription = await prisma.subscription.findUnique({ where: { shop } });

  if (!subscription || subscription.status !== "active" || !subscription.chargeId) {
    return Response.json({ success: false, error: "No active subscription found." }, { status: 400 });
  }

  try {
    // Shopify AppSubscription canceln via GraphQL
    const response = await admin.graphql(
      `#graphql
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          id: subscription.chargeId,
        },
      },
    );

    const json = await response.json();

    const result = json.data?.appSubscriptionCancel;

    if (result?.userErrors?.length > 0) {
      const errors = result.userErrors.map((e: { message: string }) => e.message).join(", ");
      return Response.json({ success: false, error: errors }, { status: 400 });
    }

    // DB-Status auf cancelled setzen
    await prisma.subscription.update({
      where: { shop },
      data: {
        status: "cancelled",
        plan: "free",
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return Response.json(
      { success: false, error: "Error cancelling subscription. Please try again." },
      { status: 500 },
    );
  }
};
