import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import {
  getAppPurchaseStatus,
  markPurchaseCompleted,
  getPurchaseByAppId,
} from "../services/billing.server";
import prisma from "../db.server";

/**
 * Billing callback route – Shopify redirects here after the merchant
 * approves (or declines) a one-time charge.
 *
 * URL: /app/billing/complete?shop=<shop>&section=<sectionId>&charge_id=<gid>
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);

  const shop = session.shop;
  const sectionId = url.searchParams.get("section") || "";
  const chargeIdParam = url.searchParams.get("charge_id") || "";

  if (!sectionId) {
    // No section – just go back to explore
    return redirect("/app/explore");
  }

  // Try to find the purchase record for this shop + section
  const purchaseRecord = await prisma.sectionPurchase.findFirst({
    where: {
      shop,
      sectionHandle: {
        contains: sectionId,
      },
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!purchaseRecord) {
    console.warn(
      `No pending purchase found for shop=${shop} section=${sectionId}`,
    );
    return redirect(`/app/section?id=${sectionId}&purchase=not_found`);
  }

  // Verify the charge status via Shopify API
  const accessToken = session.accessToken || "";
  try {
    const purchaseStatus = await getAppPurchaseStatus(
      shop,
      accessToken,
      purchaseRecord.appPurchaseId,
    );

    const status = purchaseStatus?.status;
    console.log(
      `Purchase status for ${purchaseRecord.appPurchaseId}: ${status}`,
    );

    // Shopify returns ACTIVE for approved one-time charges
    if (
      status === "ACTIVE" ||
      status === "ACCEPTED" ||
      status === "PURCHASED"
    ) {
      await markPurchaseCompleted(purchaseRecord.appPurchaseId);
      return redirect(
        `/app/section?id=${sectionId}&purchased=true&install=true`,
      );
    }

    // Charge was declined or is still pending
    if (status === "DECLINED" || status === "EXPIRED") {
      // Clean up the pending record
      await prisma.sectionPurchase.update({
        where: { id: purchaseRecord.id },
        data: { status: "DECLINED" },
      });
      return redirect(`/app/section?id=${sectionId}&purchase=declined`);
    }

    // Still pending – shouldn't normally happen after redirect
    return redirect(`/app/section?id=${sectionId}&purchase=pending`);
  } catch (error) {
    console.error("Error verifying purchase:", error);
    return redirect(`/app/section?id=${sectionId}&purchase=error`);
  }
};
