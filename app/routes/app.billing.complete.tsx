import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { getAppPurchaseStatus, markPurchaseCompleted } from "../services/billing.server";
import prisma from "../db.server";

/**
 * Billing completion callback
 * GET /app/billing/complete?shop=...&section=...
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const sectionId = url.searchParams.get("section");

  if (!shop || !sectionId) {
    return redirect("/app/sections?error=missing_params");
  }

  try {
    const { session } = await authenticate.admin(request);

    // Find the most recent pending purchase for this shop and section
    const pending = await prisma.sectionPurchase.findFirst({
      where: {
        shop,
        sectionHandle: sectionId,
        status: {
          in: ["PENDING", "PENDING_APPROVAL"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!pending) {
      return redirect(`/app/sections?error=purchase_not_found`);
    }

    const accessToken = session.accessToken || "";

    // Check the purchase status with Shopify
    const purchaseNode = await getAppPurchaseStatus(shop, accessToken, pending.appPurchaseId);

    if (!purchaseNode) {
      return redirect(`/app/sections?error=purchase_status_unknown`);
    }

    const status = purchaseNode.status;

    // Purchase was completed successfully
    if (status === "PURCHASED" || status === "ACTIVE" || status === "ACCEPTED") {
      // Mark as completed in database
      await markPurchaseCompleted(pending.appPurchaseId);

      return redirect(
        `/app/sections?purchased=${encodeURIComponent(sectionId)}&install=true`
      );
    }

    // Purchase was declined or is still pending
    if (status === "DECLINED" || status === "EXPIRED") {
      return redirect(`/app/sections?error=purchase_declined`);
    }

    // Still pending user confirmation
    return redirect(`/app/sections?error=purchase_pending`);
  } catch (error) {
    console.error("Billing completion error:", error);
    return redirect(`/app/sections?error=billing_error`);
  }
};
