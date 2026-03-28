import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getAppPurchaseStatus } from "../services/billing.server";
import prisma from "../db.server";

/**
 * Billing callback route – Shopify redirects here after the merchant
 * approves (or declines) a one-time charge.
 *
 * Shopify redirects the browser directly (outside the iframe), so
 * authenticate.admin() would fail. Instead we load the offline session
 * from the DB using the ?shop= param Shopify appends to the returnUrl.
 *
 * Single section: /app/billing/complete?shop=<shop>&section=<id>&charge_id=<n>
 * Bundle:         /app/billing/complete?shop=<shop>&bundle=<id1,id2,...>&charge_id=<n>
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  const shopParam = url.searchParams.get("shop") || "";
  const sectionId = url.searchParams.get("section") || "";
  const bundleParam = url.searchParams.get("bundle") || "";
  const chargeId = url.searchParams.get("charge_id") || "";

  const isBundle = !!bundleParam;
  const sectionIds = isBundle
    ? bundleParam.split(",").map((s: string) => s.trim()).filter(Boolean)
    : sectionId
      ? [sectionId]
      : [];

  if (!shopParam || sectionIds.length === 0) {
    return redirect("/auth/login");
  }

  // Load the offline session for this shop from our DB
  const session = await prisma.session.findFirst({
    where: { shop: shopParam, isOnline: false },
    orderBy: { expires: "desc" },
  });

  if (!session?.accessToken) {
    console.warn(`No offline session found for shop=${shopParam}`);
    return redirect("/auth/login");
  }

  const shop = session.shop;
  const accessToken = session.accessToken;

  // Find PENDING purchase records for these section handles
  const pendingRecords = await prisma.sectionPurchase.findMany({
    where: {
      shop,
      sectionHandle: { in: sectionIds },
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (pendingRecords.length === 0) {
    console.warn(`No pending purchases for shop=${shop} sections=${sectionIds.join(",")}`);
    if (isBundle) return redirect("/app/bundles?purchase=already_done");
    return redirect(`/app/section?id=${sectionId}&purchase=not_found`);
  }

  const appPurchaseId = pendingRecords[0].appPurchaseId;

  try {
    // Build the full GID — Shopify sends numeric charge_id, we may have stored the full GID
    const gid = appPurchaseId.startsWith("gid://")
      ? appPurchaseId
      : `gid://shopify/AppPurchaseOneTime/${chargeId || appPurchaseId}`;

    const purchaseStatus = await getAppPurchaseStatus(shop, accessToken, gid);
    const status = purchaseStatus?.status;
    console.log(`Purchase status for ${gid}: ${status}`);

    if (status === "ACTIVE" || status === "ACCEPTED" || status === "PURCHASED") {
      await prisma.sectionPurchase.updateMany({
        where: { appPurchaseId, status: "PENDING" },
        data: { status: "COMPLETED" },
      });
      console.log(`Marked ${pendingRecords.length} purchase(s) COMPLETED for ${appPurchaseId}`);

      // Redirect back into the Shopify Admin embedded app
      const shopHandle = shop.replace(".myshopify.com", "");
      const clientId = process.env.SHOPIFY_API_KEY || "";

      const finalUrl = isBundle
        ? `https://admin.shopify.com/store/${shopHandle}/apps/${clientId}/app/bundles?purchased=true`
        : `https://admin.shopify.com/store/${shopHandle}/apps/${clientId}/app/section?id=${sectionId}&purchased=true`;

      console.log(`Redirecting to: ${finalUrl}`);
      return redirect(finalUrl);
    }

    if (status === "DECLINED" || status === "EXPIRED") {
      await prisma.sectionPurchase.updateMany({
        where: { appPurchaseId, status: "PENDING" },
        data: { status: "DECLINED" },
      });
      if (isBundle) return redirect("/app/bundles?purchase=declined");
      return redirect(`/app/section?id=${sectionId}&purchase=declined`);
    }

    if (isBundle) return redirect("/app/bundles?purchase=pending");
    return redirect(`/app/section?id=${sectionId}&purchase=pending`);
  } catch (error) {
    console.error("Error verifying purchase:", error);
    if (isBundle) return redirect("/app/bundles?purchase=error");
    return redirect(`/app/section?id=${sectionId}&purchase=error`);
  }
};
